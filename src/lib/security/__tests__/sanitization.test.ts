// src/lib/security/__tests__/sanitization.test.ts
// Unit tests for input sanitization

import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeObject } from '../validation';

describe('Input Sanitization', () => {
    describe('sanitizeInput', () => {
        it('should trim whitespace', () => {
            expect(sanitizeInput('  hello  ')).toBe('hello');
        });

        it('should remove null bytes', () => {
            expect(sanitizeInput('test\0value')).toBe('testvalue');
        });

        it('should remove script tags', () => {
            expect(sanitizeInput('before<script>alert(1)</script>after')).toBe('beforeafter');
        });

        it('should remove javascript: protocol', () => {
            expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
        });

        it('should remove event handlers', () => {
            expect(sanitizeInput('onerror=alert(1)')).toBe('alert(1)');
            expect(sanitizeInput('onclick=hack()')).toBe('hack()');
        });

        it('should remove SQL comment patterns', () => {
            expect(sanitizeInput("admin';--")).toBe("admin'");
        });

        it('should pass through safe clinical text', () => {
            expect(sanitizeInput('Patient reports improvement in GAD-7 score from 15 to 8')).toBe(
                'Patient reports improvement in GAD-7 score from 15 to 8'
            );
        });

        it('should handle empty string', () => {
            expect(sanitizeInput('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizeInput(null as unknown as string)).toBe('');
            expect(sanitizeInput(undefined as unknown as string)).toBe('');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize string values in object', () => {
            const input = { name: '  John<script>alert(1)</script>  ' };
            const result = sanitizeObject(input);
            expect(result.name).toBe('John');
        });

        it('should preserve non-string values', () => {
            const input = { age: 42, active: true };
            const result = sanitizeObject(input);
            expect(result.age).toBe(42);
            expect(result.active).toBe(true);
        });

        it('should sanitize nested objects', () => {
            const input = { patient: { name: '<script>bad</script>John' } };
            const result = sanitizeObject(input);
            expect(result.patient.name).toBe('John');
        });

        it('should sanitize arrays of strings', () => {
            const input = { tags: ['safe', '<script>xss</script>bad'] };
            const result = sanitizeObject(input);
            expect(result.tags[0]).toBe('safe');
            expect(result.tags[1]).toBe('bad');
        });

        it('should handle empty objects', () => {
            expect(sanitizeObject({})).toEqual({});
        });
    });
});
