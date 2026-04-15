/**
 * Claim Validator Service
 * Pre-submission validation for billing claims
 * 
 * NOTE: This is a NEW service. It does not replace any existing code.
 * COMPLIANCE: Focuses on error prevention, never suggests upcoding.
 */

import { createClient } from '@/lib/supabase/server';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    score: number; // 0-100 confidence score
}

export interface ValidationError {
    code: string;
    field: string;
    message: string;
    severity: 'critical' | 'error';
}

export interface ValidationWarning {
    code: string;
    field: string;
    message: string;
    suggestion?: string;
}

/**
 * Validate a claim before submission
 */
export async function validateClaimForSubmission(
    claimId: string,
    organizationId?: string
): Promise<ValidationResult> {
    const supabase = await createClient();

    if (!supabase) {
        return {
            isValid: false,
            errors: [{ code: 'SYS001', field: 'system', message: 'Database not available', severity: 'critical' }],
            warnings: [],
            score: 0,
        };
    }

    // SEC-PT2-F7: Get claim with org filter as defense-in-depth (RLS also enforces)
    let query = supabase
        .from('billing_claims')
        .select(`
            *,
            patients (
                id, first_name, last_name, date_of_birth, gender,
                insurance_provider, insurance_id, insurance_group,
                address, city, state, zip_code
            ),
            organizations (
                id, name, npi, tax_id, address, city, state, zip_code
            ),
            users!billing_claims_provider_id_fkey (
                id, first_name, last_name, npi
            ),
            encounters (
                id, encounter_type, scheduled_start, status,
                notes (id, status, signed_at)
            )
        `)
        .eq('id', claimId);

    if (organizationId) {
        query = query.eq('organization_id', organizationId);
    }

    const { data: claim, error } = await query.single();

    if (error || !claim) {
        return {
            isValid: false,
            errors: [{ code: 'CLM001', field: 'claim', message: 'Claim not found', severity: 'critical' }],
            warnings: [],
            score: 0,
        };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // ===== CRITICAL VALIDATIONS =====

    // Diagnosis codes
    if (!claim.diagnosis_codes || claim.diagnosis_codes.length === 0) {
        errors.push({
            code: 'DX001',
            field: 'diagnosis_codes',
            message: 'At least one diagnosis code is required',
            severity: 'critical',
        });
    } else {
        // Validate each diagnosis code format
        for (const code of claim.diagnosis_codes) {
            if (!isValidICD10(code)) {
                errors.push({
                    code: 'DX002',
                    field: 'diagnosis_codes',
                    message: `Invalid ICD-10 code format: ${code}`,
                    severity: 'error',
                });
            }
        }
    }

    // Procedure codes
    if (!claim.procedure_codes || claim.procedure_codes.length === 0) {
        errors.push({
            code: 'CPT001',
            field: 'procedure_codes',
            message: 'At least one procedure code is required',
            severity: 'critical',
        });
    } else {
        for (const code of claim.procedure_codes) {
            if (!isValidCPT(code)) {
                errors.push({
                    code: 'CPT002',
                    field: 'procedure_codes',
                    message: `Invalid CPT code format: ${code}`,
                    severity: 'error',
                });
            }
        }
    }

    // Patient information
    const patient = claim.patients as Record<string, unknown> | null;
    if (!patient) {
        errors.push({
            code: 'PAT001',
            field: 'patient',
            message: 'Patient information is missing',
            severity: 'critical',
        });
    } else {
        if (!patient.first_name || !patient.last_name) {
            errors.push({
                code: 'PAT002',
                field: 'patient.name',
                message: 'Patient name is required',
                severity: 'critical',
            });
        }
        if (!patient.date_of_birth) {
            errors.push({
                code: 'PAT003',
                field: 'patient.date_of_birth',
                message: 'Patient date of birth is required',
                severity: 'critical',
            });
        }
        if (!patient.insurance_id) {
            errors.push({
                code: 'INS001',
                field: 'patient.insurance_id',
                message: 'Patient insurance ID is required',
                severity: 'critical',
            });
        }
        if (!patient.insurance_provider) {
            errors.push({
                code: 'INS002',
                field: 'patient.insurance_provider',
                message: 'Insurance provider/payer is required',
                severity: 'critical',
            });
        }
    }

    // Provider information
    const provider = claim.users as Record<string, unknown> | null;
    if (!provider) {
        errors.push({
            code: 'PRV001',
            field: 'provider',
            message: 'Provider information is missing',
            severity: 'critical',
        });
    } else {
        if (!provider.npi) {
            errors.push({
                code: 'PRV002',
                field: 'provider.npi',
                message: 'Provider NPI is required',
                severity: 'critical',
            });
        }
    }

    // Organization/Billing provider
    const org = claim.organizations as Record<string, unknown> | null;
    if (!org) {
        errors.push({
            code: 'ORG001',
            field: 'organization',
            message: 'Billing organization is missing',
            severity: 'critical',
        });
    } else {
        if (!org.npi) {
            errors.push({
                code: 'ORG002',
                field: 'organization.npi',
                message: 'Organization NPI is required',
                severity: 'critical',
            });
        }
        if (!org.tax_id) {
            errors.push({
                code: 'ORG003',
                field: 'organization.tax_id',
                message: 'Organization Tax ID is required',
                severity: 'critical',
            });
        }
    }

    // Service date
    if (!claim.service_date) {
        errors.push({
            code: 'SVC001',
            field: 'service_date',
            message: 'Service date is required',
            severity: 'critical',
        });
    } else {
        const serviceDate = new Date(claim.service_date);
        const today = new Date();
        const daysSinceService = Math.floor(
            (today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (serviceDate > today) {
            errors.push({
                code: 'SVC002',
                field: 'service_date',
                message: 'Service date cannot be in the future',
                severity: 'error',
            });
        }
        if (daysSinceService > 365) {
            warnings.push({
                code: 'SVC003',
                field: 'service_date',
                message: 'Service date is over 1 year ago - timely filing may be at risk',
                suggestion: 'Verify payer timely filing deadlines',
            });
        }
    }

    // ===== WARNINGS =====

    // Check for signed note
    const encounter = claim.encounters as Record<string, unknown> | null;
    if (encounter) {
        const notes = encounter.notes as Array<Record<string, unknown>> | null;
        const signedNote = notes?.find(n => n.status === 'signed');
        if (!signedNote) {
            warnings.push({
                code: 'NOTE001',
                field: 'encounter.notes',
                message: 'No signed note found for this encounter',
                suggestion: 'Ensure clinical documentation is signed before submission',
            });
        }
    }

    // Check for billed amount
    if (!claim.billed_amount || claim.billed_amount <= 0) {
        warnings.push({
            code: 'AMT001',
            field: 'billed_amount',
            message: 'Billed amount is zero or missing',
            suggestion: 'Review fee schedule and set appropriate billed amount',
        });
    }

    // Place of service
    if (!claim.place_of_service) {
        warnings.push({
            code: 'POS001',
            field: 'place_of_service',
            message: 'Place of service is not specified',
            suggestion: 'Default is 11 (Office). Update if telehealth (02) or other.',
        });
    }

    // Check diagnosis-procedure compatibility
    if (claim.diagnosis_codes && claim.procedure_codes) {
        const compatibilityIssues = checkDxPxCompatibility(
            claim.diagnosis_codes,
            claim.procedure_codes
        );
        warnings.push(...compatibilityIssues);
    }

    // Patient address for paper claims
    if (patient && (!patient.address || !patient.city || !patient.state || !patient.zip_code)) {
        warnings.push({
            code: 'PAT004',
            field: 'patient.address',
            message: 'Patient address is incomplete',
            suggestion: 'Complete address may be required for some payers',
        });
    }

    // Calculate confidence score
    const score = calculateConfidenceScore(errors, warnings);

    return {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        score,
    };
}

/**
 * Batch validate multiple claims
 */
export async function batchValidateClaims(
    claimIds: string[],
    organizationId?: string
): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    for (const claimId of claimIds) {
        const result = await validateClaimForSubmission(claimId, organizationId);
        results.set(claimId, result);
    }

    return results;
}

/**
 * Validate ICD-10 code format
 */
function isValidICD10(code: string): boolean {
    // ICD-10-CM format: Letter followed by 2-7 alphanumeric characters
    // Format: A00-Z99 with optional decimal and additional characters
    const icd10Pattern = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/i;
    return icd10Pattern.test(code.replace(/\./g, '').length >= 3 ? code : '');
}

/**
 * Validate CPT code format
 */
function isValidCPT(code: string): boolean {
    // CPT codes are 5 digits, may be followed by modifiers
    const cptPattern = /^[0-9]{5}(-[0-9A-Z]{2})?$/;
    return cptPattern.test(code);
}

/**
 * Check diagnosis-procedure code compatibility
 * Returns warnings for potential LCD/NCD issues
 */
function checkDxPxCompatibility(
    diagnosisCodes: string[],
    procedureCodes: string[]
): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Mental health procedure codes that require mental health diagnoses
    const mentalHealthCPT = ['90832', '90834', '90837', '90846', '90847', '90853'];
    const mentalHealthDxPrefix = ['F'];

    const hasMentalHealthCPT = procedureCodes.some(code =>
        mentalHealthCPT.includes(code.substring(0, 5))
    );
    const hasMentalHealthDx = diagnosisCodes.some(code =>
        mentalHealthDxPrefix.includes(code.charAt(0).toUpperCase())
    );

    if (hasMentalHealthCPT && !hasMentalHealthDx) {
        warnings.push({
            code: 'DX_CPT001',
            field: 'diagnosis_codes',
            message: 'Psychotherapy codes typically require F-series mental health diagnoses',
            suggestion: 'Verify appropriate mental health diagnosis is documented',
        });
    }

    // E/M codes that may conflict with psychotherapy on same day
    const emCodes = ['99201', '99202', '99203', '99204', '99205', '99211', '99212', '99213', '99214', '99215'];
    const hasEM = procedureCodes.some(code => emCodes.includes(code.substring(0, 5)));
    const hasTherapy = procedureCodes.some(code => mentalHealthCPT.includes(code.substring(0, 5)));

    if (hasEM && hasTherapy && procedureCodes.length > 1) {
        warnings.push({
            code: 'DX_CPT002',
            field: 'procedure_codes',
            message: 'E/M and psychotherapy on same date may require modifier -25',
            suggestion: 'Verify E/M is for significant, separately identifiable service',
        });
    }

    return warnings;
}

/**
 * Calculate confidence score based on validation results
 */
function calculateConfidenceScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
): number {
    let score = 100;

    // Critical errors drastically reduce score
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    score -= criticalErrors.length * 25;

    // Regular errors moderately reduce score
    const regularErrors = errors.filter(e => e.severity === 'error');
    score -= regularErrors.length * 10;

    // Warnings slightly reduce score
    score -= warnings.length * 3;

    return Math.max(0, Math.min(100, score));
}

/**
 * Get validation summary for UI display
 */
export function getValidationSummary(result: ValidationResult): {
    status: 'ready' | 'warnings' | 'errors' | 'blocked';
    message: string;
    color: string;
} {
    const criticalCount = result.errors.filter(e => e.severity === 'critical').length;
    const errorCount = result.errors.filter(e => e.severity === 'error').length;
    const warningCount = result.warnings.length;

    if (criticalCount > 0) {
        return {
            status: 'blocked',
            message: `${criticalCount} critical issue(s) must be resolved`,
            color: 'red',
        };
    }

    if (errorCount > 0) {
        return {
            status: 'errors',
            message: `${errorCount} error(s) should be reviewed`,
            color: 'orange',
        };
    }

    if (warningCount > 0) {
        return {
            status: 'warnings',
            message: `${warningCount} warning(s) - review recommended`,
            color: 'yellow',
        };
    }

    return {
        status: 'ready',
        message: 'Claim is ready for submission',
        color: 'green',
    };
}
