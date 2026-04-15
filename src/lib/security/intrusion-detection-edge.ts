export type EdgeThreatType =
    | 'SQL_INJECTION'
    | 'XSS_ATTEMPT'
    | 'PATH_TRAVERSAL';

export interface EdgeThreatDetection {
    detected: boolean;
    threatType?: EdgeThreatType;
}

const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\b(AND|OR)\b\s+\d+\s*=\s*\d+)/i,
    /(';|";|`)/,
    /(\bWHERE\b.*\b(AND|OR)\b)/i,
];

const XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    /<script/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /(<img[^>]+onerror)/i,
    /(document\.(cookie|location|write))/i,
    /(window\.(location|open))/i,
    /eval\s*\(/i,
];

const PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /\.\.%2f/i,
    /%252e%252e%252f/i,
];

export function checkSQLInjection(input: string): EdgeThreatDetection {
    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                threatType: 'SQL_INJECTION',
            };
        }
    }

    return { detected: false };
}

export function checkXSS(input: string): EdgeThreatDetection {
    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                threatType: 'XSS_ATTEMPT',
            };
        }
    }

    return { detected: false };
}

export function checkPathTraversal(input: string): EdgeThreatDetection {
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                threatType: 'PATH_TRAVERSAL',
            };
        }
    }

    return { detected: false };
}
