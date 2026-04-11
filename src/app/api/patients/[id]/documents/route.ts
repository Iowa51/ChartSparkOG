// src/app/api/patients/[id]/documents/route.ts
// Patient document upload & listing API
// HIPAA-compliant with audit logging, file validation, and Supabase Storage

import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent, logPHIAccess } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { validateFileUpload, generateSecureFilePath } from "@/lib/security/file-security";
import { validateRequest, PatientDocumentUploadSchema, UUIDSchema } from "@/lib/validation/schemas";

// Allowed MIME types specifically for patient documents (tighter than general)
const PATIENT_DOC_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const PATIENT_DOC_MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/patients/[id]/documents
 * List all documents for a patient
 */
async function handleGet(context: AuthContext) {
  try {
    const patientIdValidation = UUIDSchema.safeParse(context.params?.id);
    if (!patientIdValidation.success) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }
    const patientId = patientIdValidation.data;

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Fetch documents (RLS enforces org scope)
    const { data: documents, error } = await supabase
      .from("patient_documents")
      .select(
        "id, patient_id, document_type, file_name, file_size, mime_type, label, created_at, uploaded_by",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      logError({ action: "LIST_PATIENT_DOCUMENTS_ERROR", error: sanitizeError(error) });
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    logError({ action: "LIST_PATIENT_DOCUMENTS_EXCEPTION", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

/**
 * POST /api/patients/[id]/documents
 * Upload a document for a patient (multipart form data)
 */
async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const patientIdValidation = UUIDSchema.safeParse(context.params?.id);
    if (!patientIdValidation.success) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }
    const patientId = patientIdValidation.data;

    // Parse multipart form data
    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("document_type") as string;
    const label = formData.get("label") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate document_type with Zod
    const metaValidation = validateRequest(PatientDocumentUploadSchema, {
      document_type: documentType,
      label: label || "",
    });
    if (!metaValidation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: metaValidation.errors },
        { status: 400 },
      );
    }

    // Validate file (type, size, filename)
    if (file.size > PATIENT_DOC_MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB" }, { status: 400 });
    }

    if (!PATIENT_DOC_ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: JPEG, PNG, WebP, PDF" },
        { status: 400 },
      );
    }

    const fileValidation = validateFileUpload(file);
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error || "Invalid file" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Verify the patient belongs to the user's org
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, organization_id")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (patient.organization_id !== context.user.organizationId) {
      await logAuditEvent({
        eventType: "UNAUTHORIZED_ACCESS",
        userId: context.user.id,
        userEmail: context.user.email,
        organizationId: context.user.organizationId ?? undefined,
        ipAddress,
        userAgent,
        resourceType: "patient_document",
        resourceId: patientId,
        details: { reason: "Cross-org document upload attempt" },
        phiAccessed: false,
        riskLevel: "CRITICAL",
      });
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // SEC-PT6-F1: File path prefixed with org ID for storage RLS org isolation
    const filePath = generateSecureFilePath(
      context.user.id,
      file.name,
      `${context.user.organizationId}/patients/${patientId}`,
    );

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logError({ action: "DOCUMENT_UPLOAD_STORAGE_ERROR", error: sanitizeError(uploadError) });
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Create database record
    const { data: document, error: insertError } = await supabase
      .from("patient_documents")
      .insert({
        patient_id: patientId,
        organization_id: context.user.organizationId,
        uploaded_by: context.user.id,
        document_type: metaValidation.data.document_type,
        file_name: fileValidation.sanitizedName || file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        label: metaValidation.data.label || null,
      })
      .select("id, patient_id, document_type, file_name, file_size, mime_type, label, created_at")
      .single();

    if (insertError) {
      logError({ action: "DOCUMENT_INSERT_ERROR", error: sanitizeError(insertError) });
      // Try to clean up the uploaded file
      await supabase.storage.from("patient-documents").remove([filePath]);
      return NextResponse.json({ error: "Failed to save document record" }, { status: 500 });
    }

    // HIPAA audit log
    await logPHIAccess(
      context.user.id,
      context.user.email,
      context.user.role,
      context.user.organizationId || "",
      "PATIENT",
      patientId,
      "CREATE",
      ipAddress,
      userAgent,
    );

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    logError({ action: "DOCUMENT_UPLOAD_EXCEPTION", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const POST = withAuth(handlePost, { requireOrganization: true, requireMFA: true });
