/**
 * ERA (Electronic Remittance Advice) Service
 * Processes 835 files to automatically post payments
 *
 * NOTE: This is INFRASTRUCTURE - inactive until clearinghouse is configured.
 */

import { createClient } from "@/lib/supabase/server";
import { devLog, devError, devWarn, logError, sanitizeError } from "@/lib/logging/safe-logger";

export interface ERAPayment {
  patientControlNumber: string;
  payerClaimNumber: string;
  serviceDate: string;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  adjustments: Array<{
    reasonCode: string;
    amount: number;
    description: string;
  }>;
}

export interface ERAProcessResult {
  success: boolean;
  matched: number;
  unmatched: number;
  error?: string;
}

/**
 * Process an ERA/835 file
 */
export async function processERAFile(
  organizationId: string,
  fileName: string,
  fileContent: string,
): Promise<ERAProcessResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { success: false, matched: 0, unmatched: 0, error: "Database not available" };
  }

  try {
    // Parse the 835 file
    const payments = parseERA835(fileContent);

    // Create ERA file record
    const { data: eraFile, error: eraError } = await supabase
      .from("era_files")
      .insert({
        organization_id: organizationId,
        file_name: fileName,
        file_content: fileContent,
        status: "processing",
        total_claims: payments.length,
        total_paid: payments.reduce((sum, p) => sum + p.paidAmount, 0),
      })
      .select()
      .single();

    if (eraError) {
      // Log the underlying Supabase error for operators, but surface
      // only a static message to callers — the raw DB error can leak
      // table/column names and library internals.
      logError({
        action: "ERA_FILE_INSERT_ERROR",
        error: sanitizeError(eraError),
        organizationId,
      });
      return { success: false, matched: 0, unmatched: 0, error: "Failed to record ERA file" };
    }

    let matched = 0;
    let unmatched = 0;

    // OPTIMIZATION: Batch fetch all claims at once instead of N+1 queries
    const claimNumbers = payments.map((p) => p.patientControlNumber);
    const { data: claims } = await supabase
      .from("billing_claims")
      .select("id, status, claim_number")
      .eq("organization_id", organizationId)
      .in("claim_number", claimNumbers);

    // Create lookup map for O(1) access
    type ClaimRecord = { id: string; status: string; claim_number: string };
    const claimMap = new Map<string, ClaimRecord>(
      (claims || []).map((c: ClaimRecord) => [c.claim_number, c]),
    );

    // Prepare batch inserts for ERA payments
    const eraPaymentsToInsert = payments.map((payment) => {
      const claim = claimMap.get(payment.patientControlNumber);
      return {
        era_file_id: eraFile.id,
        claim_id: claim?.id || null,
        payer_claim_number: payment.payerClaimNumber,
        patient_control_number: payment.patientControlNumber,
        service_date: payment.serviceDate,
        billed_amount: payment.billedAmount,
        allowed_amount: payment.allowedAmount,
        paid_amount: payment.paidAmount,
        patient_responsibility: payment.patientResponsibility,
        adjustment_reason_codes: payment.adjustments,
        matched_at: claim ? new Date().toISOString() : null,
      };
    });

    // Batch insert all ERA payments
    await supabase.from("era_payments").insert(eraPaymentsToInsert);

    // Prepare batch updates for matched claims
    const claimUpdates: Array<{ id: string; payment: ERAPayment }> = [];
    for (const payment of payments) {
      const claim = claimMap.get(payment.patientControlNumber);
      if (claim) {
        matched++;
        claimUpdates.push({ id: claim.id, payment });
      } else {
        unmatched++;
      }
    }

    // SEC-PT5-F9: ERA amount bounds check — reject unreasonable amounts
    const MAX_ERA_PAYMENT_CENTS = parseInt(process.env.MAX_ERA_PAYMENT_AMOUNT || "10000000", 10); // Default $100k in cents

    // Update matched claims in parallel (with concurrency limit)
    const BATCH_SIZE = 10;
    for (let i = 0; i < claimUpdates.length; i += BATCH_SIZE) {
      const batch = claimUpdates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(({ id, payment }) => {
          // Reject negative amounts and amounts exceeding the absolute cap
          if (payment.paidAmount < 0 || payment.paidAmount > MAX_ERA_PAYMENT_CENTS) {
            devError(
              "ERA",
              `Suspicious amount skipped: paid=${payment.paidAmount} for claim ${id}`,
            );
            unmatched++;
            matched--;
            return Promise.resolve();
          }

          return supabase
            .from("billing_claims")
            .update({
              status: "paid",
              paid_amount: payment.paidAmount,
              allowed_amount: payment.allowedAmount,
              patient_responsibility: payment.patientResponsibility,
              adjustment_amount: payment.adjustments.reduce((sum, a) => sum + a.amount, 0),
              payer_claim_number: payment.payerClaimNumber,
              paid_at: new Date().toISOString(),
              era_received: true,
              era_received_at: new Date().toISOString(),
              era_file_id: eraFile.id,
              payment_verified: true,
            })
            .eq("id", id);
        }),
      );
    }

    // Update ERA file status
    await supabase
      .from("era_files")
      .update({
        status: "processed",
        claims_matched: matched,
        claims_unmatched: unmatched,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eraFile.id);

    return { success: true, matched, unmatched };
  } catch (error) {
    devError("ERA", "Processing error:", error);
    return { success: false, matched: 0, unmatched: 0, error: "Processing failed" };
  }
}

