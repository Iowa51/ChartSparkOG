export const SAFE_AUDIT_ERROR_CODES = {
    AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type SafeAuditErrorCode = typeof SAFE_AUDIT_ERROR_CODES[keyof typeof SAFE_AUDIT_ERROR_CODES];

function toOptionalNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getErrorStatusCode(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
        return null;
    }

    const candidate = error as {
        status?: unknown;
        statusCode?: unknown;
        response?: { status?: unknown };
    };

    return toOptionalNumber(candidate.status)
        ?? toOptionalNumber(candidate.statusCode)
        ?? toOptionalNumber(candidate.response?.status);
}

export function getSafeAuditErrorDetails(error: unknown): {
    errorCode: SafeAuditErrorCode;
    errorStatus: number | null;
} {
    const status = getErrorStatusCode(error);
    const errorName = error instanceof Error ? error.name.toLowerCase() : '';

    if (status === 429 || errorName.includes('rate')) {
        return {
            errorCode: SAFE_AUDIT_ERROR_CODES.RATE_LIMIT_EXCEEDED,
            errorStatus: status ?? 429,
        };
    }

    if (status !== null && status >= 500) {
        return {
            errorCode: SAFE_AUDIT_ERROR_CODES.AI_PROVIDER_ERROR,
            errorStatus: status,
        };
    }

    if ((status !== null && status >= 400) || errorName.includes('syntax') || errorName.includes('parse')) {
        return {
            errorCode: SAFE_AUDIT_ERROR_CODES.INVALID_RESPONSE,
            errorStatus: status,
        };
    }

    return {
        errorCode: SAFE_AUDIT_ERROR_CODES.UNKNOWN_ERROR,
        errorStatus: status,
    };
}
