// src/lib/utils/error-handler.ts
// QUAL-002: Centralized error handling with PHI sanitization

import { NextResponse } from 'next/server';

// PHI fields that should never appear in error messages or logs
const PHI_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{9}\b/g, // SSN without dashes
    /\b\d{2}\/\d{2}\/\d{4}\b/g, // DOB MM/DD/YYYY
    /\b\d{4}-\d{2}-\d{2}\b/g, // DOB YYYY-MM-DD
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{10,11}\b/g, // Phone numbers
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone with separators
];

// Keywords that might indicate PHI in error context
const PHI_KEYWORDS = [
    'patient', 'name', 'dob', 'date_of_birth', 'ssn', 'social_security',
    'address', 'phone', 'email', 'insurance', 'medical_record', 'diagnosis',
    'medication', 'treatment', 'symptoms', 'first_name', 'last_name'
];

/**
 * Sanitize a message to remove any potential PHI
 */
export function sanitizePHI(message: string): string {
    if (!message) return '';

    let sanitized = message;

    // Replace PHI patterns
    for (const pattern of PHI_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
}

/**
 * Check if an error message might contain PHI
 */
export function mightContainPHI(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for PHI keywords
    if (PHI_KEYWORDS.some(keyword => lowerMessage.includes(keyword))) {
        return true;
    }

    // Check for PHI patterns
    for (const pattern of PHI_PATTERNS) {
        if (pattern.test(message)) {
            return true;
        }
    }

    return false;
}

/**
 * Standard error response codes
 */
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create a standardized error response
 */
export function createErrorResponse(
    code: ErrorCode,
    message: string,
    status: number = 500,
    details?: unknown
): NextResponse {
    // Sanitize the message
    const sanitizedMessage = sanitizePHI(message);

    // In production, use generic messages for internal errors
    const isProduction = process.env.NODE_ENV === 'production';
    const safeMessage = isProduction && status >= 500
        ? 'An internal error occurred. Please try again later.'
        : sanitizedMessage;

    // Log the full error server-side (sanitized)
    if (status >= 500) {
        console.error(`[${code}] ${sanitizedMessage}`, details ? sanitizePHI(JSON.stringify(details)) : '');
    }

    return NextResponse.json(
        {
            error: {
                code,
                message: safeMessage,
                timestamp: new Date().toISOString(),
            }
        },
        { status }
    );
}

/**
 * Handle common error types and return appropriate responses
 */
export function handleApiError(error: unknown): NextResponse {
    // Log for debugging (sanitized)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Error]', sanitizePHI(errorMessage));

    // Handle specific error types
    if (error instanceof Error) {
        // Validation errors
        if (error.name === 'ZodError') {
            return createErrorResponse(
                ErrorCodes.VALIDATION_ERROR,
                'Invalid request data',
                400
            );
        }

        // Database connection errors
        if (error.message.includes('connection') || error.message.includes('timeout')) {
            return createErrorResponse(
                ErrorCodes.DATABASE_ERROR,
                'Database temporarily unavailable',
                503
            );
        }

        // Auth errors
        if (error.message.includes('unauthorized') || error.message.includes('unauthenticated')) {
            return createErrorResponse(
                ErrorCodes.AUTHENTICATION_ERROR,
                'Authentication required',
                401
            );
        }

        // Permission errors
        if (error.message.includes('forbidden') || error.message.includes('permission')) {
            return createErrorResponse(
                ErrorCodes.AUTHORIZATION_ERROR,
                'Access denied',
                403
            );
        }
    }

    // Default to internal error
    return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'An unexpected error occurred',
        500
    );
}

/**
 * Wrap an async API handler with error handling
 */
export function withErrorHandling<T>(
    handler: () => Promise<T>
): Promise<T | NextResponse> {
    return handler().catch(handleApiError);
}

/**
 * Safe JSON stringify that handles circular references and removes PHI
 */
export function safeStringify(obj: unknown, maxDepth: number = 3): string {
    const seen = new WeakSet();

    const stringify = (val: unknown, depth: number): unknown => {
        if (depth > maxDepth) return '[Max Depth]';
        if (val === null || val === undefined) return val;
        if (typeof val !== 'object') {
            if (typeof val === 'string') {
                return sanitizePHI(val);
            }
            return val;
        }

        if (seen.has(val as object)) return '[Circular]';
        seen.add(val as object);

        if (Array.isArray(val)) {
            return val.map(v => stringify(v, depth + 1));
        }

        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(val)) {
            // Skip PHI fields entirely
            if (PHI_KEYWORDS.includes(key.toLowerCase())) {
                result[key] = '[REDACTED]';
            } else {
                result[key] = stringify(value, depth + 1);
            }
        }
        return result;
    };

    try {
        return JSON.stringify(stringify(obj, 0));
    } catch {
        return '[Stringify Error]';
    }
}
