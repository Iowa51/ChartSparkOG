/**
 * PHI Encryption Tests
 * Critical for HIPAA compliance - these tests verify that patient data
 * is properly encrypted and decrypted.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    encryptPHI,
    decryptPHI,
    isEncrypted,
    isV2Encrypted,
    isLegacyEncrypted,
    encryptPHIFields,
    decryptPHIFields,
    PHI_ENCRYPTED_FIELDS,
} from './encryption';

describe('PHI Encryption', () => {
    describe('encryptPHI', () => {
        it('should encrypt plaintext and return v2 format', async () => {
            const plaintext = '123-45-6789';
            const encrypted = await encryptPHI(plaintext);

            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(plaintext);
            expect(encrypted.startsWith('v2:')).toBe(true);
            expect(isV2Encrypted(encrypted)).toBe(true);
        });

        it('should return empty string for empty input', async () => {
            const encrypted = await encryptPHI('');
            expect(encrypted).toBe('');
        });

        it('should produce different ciphertext for same plaintext (unique salt/IV)', async () => {
            const plaintext = 'sensitive-data';
            const encrypted1 = await encryptPHI(plaintext);
            const encrypted2 = await encryptPHI(plaintext);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should handle special characters', async () => {
            const plaintext = 'Test with émojis 🔒 and "quotes" & <tags>';
            const encrypted = await encryptPHI(plaintext);
            const decrypted = await decryptPHI(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should handle long text', async () => {
            const plaintext = 'A'.repeat(10000);
            const encrypted = await encryptPHI(plaintext);
            const decrypted = await decryptPHI(encrypted);

            expect(decrypted).toBe(plaintext);
        });
    });

    describe('decryptPHI', () => {
        it('should correctly decrypt v2 encrypted data', async () => {
            const plaintext = '123-45-6789';
            const encrypted = await encryptPHI(plaintext);
            const decrypted = await decryptPHI(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should return empty string for empty input', async () => {
            const decrypted = await decryptPHI('');
            expect(decrypted).toBe('');
        });

        it('should throw error for invalid encrypted data', async () => {
            await expect(decryptPHI('invalid-data')).rejects.toThrow();
        });

        it('should throw error for tampered data', async () => {
            const encrypted = await encryptPHI('secret');
            // Tamper with the encrypted portion
            const parts = encrypted.split(':');
            parts[4] = 'tampered' + parts[4].slice(8);
            const tampered = parts.join(':');

            await expect(decryptPHI(tampered)).rejects.toThrow();
        });
    });

    describe('isEncrypted', () => {
        it('should return true for v2 encrypted data', async () => {
            const encrypted = await encryptPHI('test');
            expect(isEncrypted(encrypted)).toBe(true);
        });

        it('should return false for plaintext', () => {
            expect(isEncrypted('plaintext')).toBe(false);
            expect(isEncrypted('123-45-6789')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isEncrypted('')).toBe(false);
        });
    });

    describe('encryptPHIFields', () => {
        it('should encrypt only PHI fields in an object', async () => {
            const patient = {
                first_name: 'John',
                last_name: 'Doe',
                ssn: '123-45-6789',
                phone: '555-123-4567',
                email: 'john@example.com',
                notes: 'Regular checkup',
            };

            const encrypted = await encryptPHIFields(patient);

            // Non-PHI fields should remain unchanged
            expect(encrypted.first_name).toBe('John');
            expect(encrypted.last_name).toBe('Doe');
            expect(encrypted.notes).toBe('Regular checkup');

            // PHI fields should be encrypted
            expect(isEncrypted(encrypted.ssn)).toBe(true);
            expect(isEncrypted(encrypted.phone)).toBe(true);
            expect(isEncrypted(encrypted.email)).toBe(true);
        });

        it('should not re-encrypt already encrypted fields', async () => {
            const ssn = await encryptPHI('123-45-6789');
            const patient = { ssn };

            const encrypted = await encryptPHIFields(patient);

            // Should remain the same (not double-encrypted)
            expect(encrypted.ssn).toBe(ssn);
        });
    });

    describe('decryptPHIFields', () => {
        it('should decrypt PHI fields and leave others unchanged', async () => {
            const original = {
                first_name: 'John',
                ssn: '123-45-6789',
                phone: '555-123-4567',
            };

            const encrypted = await encryptPHIFields(original);
            const decrypted = await decryptPHIFields(encrypted);

            expect(decrypted.first_name).toBe('John');
            expect(decrypted.ssn).toBe('123-45-6789');
            expect(decrypted.phone).toBe('555-123-4567');
        });
    });

    describe('PHI_ENCRYPTED_FIELDS', () => {
        it('should include all required HIPAA PHI fields', () => {
            expect(PHI_ENCRYPTED_FIELDS).toContain('ssn');
            expect(PHI_ENCRYPTED_FIELDS).toContain('date_of_birth');
            expect(PHI_ENCRYPTED_FIELDS).toContain('phone');
            expect(PHI_ENCRYPTED_FIELDS).toContain('email');
            expect(PHI_ENCRYPTED_FIELDS).toContain('insurance_id');
        });
    });
});
