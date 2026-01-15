// src/lib/utils/safe-logger.ts
// SEC-007: PHI-safe logging utility
// Automatically redacts known PHI fields before logging

const PHI_FIELDS = [
    'ssn', 'social_security', 'socialSecurity',
    'dob', 'date_of_birth', 'dateOfBirth', 'birthDate',
    'address', 'street', 'city', 'zipcode', 'zip', 'postal',
    'phone', 'telephone', 'mobile', 'cell',
    'email', 'emailAddress',
    'firstName', 'first_name', 'lastName', 'last_name', 'name', 'fullName',
    'insurance_id', 'insuranceId', 'policyNumber', 'policy_number',
    'diagnosis', 'diagnoses', 'icd10', 'icd_codes',
    'notes', 'content', 'noteContent', 'sessionNotes', 'clinicalNotes',
    'symptoms', 'medications', 'allergies', 'conditions',
    'treatmentPlan', 'treatment_plan', 'recommendations',
    'emergencyContact', 'emergency_contact',
    'mrn', 'medicalRecordNumber', 'patientId', 'patient_id',
];

const PHI_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Email
];

/**
 * Deep clone and redact PHI from an object
 */
export function redactPHI(data: unknown): unknown {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'string') {
        let result = data;
        for (const pattern of PHI_PATTERNS) {
            result = result.replace(pattern, '[REDACTED]');
        }
        // Truncate long strings that might be PHI
        if (result.length > 100) {
            return `[TRUNCATED:${result.length} chars]`;
        }
        return result;
    }

    if (Array.isArray(data)) {
        return data.map(item => redactPHI(item));
    }

    if (typeof data === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            const lowerKey = key.toLowerCase();
            if (PHI_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
                result[key] = '[REDACTED]';
            } else {
                result[key] = redactPHI(value);
            }
        }
        return result;
    }

    return data;
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    context: string;
    [key: string]: unknown;
}

/**
 * Safe structured logger that redacts PHI
 */
export function safeLog(context: string, level: LogEntry['level'], data?: Record<string, unknown>): void {
    const redacted = redactPHI(data || {}) as Record<string, unknown>;
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        context,
        ...redacted,
    };

    const output = JSON.stringify(entry);

    switch (level) {
        case 'error':
            console.error(output);
            break;
        case 'warn':
            console.warn(output);
            break;
        case 'debug':
            if (process.env.NODE_ENV !== 'production') {
                console.debug(output);
            }
            break;
        default:
            console.log(output);
    }
}

export const logger = {
    info: (context: string, data?: Record<string, unknown>) => safeLog(context, 'info', data),
    warn: (context: string, data?: Record<string, unknown>) => safeLog(context, 'warn', data),
    error: (context: string, data?: Record<string, unknown>) => safeLog(context, 'error', data),
    debug: (context: string, data?: Record<string, unknown>) => safeLog(context, 'debug', data),
};

export default logger;
