// src/lib/security/intrusion-detection.ts
// Intrusion detection patterns and checks

import { logSecurityEvent } from './audit-log';

export type ThreatType =
    | 'SQL_INJECTION'
    | 'XSS_ATTEMPT'
    | 'PATH_TRAVERSAL'
    | 'COMMAND_INJECTION'
    | 'SUSPICIOUS_USER_AGENT'
    | 'AFTER_HOURS_ADMIN'
    | 'RAPID_REQUESTS'
    | 'INVALID_INPUT'
    | 'AUTHENTICATION_ANOMALY';

export interface ThreatDetection {
    detected: boolean;
    threatType?: ThreatType;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    details?: string;
}

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\b(AND|OR)\b\s+\d+\s*=\s*\d+)/i,
    /(';|";|`)/,
    /(\bWHERE\b.*\b(AND|OR)\b)/i,
];

// XSS patterns
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

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//,
    /\.\.\\/,
    /%2e%2e%2f/i,
    /%2e%2e\//i,
    /\.\.%2f/i,
    /%252e%252e%252f/i,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
    /[;&|`$]/,
    /\$\(.*\)/,
    /`.*`/,
    /\|\|/,
    /&&/,
    />\s*\/\w+/,
    /\bnc\b.*-e/i,
    /\bwget\b/i,
    /\bcurl\b.*-d/i,
];

// Suspicious user agents
const SUSPICIOUS_USER_AGENTS = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /nessus/i,
    /burp/i,
    /dirbuster/i,
    /gobuster/i,
    /wfuzz/i,
    /hydra/i,
    /medusa/i,
    /havij/i,
    /acunetix/i,
];

/**
 * Check for SQL injection attempts
 */
export function checkSQLInjection(input: string): ThreatDetection {
    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                threatType: 'SQL_INJECTION',
                severity: 'CRITICAL',
                details: `SQL injection pattern detected: ${pattern.toString()}`,
            };
        }
    }
    return { detected: false, severity: 'LOW' };
}

/**
 * Check for XSS attempts
 */
export function checkXSS(input: string): ThreatDetection {
    const decoded = decodeURIComponent(input);

    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(decoded) || pattern.test(input)) {
            return {
                detected: true,
                threatType: 'XSS_ATTEMPT',
                severity: 'HIGH',
                details: `XSS pattern detected: ${pattern.toString()}`,
            };
        }
    }
    return { detected: false, severity: 'LOW' };
}

/**
 * Check for path traversal attempts
 */
export function checkPathTraversal(input: string): ThreatDetection {
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                threatType: 'PATH_TRAVERSAL',
                severity: 'HIGH',
                details: `Path traversal pattern detected`,
            };
        }
    }
    return { detected: false, severity: 'LOW' };
}

/**
 * Check for command injection attempts
 */
export function checkCommandInjection(input: string): ThreatDetection {
    for (const pattern of COMMAND_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            return {
                detected: true,
                threatType: 'COMMAND_INJECTION',
                severity: 'CRITICAL',
                details: `Command injection pattern detected`,
            };
        }
    }
    return { detected: false, severity: 'LOW' };
}

/**
 * Check for suspicious user agent
 */
export function checkUserAgent(userAgent: string): ThreatDetection {
    for (const pattern of SUSPICIOUS_USER_AGENTS) {
        if (pattern.test(userAgent)) {
            return {
                detected: true,
                threatType: 'SUSPICIOUS_USER_AGENT',
                severity: 'HIGH',
                details: `Suspicious user agent: ${userAgent.slice(0, 100)}`,
            };
        }
    }
    return { detected: false, severity: 'LOW' };
}

/**
 * Check for after-hours admin access
 */
export function checkAfterHoursAccess(
    userRole: string,
    timezone = 'America/New_York'
): ThreatDetection {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return { detected: false, severity: 'LOW' };
    }

    const now = new Date();
    const hours = now.getHours();

    // Flag access between 11 PM and 5 AM
    if (hours >= 23 || hours < 5) {
        return {
            detected: true,
            threatType: 'AFTER_HOURS_ADMIN',
            severity: 'MEDIUM',
            details: `Admin access at unusual hour: ${hours}:00`,
        };
    }

    return { detected: false, severity: 'LOW' };
}

/**
 * Run all intrusion detection checks on a request
 */
export async function detectThreats(options: {
    url?: string;
    body?: string;
    userAgent?: string;
    userRole?: string;
    ipAddress?: string;
    userId?: string;
    userEmail?: string;
}): Promise<ThreatDetection[]> {
    const threats: ThreatDetection[] = [];

    // Check URL
    if (options.url) {
        const urlChecks = [
            checkSQLInjection(options.url),
            checkXSS(options.url),
            checkPathTraversal(options.url),
        ];
        threats.push(...urlChecks.filter(t => t.detected));
    }

    // Check body
    if (options.body) {
        const bodyChecks = [
            checkSQLInjection(options.body),
            checkXSS(options.body),
            checkCommandInjection(options.body),
        ];
        threats.push(...bodyChecks.filter(t => t.detected));
    }

    // Check user agent
    if (options.userAgent) {
        const uaCheck = checkUserAgent(options.userAgent);
        if (uaCheck.detected) threats.push(uaCheck);
    }

    // Check after hours access
    if (options.userRole) {
        const hoursCheck = checkAfterHoursAccess(options.userRole);
        if (hoursCheck.detected) threats.push(hoursCheck);
    }

    // Log detected threats
    for (const threat of threats) {
        if (threat.severity === 'CRITICAL' || threat.severity === 'HIGH') {
            await logSecurityEvent(
                'SUSPICIOUS_ACTIVITY',
                {
                    threatType: threat.threatType,
                    severity: threat.severity,
                    details: threat.details,
                    url: options.url,
                },
                options.userId,
                options.userEmail,
                options.ipAddress
            );
        }
    }

    return threats;
}

/**
 * Check if request should be blocked
 */
export function shouldBlockRequest(threats: ThreatDetection[]): boolean {
    return threats.some(t =>
        t.detected &&
        (t.severity === 'CRITICAL' || t.threatType === 'SQL_INJECTION')
    );
}
