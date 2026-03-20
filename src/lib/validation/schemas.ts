// src/lib/validation/schemas.ts
// SEC-007: Centralized Zod validation schemas for API routes
// F-030: Single canonical validation module (consolidated from security/validation.ts and utils/validation.ts)

import { z } from 'zod';

// =============================================
// SANITIZATION (from security/validation.ts)
// =============================================

/** Sanitize string input - remove dangerous characters */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    let sanitized = input.trim();
    sanitized = sanitized.replace(/\0/g, '');
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    sanitized = sanitized.replace(/(['";]--)/g, '');
    return sanitized;
}

/** Sanitize object recursively */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeInput(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = sanitizeObject(value);
        } else if (Array.isArray(value)) {
            result[key] = value.map(item =>
                typeof item === 'string' ? sanitizeInput(item) :
                    typeof item === 'object' ? sanitizeObject(item) : item
            );
        } else {
            result[key] = value;
        }
    }
    return result as T;
}

// =============================================
// FORM VALIDATION HELPERS (from utils/validation.ts)
// =============================================

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
}

export function isValidPhone(phone: string): boolean {
    return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(phone);
}

export function isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

export function isFutureDate(dateString: string): boolean {
    if (!isValidDate(dateString)) return false;
    return new Date(dateString) > new Date();
}

export interface FieldState {
    value: string;
    error: string | null;
    touched: boolean;
}

export function createFieldState(initialValue = ''): FieldState {
    return { value: initialValue, error: null, touched: false };
}

export function validateForm(
    values: Record<string, string>,
    rules: Record<string, ((value: string) => string | null)[]>
): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    for (const [field, fieldValidators] of Object.entries(rules)) {
        const value = values[field] || '';
        for (const validate of fieldValidators) {
            const error = validate(value);
            if (error) { errors[field] = error; break; }
        }
    }
    return { isValid: Object.keys(errors).length === 0, errors };
}

export const validators = {
    required: (message = 'This field is required') => (value: string) =>
        (value !== null && value !== undefined && value.trim() !== '') ? null : message,
    email: (message = 'Please enter a valid email') => (value: string) =>
        !value || isValidEmail(value) ? null : message,
    url: (message = 'Please enter a valid URL') => (value: string) =>
        !value || isValidUrl(value) ? null : message,
    minLength: (min: number, message?: string) => (value: string) =>
        !value || value.length >= min ? null : (message || `Must be at least ${min} characters`),
    maxLength: (max: number, message?: string) => (value: string) =>
        value.length <= max ? null : (message || `Must be no more than ${max} characters`),
};

// Common reusable schemas
export const UUIDSchema = z.string().uuid('Invalid ID format');

