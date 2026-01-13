// src/lib/security/validation.ts
// Input validation and sanitization for HIPAA compliance

import { z } from 'zod';

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    // Trim whitespace
    let sanitized = input.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove script tags and common XSS patterns
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Remove SQL injection patterns (basic)
    sanitized = sanitized.replace(/(['";]--)/g, '');

    return sanitized;
}

/**
 * Sanitize object recursively
 */
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

// ==========================================
// ZOD SCHEMAS FOR ENTITIES
// ==========================================

// Common sanitized string
const sanitizedString = z.string().transform(sanitizeInput);

// Email schema
const emailSchema = z.string()
    .email('Invalid email address')
    .transform(s => s.toLowerCase().trim());

// Phone schema
const phoneSchema = z.string()
    .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format')
    .optional()
    .nullable();

// UUID schema
const uuidSchema = z.string().uuid('Invalid ID format');

// Date schema (YYYY-MM-DD)
const dateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');

// ==========================================
// PATIENT SCHEMA
// ==========================================
export const PatientSchema = z.object({
    firstName: sanitizedString
        .refine(s => s.length >= 1, 'First name is required')
        .refine(s => s.length <= 50, 'First name is too long'),
    lastName: sanitizedString
        .refine(s => s.length >= 1, 'Last name is required')
        .refine(s => s.length <= 50, 'Last name is too long'),
    dateOfBirth: dateSchema.optional().nullable(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
    email: emailSchema.optional().nullable(),
    phone: phoneSchema,
    address: sanitizedString.optional().nullable(),
    insuranceProvider: sanitizedString.optional().nullable(),
    insuranceId: sanitizedString.optional().nullable(),
    ssn: z.string()
        .regex(/^\d{3}-\d{2}-\d{4}$/, 'Invalid SSN format (use XXX-XX-XXXX)')
        .optional()
        .nullable(),
    medicalRecordNumber: sanitizedString.optional().nullable(),
    emergencyContactName: sanitizedString.optional().nullable(),
    emergencyContactPhone: phoneSchema,
});

export type PatientInput = z.infer<typeof PatientSchema>;

// ==========================================
// NOTE SCHEMA
// ==========================================
export const NoteSchema = z.object({
    patientId: uuidSchema,
    encounterId: uuidSchema.optional().nullable(),
    noteType: z.enum(['progress', 'initial_eval', 'psychotherapy', 'assessment', 'soap']),
    content: sanitizedString
        .refine(s => s.length <= 100000, 'Note content is too long'),
    status: z.enum(['draft', 'pending_review', 'signed', 'amended']).optional(),
    templateId: uuidSchema.optional().nullable(),
});

export type NoteInput = z.infer<typeof NoteSchema>;

// ==========================================
// ENCOUNTER SCHEMA
// ==========================================
export const EncounterSchema = z.object({
    patientId: uuidSchema,
    encounterDate: dateSchema,
    encounterType: z.enum(['office_visit', 'telehealth', 'phone', 'home_visit']).optional(),
    chiefComplaint: sanitizedString.optional().nullable(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
    duration: z.number().int().positive().max(480).optional(), // Max 8 hours
    billingCode: sanitizedString.optional().nullable(),
});

export type EncounterInput = z.infer<typeof EncounterSchema>;

// ==========================================
// USER SCHEMA
// ==========================================
export const UserSchema = z.object({
    email: emailSchema,
    firstName: sanitizedString.optional(),
    lastName: sanitizedString.optional(),
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN', 'AUDITOR']).optional(),
    specialty: sanitizedString.optional().nullable(),
});

export type UserInput = z.infer<typeof UserSchema>;

// ==========================================
// LOGIN SCHEMA
// ==========================================
export const LoginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ==========================================
// VALIDATION HELPER
// ==========================================

export interface ValidationResult<T> {
    success: true;
    data: T;
    errors?: never;
}

export interface ValidationError {
    success: false;
    data?: never;
    errors: string[];
}

export type ValidateResult<T> = ValidationResult<T> | ValidationError;

/**
 * Validate data against a schema
 */
export async function validateRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): Promise<ValidateResult<T>> {
    try {
        const validated = await schema.parseAsync(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                errors: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
            };
        }
        return { success: false, errors: ['Validation failed'] };
    }
}

/**
 * Quick validate - throws on error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}