/**
 * Parse ERA 835 file content
 * This is a simplified parser - real 835 files are complex
 */
function parseERA835(content: string): ERAPayment[] {
  const payments: ERAPayment[] = [];

  // Split into segments
  const segments = content
    .split("~")
    .map((s) => s.trim())
    .filter((s) => s);

  let currentPayment: Partial<ERAPayment> | null = null;

  for (const segment of segments) {
    const elements = segment.split("*");
    const segmentId = elements[0];

    switch (segmentId) {
      case "CLP": // Claim Payment Information
        // Save previous payment
        if (currentPayment && currentPayment.patientControlNumber) {
          payments.push(currentPayment as ERAPayment);
        }

        // Start new payment
        currentPayment = {
          patientControlNumber: elements[1] || "",
          paidAmount: Math.round(parseFloat(elements[4] || "0") * 100),
          billedAmount: Math.round(parseFloat(elements[3] || "0") * 100),
          payerClaimNumber: elements[7] || "",
          adjustments: [],
          allowedAmount: 0,
          patientResponsibility: 0,
          serviceDate: "",
        };
        break;

      case "CAS": // Claim Adjustment
        if (currentPayment) {
          const adjustmentCode = elements[1];
          const reasonCode = elements[2];
          const amount = Math.round(parseFloat(elements[3] || "0") * 100);

          currentPayment.adjustments = currentPayment.adjustments || [];
          currentPayment.adjustments.push({
            reasonCode: `${adjustmentCode}-${reasonCode}`,
            amount,
            description: getAdjustmentDescription(adjustmentCode, reasonCode),
          });

          // Track patient responsibility
          if (adjustmentCode === "PR") {
            currentPayment.patientResponsibility =
              (currentPayment.patientResponsibility || 0) + amount;
          }
        }
        break;

      case "DTM": // Date/Time Reference
        if (currentPayment && elements[1] === "472") {
          currentPayment.serviceDate = formatDate(elements[2]);
        }
        break;

      case "AMT": // Amount
        if (currentPayment && elements[1] === "B6") {
          currentPayment.allowedAmount = Math.round(parseFloat(elements[2] || "0") * 100);
        }
        break;
    }
  }

  // Don't forget last payment
  if (currentPayment && currentPayment.patientControlNumber) {
    payments.push(currentPayment as ERAPayment);
  }

  return payments;
}

function formatDate(dateStr: string): string {
  if (dateStr && dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr || "";
}

function getAdjustmentDescription(groupCode: string, reasonCode: string): string {
  const descriptions: Record<string, string> = {
    CO: "Contractual Obligation",
    PR: "Patient Responsibility",
    OA: "Other Adjustment",
    PI: "Payer Initiated",
  };

  const reasons: Record<string, string> = {
    "1": "Deductible",
    "2": "Coinsurance",
    "3": "Copayment",
    "45": "Exceeds fee schedule",
    "96": "Non-covered charge",
    "97": "Payment adjusted - late filing",
  };

  return `${descriptions[groupCode] || groupCode}: ${reasons[reasonCode] || reasonCode}`;
}

/**
 * Get ERA files for organization
 */
export async function getERAFiles(organizationId: string) {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("era_files")
    .select("*")
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false });

  return data || [];
}

/**
 * Get unmatched ERA payments
 */
export async function getUnmatchedERAPayments(organizationId: string) {
  const supabase = await createClient();

  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("era_payments")
    .select(
      `
      *,
      era_files!inner (organization_id)
    `,
    )
    .eq("era_files.organization_id", organizationId)
    .is("claim_id", null)
    .order("created_at", { ascending: false });

  return data || [];
}

/**
 * Manually match ERA payment to claim
 */
export async function matchERAPaymentToClaim(
  eraPaymentId: string,
  claimId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  if (!supabase) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get ERA payment
    const { data: payment } = await supabase
      .from("era_payments")
      .select("*")
      .eq("id", eraPaymentId)
      .single();

    if (!payment) {
      return { success: false, error: "ERA payment not found" };
    }

    // Update ERA payment
    await supabase
      .from("era_payments")
      .update({
        claim_id: claimId,
        matched_at: new Date().toISOString(),
      })
      .eq("id", eraPaymentId);

    // Update claim
    await supabase
      .from("billing_claims")
      .update({
        status: "paid",
        paid_amount: payment.paid_amount,
        allowed_amount: payment.allowed_amount,
        patient_responsibility: payment.patient_responsibility,
        payer_claim_number: payment.payer_claim_number,
        paid_at: new Date().toISOString(),
        era_received: true,
        era_received_at: new Date().toISOString(),
        payment_verified: true,
      })
      .eq("id", claimId);

    return { success: true };
  } catch (error) {
    devError("ERA", "Match error:", error);
    return { success: false, error: "Failed to match payment" };
  }
}

/**
 * Poll for ERA files from clearinghouse (scheduled job)
 */
export async function pollForERAFiles(): Promise<void> {
  const supabase = await createClient();

  if (!supabase) {
    devWarn("ERA", "No database - skipping poll");
    return;
  }

  const { data: configs } = await supabase
    .from("global_clearinghouse_config")
    .select("*")
    .eq("is_active", true)
    .eq("supports_era", true);

  for (const config of configs || []) {
    try {
      // Would connect to SFTP and download ERA files
      devLog("ERA", `Would poll from ${config.clearinghouse}`);
    } catch (error) {
      devError("ERA", `Poll error for ${config.clearinghouse}:`, error);
    }
  }
}