export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// SEC-008: Sanitize search input to prevent injection
export const sanitizeSearchQuery = (input: string): string => {
    if (!input) return '';
    // Allow alphanumeric, spaces, and common safe characters
    // Remove any potential SQL/XSS injection patterns
    return input
        .replace(/[<>'"`;\\]/g, '') // Remove dangerous chars
        .replace(/--/g, '') // Remove SQL comment pattern
        .replace(/\/\*/g, '') // Remove SQL block comment start
        .replace(/\*\//g, '') // Remove SQL block comment end
        .replace(/\b(OR|AND|SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE)\b/gi, '') // Remove SQL keywords
        .trim()
        .substring(0, 200); // Limit length
};

export const SearchQuerySchema = z.string()
    .max(200, 'Search query too long')
    .transform(sanitizeSearchQuery)
    .optional();

// Patient schemas
export const PatientCreateSchema = z.object({
    first_name: z.string().min(1, 'First name required').max(50),
    last_name: z.string().min(1, 'Last name required').max(50),
    preferred_name: z.string().max(50).optional().nullable(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    gender: z.enum(['male', 'female', 'non-binary', 'other', 'prefer_not_to_say']).optional().nullable(),
    email: z.string().email('Invalid email').optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    allergies: z.array(z.string().max(200)).max(50).optional().nullable(),
    medications: z.array(z.string().max(200)).max(100).optional().nullable(),
    problems: z.array(z.string().max(200)).max(100).optional().nullable(),
    insurance: z.object({
        provider: z.string().max(100).optional(),
        policy_number: z.string().max(50).optional(),
        group_number: z.string().max(50).optional(),
    }).optional().nullable(),
    insurance_id: z.string().max(50).optional().nullable(),
    emergency_contact_name: z.string().max(100).optional().nullable(),
    emergency_contact_phone: z.string().max(20).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
});

export const PatientUpdateSchema = PatientCreateSchema.partial();

export const PatientQuerySchema = z.object({
    search: SearchQuerySchema,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
});

// Appointment schemas
export const AppointmentCreateSchema = z.object({
    patient_id: UUIDSchema,
    provider_id: UUIDSchema.optional(),
    start_time: z.string().datetime('Invalid datetime format'),
    end_time: z.string().datetime('Invalid datetime format'),
    type: z.enum(['initial', 'follow_up', 'telehealth', 'emergency']).optional().default('follow_up'),
    status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional().default('scheduled'),
    notes: z.string().max(2000).optional().nullable(),
    is_telehealth: z.boolean().optional().default(false),
});

export const AppointmentUpdateSchema = AppointmentCreateSchema.partial();

// Note schemas
export const NoteCreateSchema = z.object({
    patient_id: UUIDSchema,
    encounter_id: UUIDSchema.optional(),
    type: z.enum(['progress', 'intake', 'soap', 'discharge', 'other']).optional().default('progress'),
    content: z.string().min(1, 'Note content required').max(50000),
    template_id: UUIDSchema.optional().nullable(),
    is_signed: z.boolean().optional(),
    is_locked: z.boolean().optional(),
    status: z.enum(['draft', 'completed', 'signed', 'amended', 'pending_review', 'approved', 'needs_revision']).optional(),
    cpt_codes: z.array(z.string().max(20)).max(20).optional(),
    icd10_codes: z.array(z.string().max(20)).max(20).optional(),
    subjective: z.string().max(10000).optional().nullable(),
    objective: z.string().max(10000).optional().nullable(),
    assessment: z.string().max(10000).optional().nullable(),
    plan: z.string().max(10000).optional().nullable(),
    chief_complaint: z.string().max(1000).optional().nullable(),
});

// Update schema: only include fields that are actual DB columns on clinical_notes.
// Fields like type, is_signed, is_locked, chief_complaint do NOT exist as DB columns
// and MUST NOT be sent in PATCH updates (Supabase will reject them).
export const NoteUpdateSchema = z.object({
    content: z.string().min(1).max(50000).optional(),
    status: z.enum(['draft', 'completed', 'signed', 'amended', 'pending_review', 'approved', 'needs_revision']).optional(),
    cpt_codes: z.array(z.string().max(20)).max(20).optional(),
    icd10_codes: z.array(z.string().max(20)).max(20).optional(),
    subjective: z.string().max(10000).optional().nullable(),
    objective: z.string().max(10000).optional().nullable(),
    assessment: z.string().max(10000).optional().nullable(),
    plan: z.string().max(10000).optional().nullable(),
    template_id: UUIDSchema.optional().nullable(),
    encounter_id: UUIDSchema.optional(),
});

// Encounter schemas
export const EncounterCreateSchema = z.object({
    patient_id: UUIDSchema,
    appointment_id: UUIDSchema.optional(),
    type: z.enum(['initial', 'follow_up', 'telehealth', 'emergency']).optional().default('follow_up'),
    chief_complaint: z.string().max(1000).optional().nullable(),
    subjective: z.string().max(10000).optional().nullable(),
    objective: z.string().max(10000).optional().nullable(),
    assessment: z.string().max(10000).optional().nullable(),
    plan: z.string().max(10000).optional().nullable(),
    icd_codes: z.array(z.string().max(20)).max(20).optional(),
    cpt_codes: z.array(z.string().max(20)).max(20).optional(),
});

export const EncounterUpdateSchema = EncounterCreateSchema.partial().omit({ patient_id: true });

// Billing schemas
export const BillingCreateSchema = z.object({
    patient_id: UUIDSchema,
    encounter_id: UUIDSchema.optional().nullable(),
    service_date: z.string().max(50).optional().nullable(),
    amount: z.number().positive('Amount must be positive'),
    cpt_code: z.string().max(20).optional().nullable(),
    icd_codes: z.array(z.string().max(20)).max(10).optional(),
    status: z.enum(['pending', 'submitted', 'approved', 'denied', 'paid']).optional().default('pending'),
    insurance_claim_id: z.string().max(100).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
});

// Screening schemas (F-011)
export const ScreeningCreateSchema = z.object({
    patient_id: UUIDSchema,
    encounter_id: UUIDSchema.optional().nullable(),
    instrument: z.enum(['PHQ9', 'GAD7', 'CSSRS', 'AUDITC', 'DAST10', 'MDQ', 'PCL5']),
    total_score: z.number().int().min(0).max(100, 'Score must be between 0 and 100'),
    severity: z.enum(['none', 'minimal', 'mild', 'moderate', 'moderately_severe', 'severe']).optional().nullable(),
    item_responses: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
        .refine(obj => JSON.stringify(obj).length <= 10000, 'item_responses payload too large'),
    clinical_notes: z.string().max(5000).optional().nullable(),
    risk_flags: z.array(z.string().max(200)).max(20).optional().default([]),
});

// AI Chat schemas
export const AIChatSchema = z.object({
    message: z.string().min(1, 'Message required').max(8000, 'Message too long'),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(10000),
    })).max(50).optional().default([]),
});

export const AIDiagnoseSchema = z.object({
    sessionNotes: z.string().min(1, 'Session notes required').max(10000),
    specialty: z.string().max(50).optional().default('mental_health'),
});

export const AITreatmentPlanSchema = z.object({
    patientProfile: z.union([z.string().max(5000), z.object({}).passthrough()]),
    diagnoses: z.array(z.string().max(500)).min(1, 'At least one diagnosis required').max(20),
});

export const AIRecommendationsSchema = z.object({
    diagnosis: z.string().min(1, 'Diagnosis required').max(2000),
    symptoms: z.union([z.string().max(2000), z.array(z.string().max(200))]),
    history: z.string().max(5000).optional(),
    previousTreatments: z.string().max(5000).optional(),
});

export const ValidateCodesSchema = z.object({
    codes: z.array(z.object({
        code: z.string().min(1).max(20),
        type: z.enum(['ICD10', 'CPT']),
    })).min(1).max(100),
});

// AI Generate Note schema
export const AIGenerateNoteSchema = z.object({
    clinicianInput: z.string().max(50000).optional().default(''),
    selectedPhrases: z.record(z.string(), z.array(z.string().max(500))).optional().default({}),
    templateId: z.string().max(100).optional().default(''),
    templateFormat: z.enum(['soap', 'paragraph']).optional().default('soap'),
});

// Smart Triage schemas
export const PrescribingCheckSchema = z.object({
    patient_id: UUIDSchema,
    new_medication: z.string().min(1, 'Medication name required').max(200),
    dose: z.string().max(100).optional().default(''),
    frequency: z.string().max(100).optional().default(''),
});

export const MedicationReviewSchema = z.object({
    patient_id: UUIDSchema,
});

export const ChartSummarySchema = z.object({
    patient_id: UUIDSchema,
});

// Patient document upload schema
export const PatientDocumentUploadSchema = z.object({
    document_type: z.enum(['photo_id', 'insurance_card_front', 'insurance_card_back', 'other']),
    label: z.string().max(200).optional().default(''),
});

// Telehealth schemas
export const TelehealthCreateRoomSchema = z.object({
    appointmentId: UUIDSchema,
    patientName: z.string().max(100).optional(),
    providerId: UUIDSchema.optional(),
});

export const TelehealthEndSessionSchema = z.object({
    appointmentId: UUIDSchema,
    roomName: z.string().max(100).optional(),
});

export const EHRConfigurationSchema = z.object({
    ehr_system: z.string().min(1).max(100),
    display_name: z.string().min(1).max(100),
    api_endpoint: z.string().url('Invalid API endpoint URL').max(500).optional().nullable(),
    client_id: z.string().max(255).optional().nullable(),
});

export const EHRConsentSchema = z.object({
    share_diagnoses: z.boolean().optional(),
    share_medications: z.boolean().optional(),
    share_notes: z.boolean().optional(),
    share_labs: z.boolean().optional(),
    share_appointments: z.boolean().optional(),
    share_assessments: z.boolean().optional(),
});

export const ManagedBillingClaimCreateSchema = z.object({
    patientId: UUIDSchema,
    providerId: UUIDSchema,
    encounterId: UUIDSchema.optional().nullable(),
    serviceDate: z.string().min(1).max(50),
    diagnosisCodes: z.array(z.string().max(20)).max(20).optional().default([]),
    procedureCodes: z.array(z.string().max(20)).max(20).optional().default([]),
    billedAmount: z.number().min(0).max(1000000).optional().default(0),
    payerName: z.string().min(1).max(255),
});

export const ProfileApprovalSchema = z.object({
    changeId: UUIDSchema,
    userId: UUIDSchema.optional(),
    fieldName: z.string().max(100).optional(),
    newValue: z.union([z.string().max(255), z.null()]).optional(),
    action: z.enum(['approve', 'reject']),
});

export const InvitationCreateSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    role: z.enum(['USER', 'ADMIN', 'AUDITOR']).optional().default('USER'),
    specialty: z.string().max(100).optional().nullable(),
});

// Auth schemas
export const LoginAttemptSchema = z.object({
    email: z.string().email().max(255),
    success: z.boolean(),
});

export const CheckLockoutSchema = z.object({
    email: z.string().email().max(255),
});

export const CompleteSignupSchema = z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    organizationName: z.string().min(1).max(100),
});

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    errors: string[];
} {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        errors: result.error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`),
    };
}
