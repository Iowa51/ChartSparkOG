/**
 * Database Utilities
 * PHI-safe logging, error handling, and helper functions
 */

import { DatabaseError, NotFoundError, UnauthorizedError, ValidationError } from '../types/database';
import { logAuditEvent, getRiskLevel } from '../security/audit-log';

// =============================================
// PHI SANITIZATION
// =============================================

/**
 * Sanitize PHI from error messages and logs
 * Removes patient names, MRNs, emails, phones, addresses
 */
export function sanitizePHI(message: string): string {
    return message
        // Remove email addresses
        .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
        // Remove phone numbers
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
        // Remove MRNs
        .replace(/MRN-\d{6}/g, '[MRN]')
        // Remove UUIDs (could be patient IDs)
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[ID]');
}

/**
 * Safe logger that sanitizes PHI before logging
 */
export const safeLogger = {
    error: (message: string, error?: any) => {
        const sanitized = sanitizePHI(message);
        console.error(`[DB Error] ${sanitized}`, error ? sanitizePHI(JSON.stringify(error)) : '');
    },
    warn: (message: string) => {
        const sanitized = sanitizePHI(message);
        console.warn(`[DB Warning] ${sanitized}`);
    },
    info: (message: string) => {
        const sanitized = sanitizePHI(message);
        console.log(`[DB Info] ${sanitized}`);
    },
    debug: (message: string, data?: any) => {
        if (process.env.NODE_ENV === 'development') {
            const sanitized = sanitizePHI(message);
            console.debug(`[DB Debug] ${sanitized}`, data);
        }
    }
};

// =============================================
// ERROR HANDLING
// =============================================

/**
 * Handle Supabase errors and convert to application errors
 */
export function handleDatabaseError(error: any, context: string): never {
    safeLogger.error(`Database error in ${context}`, error);

    // PostgreSQL error codes
    if (error.code) {
        switch (error.code) {
            case '23505': // unique_violation
                throw new DatabaseError(
                    'A record with this value already exists',
                    'UNIQUE_VIOLATION',
                    { context }
                );
            case '23503': // foreign_key_violation
                throw new DatabaseError(
                    'Referenced record does not exist',
                    'FOREIGN_KEY_VIOLATION',
                    { context }
                );
            case '42P01': // undefined_table
                throw new DatabaseError(
                    'Database schema error',
                    'UNDEFINED_TABLE',
                    { context }
                );
            case 'PGRST116': // Row not found
                throw new NotFoundError(context, 'unknown');
        }
    }

    // Supabase error messages
    if (error.message) {
        if (error.message.includes('JWT')) {
            throw new UnauthorizedError('Invalid or expired session');
        }
        if (error.message.includes('RLS')) {
            throw new UnauthorizedError('Access denied by security policy');
        }
    }

    // Generic database error
    throw new DatabaseError(
        error.message || 'An unexpected database error occurred',
        error.code,
        { context, originalError: error }
    );
}

// =============================================
// VALIDATION
// =============================================

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
): void {
    for (const field of requiredFields) {
        if (!data[field]) {
            throw new DatabaseError(
                `Missing required field: ${String(field)}`,
                'VALIDATION_ERROR'
            );
        }
    }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone format (US - flexible)
 * Accepts: (555) 123-4567, 555-123-4567, 5551234567, +1 555 123 4567, etc.
 */
export function validatePhone(phone: string): boolean {
    // Remove all non-digit characters except + for country code
    const digits = phone.replace(/[^\d+]/g, '');
    // Must have 10 digits (US) or 11 digits with country code (1 for US)
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1')) || (digits.length === 12 && digits.startsWith('+1'));
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
}

// =============================================
// PAGINATION
// =============================================

/**
 * Calculate pagination range for Supabase
 */
export function getPaginationRange(page: number, pageSize: number): { from: number; to: number } {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    return { from, to };
}

/**
 * Calculate total pages from count
 */
export function getTotalPages(count: number, pageSize: number): number {
    return Math.ceil(count / pageSize);
}

// =============================================
// FORMATTING
// =============================================

/**
 * Format patient name for display
 */
export function formatPatientName(firstName: string, lastName: string, preferredName?: string): string {
    if (preferredName) {
        return `${preferredName} (${firstName} ${lastName})`;
    }
    return `${firstName} ${lastName}`;
}

/**
 * Generate initials from name
 */
export function generateInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Generate random avatar color
 */
const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
];

export function generateAvatarColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format date for database (YYYY-MM-DD)
 */
export function formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// =============================================
// AUDIT LOGGING
// =============================================

export interface AuditLogEntry {
    event_type: string;
    user_id?: string;
    organization_id?: string;
    resource_type?: string;
    resource_id?: string;
    details?: Record<string, any>;
    phi_accessed?: boolean;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Create audit log entry (to be called by data layer functions)
 * Delegates to the real logAuditEvent from security/audit-log.ts
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    await logAuditEvent({
        eventType: entry.event_type as any,
        userId: entry.user_id,
        organizationId: entry.organization_id,
        resourceType: entry.resource_type,
        resourceId: entry.resource_id,
        details: entry.details,
        phiAccessed: entry.phi_accessed,
        riskLevel: entry.risk_level || getRiskLevel(entry.event_type as any),
    });
}

// =============================================
// RETRY LOGIC
// =============================================

/**
 * Retry a database operation with exponential backoff
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Don't retry on certain errors
            if (error instanceof UnauthorizedError || error instanceof ValidationError) {
                throw error;
            }

            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                safeLogger.warn(`Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}
