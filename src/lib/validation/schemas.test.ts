/**
 * Zod Validation Schema Tests
 * Ensures input validation works correctly to prevent injection attacks
 */

import { describe, it, expect } from 'vitest';
import {
    PatientCreateSchema,
    NoteCreateSchema,
    validateRequest,
    sanitizeSearchQuery,
    UUIDSchema,
} from './schemas';

describe('Validation Schemas', () => {
    describe('UUIDSchema', () => {
        it('should accept valid UUIDs', () => {
            const validUUID = '123e4567-e89b-12d3-a456-426614174000';
            expect(() => UUIDSchema.parse(validUUID)).not.toThrow();
        });

        it('should reject invalid UUIDs', () => {
            expect(() => UUIDSchema.parse('not-a-uuid')).toThrow();
            expect(() => UUIDSchema.parse('123')).toThrow();
            expect(() => UUIDSchema.parse('')).toThrow();
        });
    });

    describe('sanitizeSearchQuery', () => {
        it('should remove SQL injection attempts', () => {
            // Sanitizer removes dangerous chars and SQL keywords (case-insensitive word boundary)
            const result1 = sanitizeSearchQuery("'; DROP TABLE patients; --");
            expect(result1).not.toContain('DROP');
            expect(result1).not.toContain("'");
            expect(result1).not.toMatch(/--/);

            // Should remove standalone OR keyword
            const result2 = sanitizeSearchQuery('1 OR 1=1');
            // The OR should be removed as a standalone word
            expect(result2).not.toMatch(/\bOR\b/i);

            // SELECT should be removed
            const result3 = sanitizeSearchQuery('SELECT * FROM users');
            expect(result3).not.toMatch(/\bSELECT\b/i);
        });

        it('should remove XSS attempts', () => {
            expect(sanitizeSearchQuery('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
            expect(sanitizeSearchQuery('"><img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
        });

        it('should limit length to 200 characters', () => {
            const longInput = 'a'.repeat(300);
            expect(sanitizeSearchQuery(longInput).length).toBe(200);
        });

        it('should handle empty input', () => {
            expect(sanitizeSearchQuery('')).toBe('');
        });

        it('should preserve normal search text', () => {
            expect(sanitizeSearchQuery('John Smith')).toBe('John Smith');
            // Commas are preserved (only dangerous chars removed)
            expect(sanitizeSearchQuery('Smith, John')).toContain('Smith');
            expect(sanitizeSearchQuery('Smith, John')).toContain('John');
        });
    });

    describe('PatientCreateSchema', () => {
        it('should accept valid patient data', () => {
            const validPatient = {
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1985-04-12',
            };

            const result = PatientCreateSchema.safeParse(validPatient);
            expect(result.success).toBe(true);
        });

        it('should require first_name', () => {
            const invalid = {
                last_name: 'Doe',
                date_of_birth: '1985-04-12',
            };

            const result = PatientCreateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should require last_name', () => {
            const invalid = {
                first_name: 'John',
                date_of_birth: '1985-04-12',
            };

            const result = PatientCreateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should validate date_of_birth format', () => {
            const invalidDate = {
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '04/12/1985', // Wrong format
            };

            const result = PatientCreateSchema.safeParse(invalidDate);
            expect(result.success).toBe(false);
        });

        it('should validate email format', () => {
            const invalidEmail = {
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1985-04-12',
                email: 'not-an-email',
            };

            const result = PatientCreateSchema.safeParse(invalidEmail);
            expect(result.success).toBe(false);
        });

        it('should allow optional fields to be null', () => {
            const withNulls = {
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1985-04-12',
                email: null,
                phone: null,
            };

            const result = PatientCreateSchema.safeParse(withNulls);
            expect(result.success).toBe(true);
        });
    });

    describe('NoteCreateSchema', () => {
        it('should accept valid note data', () => {
            const validNote = {
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Patient presented with...',
            };

            const result = NoteCreateSchema.safeParse(validNote);
            expect(result.success).toBe(true);
        });

        it('should require patient_id', () => {
            const invalid = {
                content: 'Note content',
            };

            const result = NoteCreateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should require content', () => {
            const invalid = {
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
            };

            const result = NoteCreateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });

        it('should limit content length', () => {
            const tooLong = {
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'a'.repeat(60000), // Over 50000 limit
            };

            const result = NoteCreateSchema.safeParse(tooLong);
            expect(result.success).toBe(false);
        });

        it('should validate note type enum', () => {
            const validTypes = ['progress', 'intake', 'soap', 'discharge', 'other'];

            for (const type of validTypes) {
                const note = {
                    patient_id: '123e4567-e89b-12d3-a456-426614174000',
                    content: 'Note content',
                    type,
                };
                const result = NoteCreateSchema.safeParse(note);
                expect(result.success).toBe(true);
            }
        });

        it('should reject invalid note type', () => {
            const invalid = {
                patient_id: '123e4567-e89b-12d3-a456-426614174000',
                content: 'Note content',
                type: 'invalid-type',
            };

            const result = NoteCreateSchema.safeParse(invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('validateRequest', () => {
        it('should return success with data for valid input', () => {
            const result = validateRequest(PatientCreateSchema, {
                first_name: 'John',
                last_name: 'Doe',
                date_of_birth: '1985-04-12',
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.first_name).toBe('John');
            }
        });

        it('should return errors for invalid input', () => {
            const result = validateRequest(PatientCreateSchema, {
                first_name: '', // Empty - invalid
                last_name: 'Doe',
                date_of_birth: 'invalid-date',
            });

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.errors.length).toBeGreaterThan(0);
            }
        });
    });
});
