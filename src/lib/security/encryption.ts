// src/lib/security/encryption.ts
// PHI encryption utilities using AES-256-GCM

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Get encryption key from environment (must be 32+ characters)
const getEncryptionKey = (): string => {
    const key = process.env.PHI_ENCRYPTION_KEY;
    if (!key) {
        console.warn('PHI_ENCRYPTION_KEY not set - using fallback for development');
        // Fallback for development only - NEVER use in production
        return 'development-key-do-not-use-in-prod-32chars!';
    }
    return key;
};

/**
 * Encrypt sensitive PHI data using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (hex encoded)
 */
export async function encryptPHI(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    try {
        const iv = randomBytes(16);
        const key = (await scryptAsync(getEncryptionKey(), 'chartspark-salt', 32)) as Buffer;
        const cipher = createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:encrypted (all hex)
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt PHI data encrypted with encryptPHI
 */
export async function decryptPHI(encryptedData: string): Promise<string> {
    if (!encryptedData) return '';

    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, authTagHex, encrypted] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = (await scryptAsync(getEncryptionKey(), 'chartspark-salt', 32)) as Buffer;

        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Check if a string appears to be encrypted (has our format)
 */
export function isEncrypted(data: string): boolean {
    if (!data) return false;
    const parts = data.split(':');
    // Check format: 32-char iv : 32-char authTag : encrypted data
    return parts.length === 3 &&
        parts[0].length === 32 &&
        parts[1].length === 32 &&
        /^[0-9a-f]+$/.test(parts[0]) &&
        /^[0-9a-f]+$/.test(parts[1]);
}

/**
 * Fields that should be encrypted in patient records
 */
export const PHI_ENCRYPTED_FIELDS = [
    'ssn',
    'insurance_id',
    'medical_record_number',
    'full_address',
] as const;

/**
 * Encrypt specific PHI fields in an object
 */
export async function encryptPHIFields<T extends Record<string, any>>(
    data: T,
    fields: string[] = [...PHI_ENCRYPTED_FIELDS]
): Promise<T> {
    const result = { ...data };

    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string' && !isEncrypted(result[field])) {
            result[field] = await encryptPHI(result[field]);
        }
    }

    return result;
}

/**
 * Decrypt specific PHI fields in an object
 */
export async function decryptPHIFields<T extends Record<string, any>>(
    data: T,
    fields: string[] = [...PHI_ENCRYPTED_FIELDS]
): Promise<T> {
    const result = { ...data };

    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string' && isEncrypted(result[field])) {
            result[field] = await decryptPHI(result[field]);
        }
    }

    return result;
}

/**
 * Hash sensitive data for searching (one-way)
 * Use when you need to search encrypted data without decrypting
 */
export async function hashForSearch(plaintext: string): Promise<string> {
    const key = (await scryptAsync(
        plaintext + getEncryptionKey(),
        'chartspark-search-salt',
        32
    )) as Buffer;
    return key.toString('hex');
}
