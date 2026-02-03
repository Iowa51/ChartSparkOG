// src/lib/security/encryption.ts
// PHI encryption utilities using AES-256-GCM
// SEC-REMEDIATION: v2 format with per-record salts for improved security

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Legacy static salt (for backward compatibility only)
const LEGACY_SALT = 'chartspark-salt';

// Get encryption key from environment (must be 32+ characters)
const getEncryptionKey = (): string => {
    const key = process.env.PHI_ENCRYPTION_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!key) {
        // SEC-REMEDIATION: FAIL HARD in production - no fallback allowed
        if (isProduction) {
            throw new Error(
                'SECURITY CRITICAL: PHI_ENCRYPTION_KEY must be set in production. ' +
                'Application cannot start without it. ' +
                'Generate one with: openssl rand -base64 32'
            );
        }

        // In development, throw error with helpful message
        throw new Error(
            'PHI_ENCRYPTION_KEY not set. This is required for encrypting patient data. ' +
            'Generate one with: openssl rand -base64 32 and add to .env.local'
        );
    }

    // Validate key length (should be at least 32 chars for AES-256)
    if (key.length < 32) {
        throw new Error(
            'PHI_ENCRYPTION_KEY must be at least 32 characters. ' +
            'Generate a proper key with: openssl rand -base64 32'
        );
    }

    return key;
};

/**
 * Check if encrypted data is in legacy format (v1)
 * Legacy format: iv:authTag:encrypted (static salt)
 */
export function isLegacyEncrypted(data: string): boolean {
    if (!data) return false;
    const parts = data.split(':');
    // Legacy format has exactly 3 parts and doesn't start with 'v2'
    return parts.length === 3 &&
        parts[0].length === 32 &&
        parts[1].length === 32 &&
        /^[0-9a-f]+$/.test(parts[0]) &&
        /^[0-9a-f]+$/.test(parts[1]) &&
        !data.startsWith('v2:');
}

/**
 * Check if encrypted data is in v2 format
 * V2 format: v2:salt:iv:authTag:encrypted (per-record salt)
 */
export function isV2Encrypted(data: string): boolean {
    if (!data) return false;
    const parts = data.split(':');
    return parts.length === 5 &&
        parts[0] === 'v2' &&
        parts[1].length === 32 && // salt (16 bytes = 32 hex)
        parts[2].length === 32 && // iv (16 bytes = 32 hex)
        parts[3].length === 32 && // authTag (16 bytes = 32 hex)
        /^[0-9a-f]+$/.test(parts[1]) &&
        /^[0-9a-f]+$/.test(parts[2]) &&
        /^[0-9a-f]+$/.test(parts[3]);
}

/**
 * Check if a string appears to be encrypted (any format)
 */
export function isEncrypted(data: string): boolean {
    return isLegacyEncrypted(data) || isV2Encrypted(data);
}

/**
 * Encrypt sensitive PHI data using AES-256-GCM with per-record salt
 * Returns format: v2:salt:iv:authTag:encrypted (all hex encoded)
 */
export async function encryptPHI(plaintext: string): Promise<string> {
    if (!plaintext) return '';

    try {
        // Generate unique salt and IV for this record
        const salt = randomBytes(16);
        const iv = randomBytes(16);

        // Derive key using unique salt
        const key = (await scryptAsync(getEncryptionKey(), salt, 32)) as Buffer;
        const cipher = createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // V2 format: v2:salt:iv:authTag:encrypted (all hex)
        return `v2:${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        // SEC-REMEDIATION: Don't log the actual error which might contain PHI
        console.error('Encryption error occurred');
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt PHI data - supports both legacy and v2 formats
 */
export async function decryptPHI(encryptedData: string): Promise<string> {
    if (!encryptedData) return '';

    try {
        // Check if v2 format
        if (isV2Encrypted(encryptedData)) {
            return await decryptV2(encryptedData);
        }

        // Fall back to legacy format
        if (isLegacyEncrypted(encryptedData)) {
            return await decryptLegacy(encryptedData);
        }

        throw new Error('Invalid encrypted data format');
    } catch (error) {
        // SEC-REMEDIATION: Don't log the actual error which might contain PHI
        console.error('Decryption error occurred');
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Decrypt v2 format data (per-record salt)
 */
async function decryptV2(encryptedData: string): Promise<string> {
    const parts = encryptedData.split(':');
    if (parts.length !== 5 || parts[0] !== 'v2') {
        throw new Error('Invalid v2 encrypted data format');
    }

    const [, saltHex, ivHex, authTagHex, encrypted] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive key using the record's salt
    const key = (await scryptAsync(getEncryptionKey(), salt, 32)) as Buffer;

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Decrypt legacy format data (static salt)
 * Kept for backward compatibility with existing encrypted data
 */
async function decryptLegacy(encryptedData: string): Promise<string> {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid legacy encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Use legacy static salt
    const key = (await scryptAsync(getEncryptionKey(), LEGACY_SALT, 32)) as Buffer;

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Migrate data from legacy encryption to v2 format
 * Returns the re-encrypted data, or original if already v2
 */
export async function migrateEncryption(encryptedData: string): Promise<string> {
    if (!encryptedData) return '';

    // Already v2 format, no migration needed
    if (isV2Encrypted(encryptedData)) {
        return encryptedData;
    }

    // Not encrypted at all
    if (!isLegacyEncrypted(encryptedData)) {
        return encryptedData;
    }

    // Decrypt with legacy format and re-encrypt with v2
    const plaintext = await decryptLegacy(encryptedData);
    return await encryptPHI(plaintext);
}

/**
 * Fields that should be encrypted in patient records
 * SEC-REMEDIATION: Added date_of_birth, phone, email as PHI fields
 */
export const PHI_ENCRYPTED_FIELDS = [
    'ssn',
    'insurance_id',
    'medical_record_number',
    'full_address',
    'date_of_birth',
    'phone',
    'email',
] as const;

/**
 * Encrypt specific PHI fields in an object
 */
export async function encryptPHIFields<T extends Record<string, any>>(
    data: T,
    fields: string[] = [...PHI_ENCRYPTED_FIELDS]
): Promise<T> {
    const result: Record<string, any> = { ...data };

    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string' && !isEncrypted(result[field])) {
            result[field] = await encryptPHI(result[field]);
        }
    }

    return result as T;
}

/**
 * Decrypt specific PHI fields in an object
 */
export async function decryptPHIFields<T extends Record<string, any>>(
    data: T,
    fields: string[] = [...PHI_ENCRYPTED_FIELDS]
): Promise<T> {
    const result: Record<string, any> = { ...data };

    for (const field of fields) {
        if (result[field] && typeof result[field] === 'string' && isEncrypted(result[field])) {
            result[field] = await decryptPHI(result[field]);
        }
    }

    return result as T;
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
