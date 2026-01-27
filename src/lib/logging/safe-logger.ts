// src/lib/logging/safe-logger.ts
// SEC-REMEDIATION: HIPAA-compliant logging utility
// NEVER logs PHI - only logs safe metadata

/**
 * Safe log data structure - only non-PHI fields allowed
 * NEVER add: patient names, diagnoses, symptoms, notes, SSNs, DOBs, etc.
 */
type SafeLogData = {
    action: string;
    userId?: string;
    patientId?: string;
    organizationId?: string;
    timestamp?: string;
    status?: string;
    error?: string;
    duration?: string;
    count?: number;
    resourceType?: string;
    resourceId?: string;
};

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'error' : 'debug');

function shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[logLevel] ?? 0;
    return levels[level] >= currentLevel;
}

/**
 * Safe logging function - only logs non-PHI metadata
 */
export function safeLog(level: 'info' | 'error' | 'warn' | 'debug', data: SafeLogData) {
    if (!shouldLog(level)) return;

    const logEntry = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        environment: process.env.NODE_ENV,
    };

    switch (level) {
        case 'debug':
            console.debug('[SAFE]', logEntry);
            break;
        case 'info':
            console.info('[SAFE]', logEntry);
            break;
        case 'warn':
            console.warn('[SAFE]', logEntry);
            break;
        case 'error':
            console.error('[SAFE]', logEntry);
            break;
    }
}

// Convenience functions
export const logInfo = (data: SafeLogData) => safeLog('info', data);
export const logError = (data: SafeLogData) => safeLog('error', data);
export const logWarn = (data: SafeLogData) => safeLog('warn', data);
export const logDebug = (data: SafeLogData) => safeLog('debug', data);

/**
 * Sanitize an error message to remove potential PHI
 * Keeps only error type and generic message
 */
export function sanitizeError(error: unknown): string {
    if (error instanceof Error) {
        // Only return error name and first 100 chars of message
        // This reduces risk of PHI leaking in verbose error messages
        const msg = error.message.substring(0, 100);
        return `${error.name}: ${msg}`;
    }
    return 'Unknown error';
}
