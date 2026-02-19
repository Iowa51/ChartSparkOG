// src/__tests__/validation-schemas.test.ts
// TEST-CRIT-01: Priority test suite — Zod validation schemas
// Tests the schemas used across all API routes to ensure input validation works correctly.

import { describe, it, expect } from 'vitest';
import {
    PatientCreateSchema,
    NoteCreateSchema,
    AIChatSchema,
    AIDiagnoseSchema,
    SearchQuerySchema,
    PaginationSchema,
    UUIDSchema,
    LoginAttemptSchema,
    CheckLockoutSchema,
    validateRequest,
    sanitizeSearchQuery,
} from '@/lib/validation/schemas';

// ────────────────────────────────────────
// UUIDSchema
// ────────────────────────────────────────
describe('UUIDSchema', () => {
    it('accepts a valid UUID', () => {
        expect(UUIDSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBeTruthy();
    });

    it('rejects an invalid UUID', () => {
        expect(() => UUIDSchema.parse('not-a-uuid')).toThrow();
    });

    it('rejects empty string', () => {
        expect(() => UUIDSchema.parse('')).toThrow();
    });
});

// ────────────────────────────────────────
// PaginationSchema
// ────────────────────────────────────────
describe('PaginationSchema', () => {
    it('applies defaults for empty input', () => {
        const result = PaginationSchema.parse({});
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
    });

    it('coerces string numbers', () => {
        const result = PaginationSchema.parse({ page: '3', limit: '50' });
        expect(result.page).toBe(3);
        expect(result.limit).toBe(50);
    });

    it('rejects page < 1', () => {
        expect(() => PaginationSchema.parse({ page: 0 })).toThrow();
    });

    it('rejects limit > 100', () => {
        expect(() => PaginationSchema.parse({ limit: 101 })).toThrow();
    });
});

// ────────────────────────────────────────
// sanitizeSearchQuery
// ────────────────────────────────────────
describe('sanitizeSearchQuery', () => {
    it('strips SQL injection patterns', () => {
        expect(sanitizeSearchQuery("'; DROP TABLE patients;--")).not.toContain('DROP');
        expect(sanitizeSearchQuery("'; DROP TABLE patients;--")).not.toContain('--');
    });

    it('strips XSS script tags', () => {
        expect(sanitizeSearchQuery('<script>alert(1)</script>')).not.toContain('<');
        expect(sanitizeSearchQuery('<script>alert(1)</script>')).not.toContain('>');
    });

    it('preserves safe search text', () => {
        expect(sanitizeSearchQuery('John Smith')).toBe('John Smith');
    });

    it('truncates to 200 chars', () => {
        const longInput = 'a'.repeat(300);
        expect(sanitizeSearchQuery(longInput).length).toBeLessThanOrEqual(200);
    });

    it('handles empty string', () => {
        expect(sanitizeSearchQuery('')).toBe('');
    });
});

// ────────────────────────────────────────
// PatientCreateSchema
// ────────────────────────────────────────
describe('PatientCreateSchema', () => {
    const validPatient = {
        first_name: 'Jane',
        last_name: 'Doe',
        date_of_birth: '1985-03-15',
    };

    it('accepts minimal valid patient data', () => {
        const result = PatientCreateSchema.parse(validPatient);
        expect(result.first_name).toBe('Jane');
        expect(result.last_name).toBe('Doe');
    });

    it('accepts full patient data', () => {
        const result = PatientCreateSchema.parse({
            ...validPatient,
            email: 'jane@example.com',
            phone: '555-0100',
            gender: 'female',
            preferred_name: 'Janey',
        });
        expect(result.gender).toBe('female');
        expect(result.preferred_name).toBe('Janey');
    });

    it('rejects missing first_name', () => {
        expect(() => PatientCreateSchema.parse({ last_name: 'Doe', date_of_birth: '1985-03-15' })).toThrow();
    });

    it('rejects missing last_name', () => {
        expect(() => PatientCreateSchema.parse({ first_name: 'Jane', date_of_birth: '1985-03-15' })).toThrow();
    });

    it('rejects invalid date format', () => {
        expect(() => PatientCreateSchema.parse({ ...validPatient, date_of_birth: '03/15/1985' })).toThrow();
    });

    it('rejects invalid email format', () => {
        expect(() => PatientCreateSchema.parse({ ...validPatient, email: 'not-an-email' })).toThrow();
    });

    it('rejects first_name exceeding 50 chars', () => {
        expect(() => PatientCreateSchema.parse({ ...validPatient, first_name: 'a'.repeat(51) })).toThrow();
    });

    it('accepts null for optional fields', () => {
        const result = PatientCreateSchema.parse({ ...validPatient, email: null, phone: null });
        expect(result.email).toBeNull();
        expect(result.phone).toBeNull();
    });
});

// ────────────────────────────────────────
// NoteCreateSchema
// ────────────────────────────────────────
describe('NoteCreateSchema', () => {
    const validNote = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        content: 'Patient presents with symptoms of...',
    };

    it('accepts minimal valid note', () => {
        const result = NoteCreateSchema.parse(validNote);
        expect(result.type).toBe('progress'); // default
    });

    it('rejects empty content', () => {
        expect(() => NoteCreateSchema.parse({ ...validNote, content: '' })).toThrow();
    });

    it('rejects content exceeding 50000 chars', () => {
        expect(() => NoteCreateSchema.parse({ ...validNote, content: 'a'.repeat(50001) })).toThrow();
    });

    it('rejects invalid patient_id', () => {
        expect(() => NoteCreateSchema.parse({ ...validNote, patient_id: 'bad-id' })).toThrow();
    });

    it('accepts valid note type', () => {
        const result = NoteCreateSchema.parse({ ...validNote, type: 'soap' });
        expect(result.type).toBe('soap');
    });

    it('rejects invalid note type', () => {
        expect(() => NoteCreateSchema.parse({ ...validNote, type: 'invalid_type' })).toThrow();
    });
});

