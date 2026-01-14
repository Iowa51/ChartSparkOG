// src/lib/validation/schemas.ts
// SEC-007: Centralized Zod validation schemas for API routes

import { z } from 'zod';

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
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    email: z.string().email('Invalid email').optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
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
    is_signed: z.boolean().optional().default(false),
    is_locked: z.boolean().optional().default(false),
});

export const NoteUpdateSchema = NoteCreateSchema.partial().omit({ patient_id: true });

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
    encounter_id: UUIDSchema.optional(),
    amount: z.number().positive('Amount must be positive'),
    cpt_code: z.string().max(20),
    icd_codes: z.array(z.string().max(20)).max(10).optional(),
    status: z.enum(['pending', 'submitted', 'approved', 'denied', 'paid']).optional().default('pending'),
    insurance_claim_id: z.string().max(100).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
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

// Auth schemas
export const LoginAttemptSchema = z.object({
    email: z.string().email().max(255),
    success: z.boolean(),
});

export const CheckLockoutSchema = z.object({
    email: z.string().email().max(255),
});

export const CompleteSignupSchema = z.object({
    userId: UUIDSchema,
    email: z.string().email().max(255),
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
