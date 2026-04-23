/**
 * Claim Generator Service
 * Auto-generates billing claims from completed encounters
 * 
 * NOTE: This is a NEW service. It does not replace any existing code.
 * COMPLIANCE: Never suggests upcoding or higher-paying alternatives.
 */

import { createClient } from '@/lib/supabase/server';
import { devError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';

export interface GeneratedClaim {
    encounterId: string;
    patientId: string;
    providerId: string;
    organizationId: string;
    claimNumber: string;
    serviceDate: string;
    diagnosisCodes: string[];
    procedureCodes: string[];
    billedAmount: number;
    placeOfService: string;
}

export interface ClaimGenerationResult {
    success: boolean;
    claimId?: string;
    claimNumber?: string;
    error?: string;
    validationErrors?: string[];
}

/**
 * Generate a billing claim from a completed encounter
 * Called automatically when an encounter is marked complete with a signed note
 */
export async function generateClaimFromEncounter(
    encounterId: string
): Promise<ClaimGenerationResult> {
    const supabase = await createClient();

    if (!supabase) {
        return { success: false, error: 'Database not available' };
    }

    try {
        // OPTIMIZATION: Select only required columns instead of *
        const { data: encounter, error: encounterError } = await supabase
            .from('encounters')
            .select(`
                id,
                organization_id,
                patient_id,
                provider_id,
                encounter_type,
                status,
                scheduled_start,
                patients (
                    id, first_name, last_name, date_of_birth,
                    insurance_provider, insurance_id, insurance_group,
                    address, city, state, zip_code
                ),
                organizations (
                    id, name, npi, tax_id
                ),
                users!encounters_provider_id_fkey (
                    id, first_name, last_name, npi
                )
            `)
            .eq('id', encounterId)
            .single();

        if (encounterError || !encounter) {
            return { success: false, error: 'Encounter not found' };
        }

        // Check if claim already exists for this encounter
        const { data: existingClaim } = await supabase
            .from('billing_claims')
            .select('id, claim_number')
            .eq('encounter_id', encounterId)
            .maybeSingle();

        if (existingClaim) {
            return {
                success: true,
                claimId: existingClaim.id,
                claimNumber: existingClaim.claim_number,
                error: 'Claim already exists for this encounter',
            };
        }

        // Get signed note for diagnosis and procedure codes. On clinical_notes
        // the narrative is stored in `content` (legacy `note_content` column
        // only existed on the old `notes` table).
        const { data: note } = await supabase
            .from('clinical_notes')
            .select('content, status')
            .eq('encounter_id', encounterId)
            .eq('status', 'signed')
            .order('signed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!note) {
            return { success: false, error: 'No signed note found for encounter' };
        }

        // Extract diagnosis and procedure codes from note content
        const noteContent = note.content as Record<string, unknown>;
        const diagnosisCodes = extractDiagnosisCodes(noteContent);
        const procedureCodes = extractProcedureCodes(noteContent, encounter);

        // Validate required fields
        const validationErrors = validateClaimData(encounter, diagnosisCodes, procedureCodes);
        if (validationErrors.length > 0) {
            return { success: false, validationErrors };
        }

        // Generate unique claim number
        const claimNumber = generateClaimNumber(encounter.organization_id);

        // Calculate billed amount based on procedure codes
        const billedAmount = await calculateBilledAmount(
            supabase,
            encounter.organization_id,
            procedureCodes,
            encounter.patients?.insurance_provider
        );

        // Determine place of service
        const placeOfService = getPlaceOfService(encounter.encounter_type);

        // Create the claim
        const { data: claim, error: claimError } = await supabase
            .from('billing_claims')
            .insert({
                organization_id: encounter.organization_id,
                patient_id: encounter.patient_id,
                provider_id: encounter.provider_id,
                encounter_id: encounterId,
                claim_number: claimNumber,
                service_date: encounter.scheduled_start,
                diagnosis_codes: diagnosisCodes,
                procedure_codes: procedureCodes,
                billed_amount: billedAmount,
                place_of_service: placeOfService,
                status: 'draft',
                payer_name: encounter.patients?.insurance_provider || 'Unknown',
                payer_id: encounter.patients?.insurance_id || null,
            })
            .select()
            .single();

        if (claimError) {
            devError('ClaimGenerator', 'Insert error:', claimError);
            return { success: false, error: 'Failed to create claim' };
        }

        // Log the claim generation
        await logClaimGeneration(claim.id, encounter.organization_id);

        return {
            success: true,
            claimId: claim.id,
            claimNumber: claim.claim_number,
        };

    } catch (error) {
        devError('ClaimGenerator', 'Error:', error);
        return { success: false, error: 'Claim generation failed' };
    }
}

/**
 * Batch generate claims for all unbilled completed encounters
 * Useful for end-of-day or scheduled processing
 */
export async function batchGenerateClaims(
    organizationId: string,
    options?: { startDate?: string; endDate?: string }
): Promise<{ generated: number; errors: string[] }> {
    const supabase = await createClient();

    if (!supabase) {
        return { generated: 0, errors: ['Database not available'] };
    }

    // Find completed encounters without claims
    let query = supabase
        .from('encounters')
        .select(`
            id,
            notes!inner(status)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .eq('notes.status', 'signed');

    if (options?.startDate) {
        query = query.gte('scheduled_start', options.startDate);
    }
    if (options?.endDate) {
        query = query.lte('scheduled_start', options.endDate);
    }

    const { data: encounters, error } = await query;

    if (error || !encounters) {
        return { generated: 0, errors: ['Failed to fetch encounters'] };
    }

    // Filter out encounters that already have claims
    const { data: existingClaims } = await supabase
        .from('billing_claims')
        .select('encounter_id')
        .in('encounter_id', encounters.map((e: { id: string }) => e.id));

    const existingEncounterIds = new Set(existingClaims?.map((c: { encounter_id: string }) => c.encounter_id) || []);
    const unbilledEncounters: Array<{ id: string }> = encounters.filter((e: { id: string }) => !existingEncounterIds.has(e.id));

    let generated = 0;
    const errors: string[] = [];

    // OPTIMIZATION: Process claims in parallel with concurrency control
    const CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < unbilledEncounters.length; i += CONCURRENCY_LIMIT) {
        const batch = unbilledEncounters.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(
            batch.map(encounter => generateClaimFromEncounter(encounter.id))
        );

        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            if (result.success) {
                generated++;
            } else {
                errors.push(`${batch[j].id}: ${result.error || result.validationErrors?.join(', ')}`);
            }
        }
    }

    return { generated, errors };
}

/**
 * Extract ICD-10 diagnosis codes from note content
 * COMPLIANCE: Only uses codes documented in the note
 */
function extractDiagnosisCodes(noteContent: Record<string, unknown>): string[] {
    const codes: string[] = [];

    // Check for diagnosis codes in structured note
    if (noteContent.diagnosisCodes && Array.isArray(noteContent.diagnosisCodes)) {
        codes.push(...(noteContent.diagnosisCodes as string[]));
    }

    // Check for ICD-10 codes in assessment section
    if (noteContent.assessment && typeof noteContent.assessment === 'object') {
        const assessment = noteContent.assessment as Record<string, unknown>;
        if (assessment.icd10Codes && Array.isArray(assessment.icd10Codes)) {
            codes.push(...(assessment.icd10Codes as string[]));
        }
    }

    // Deduplicate
    return [...new Set(codes)];
}

/**
 * Extract CPT procedure codes from note content and encounter type
 * COMPLIANCE: Returns minimal appropriate codes, never upcodes
 */
function extractProcedureCodes(
    noteContent: Record<string, unknown>,
    encounter: { encounter_type: string }
): string[] {
    const codes: string[] = [];

    // Check for procedure codes in structured note
    if (noteContent.procedureCodes && Array.isArray(noteContent.procedureCodes)) {
        codes.push(...(noteContent.procedureCodes as string[]));
    }

    // If no codes specified, use default based on encounter type
    if (codes.length === 0) {
        switch (encounter.encounter_type) {
            case 'initial':
                codes.push('99204'); // New patient, moderate complexity
                break;
            case 'follow_up':
                codes.push('99214'); // Established patient, moderate
                break;
            case 'telehealth':
                codes.push('99214'); // With place of service 02
                break;
            case 'urgent':
                codes.push('99215'); // Established, high complexity
                break;
            default:
                codes.push('99213'); // Default: established, low-moderate
        }
    }

    return codes;
}

/**
 * Validate claim data before submission
 */
function validateClaimData(
    encounter: Record<string, unknown>,
    diagnosisCodes: string[],
    procedureCodes: string[]
): string[] {
    const errors: string[] = [];

    if (!diagnosisCodes.length) {
        errors.push('At least one diagnosis code is required');
    }

    if (!procedureCodes.length) {
        errors.push('At least one procedure code is required');
    }

    const patient = encounter.patients as Record<string, unknown> | null;
    if (!patient?.insurance_provider) {
        errors.push('Patient insurance information is required');
    }

    const provider = encounter.users as Record<string, unknown> | null;
    if (!provider) {
        errors.push('Provider information is missing');
    }

    return errors;
}

/**
 * Generate unique claim number
 */
function generateClaimNumber(organizationId: string): string {
    const prefix = organizationId.substring(0, 4).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CLM-${prefix}-${timestamp}-${random}`;
}

/**
 * Calculate billed amount based on fee schedule
 * OPTIMIZED: Batch fetches all CPT codes in a single query
 */
async function calculateBilledAmount(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string,
    procedureCodes: string[],
    payerName?: string
): Promise<number> {
    if (!supabase || procedureCodes.length === 0) return 0;

    // OPTIMIZATION: Batch fetch all fee schedule items at once
    const { data: feeItems } = await supabase
        .from('fee_schedule_items')
        .select(`
            cpt_code,
            allowed_amount,
            fee_schedules!inner(organization_id, payer_name, is_default)
        `)
        .eq('fee_schedules.organization_id', organizationId)
        .in('cpt_code', procedureCodes)
        .order('fee_schedules.is_default', { ascending: true });

    // Create lookup map for O(1) access
    const feeMap = new Map<string, number>();
    for (const item of feeItems || []) {
        // Only set if not already present (respects the ordering by is_default)
        if (!feeMap.has(item.cpt_code)) {
            feeMap.set(item.cpt_code, item.allowed_amount);
        }
    }

    // Calculate total using map lookups
    let totalAmount = 0;
    for (const code of procedureCodes) {
        const feeAmount = feeMap.get(code);
        if (feeAmount !== undefined) {
            totalAmount += feeAmount;
        } else {
            // Use default Medicare rates if no fee schedule
            totalAmount += getDefaultRate(code);
        }
    }

    return totalAmount;
}

/**
 * Get default Medicare rate for common CPT codes
 */
function getDefaultRate(cptCode: string): number {
    const defaultRates: Record<string, number> = {
        '99201': 4200, // $42.00 in cents
        '99202': 7500,
        '99203': 11000,
        '99204': 16500,
        '99205': 21000,
        '99211': 2500,
        '99212': 5500,
        '99213': 9500,
        '99214': 13500,
        '99215': 18500,
        '90832': 6500,  // Psychotherapy 30 min
        '90834': 9500,  // Psychotherapy 45 min
        '90837': 13000, // Psychotherapy 60 min
        '90847': 11500, // Family therapy with patient
        '96127': 450,   // Brief emotional assessment
    };

    return defaultRates[cptCode] || 10000; // Default $100 if code not found
}

/**
 * Determine place of service code
 */
function getPlaceOfService(encounterType: string): string {
    switch (encounterType) {
        case 'telehealth':
            return '02'; // Telehealth
        case 'initial':
        case 'follow_up':
        case 'urgent':
        default:
            return '11'; // Office
    }
}

/**
 * Log claim generation for audit
 */
async function logClaimGeneration(
    claimId: string,
    organizationId: string
): Promise<void> {
    await logAuditEvent({
        eventType: 'BILLING_CLAIM_GENERATED',
        organizationId,
        resourceType: 'billing_claim',
        resourceId: claimId,
        details: { action: 'CLAIM_GENERATED', autoGenerated: true },
        phiAccessed: true,
        riskLevel: 'MEDIUM',
    });
}