// ────────────────────────────────────────
// AIChatSchema
// ────────────────────────────────────────
describe('AIChatSchema', () => {
    it('accepts a valid message', () => {
        const result = AIChatSchema.parse({ message: 'What are the symptoms of depression?' });
        expect(result.message).toBeTruthy();
    });

    it('rejects empty message', () => {
        expect(() => AIChatSchema.parse({ message: '' })).toThrow();
    });

    it('rejects message exceeding 8000 chars', () => {
        expect(() => AIChatSchema.parse({ message: 'a'.repeat(8001) })).toThrow();
    });

    it('defaults conversationHistory to empty array', () => {
        const result = AIChatSchema.parse({ message: 'Hello' });
        expect(result.conversationHistory).toEqual([]);
    });

    it('accepts valid conversation history', () => {
        const result = AIChatSchema.parse({
            message: 'Follow up',
            conversationHistory: [
                { role: 'user', content: 'Initial question' },
                { role: 'assistant', content: 'Response' },
            ],
        });
        expect(result.conversationHistory).toHaveLength(2);
    });
});

// ────────────────────────────────────────
// LoginAttemptSchema / CheckLockoutSchema
// ────────────────────────────────────────
describe('Auth schemas', () => {
    it('LoginAttemptSchema accepts valid data', () => {
        const result = LoginAttemptSchema.parse({ email: 'user@example.com', success: true });
        expect(result.email).toBe('user@example.com');
    });

    it('LoginAttemptSchema rejects invalid email', () => {
        expect(() => LoginAttemptSchema.parse({ email: 'bad', success: true })).toThrow();
    });

    it('CheckLockoutSchema accepts valid email', () => {
        const result = CheckLockoutSchema.parse({ email: 'user@example.com' });
        expect(result.email).toBe('user@example.com');
    });
});

// ────────────────────────────────────────
// validateRequest helper
// ────────────────────────────────────────
describe('validateRequest', () => {
    it('returns success with parsed data on valid input', () => {
        const result = validateRequest(UUIDSchema, '550e8400-e29b-41d4-a716-446655440000');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('550e8400-e29b-41d4-a716-446655440000');
        }
    });

    it('returns errors array on invalid input', () => {
        const result = validateRequest(UUIDSchema, 'bad-uuid');
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors).toBeInstanceOf(Array);
            expect(result.errors.length).toBeGreaterThan(0);
        }
    });

    it('returns formatted error paths', () => {
        const result = validateRequest(PatientCreateSchema, { first_name: '', last_name: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors.some(e => e.includes('first_name'))).toBe(true);
        }
    });
});
