// src/lib/auth/session.ts
// HIPAA-compliant session management

export const SESSION_CONFIG = {
    // Session timeout (15 minutes of inactivity for healthcare)
    inactivityTimeout: 15 * 60 * 1000, // 15 minutes

    // Absolute session timeout (8 hours max)
    absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours

    // Warning before timeout (2 minutes)
    warningBefore: 2 * 60 * 1000, // 2 minutes

    // Single session per user (kick out other sessions)
    singleSession: true,

    // Re-authenticate for sensitive actions
    reAuthForSensitiveActions: true,

    // Session storage key
    storageKey: 'chartspark_session_activity',
};

/**
 * Record user activity timestamp
 */
export function recordActivity(): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_CONFIG.storageKey, Date.now().toString());
    }
}

/**
 * Get last activity timestamp
 */
export function getLastActivity(): number {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(SESSION_CONFIG.storageKey);
        return stored ? parseInt(stored, 10) : Date.now();
    }
    return Date.now();
}

/**
 * Check if session has expired due to inactivity
 */
export function hasSessionExpired(): boolean {
    const lastActivity = getLastActivity();
    const idle = Date.now() - lastActivity;
    return idle > SESSION_CONFIG.inactivityTimeout;
}

/**
 * Check if session is about to expire (within warning window)
 */
export function isSessionExpiring(): boolean {
    const lastActivity = getLastActivity();
    const idle = Date.now() - lastActivity;
    const warningThreshold = SESSION_CONFIG.inactivityTimeout - SESSION_CONFIG.warningBefore;
    return idle > warningThreshold && idle <= SESSION_CONFIG.inactivityTimeout;
}

/**
 * Get remaining time until session expires (in seconds)
 */
export function getSessionRemainingTime(): number {
    const lastActivity = getLastActivity();
    const idle = Date.now() - lastActivity;
    const remaining = SESSION_CONFIG.inactivityTimeout - idle;
    return Math.max(0, Math.floor(remaining / 1000));
}

/**
 * Clear session activity data
 */
export function clearSessionActivity(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_CONFIG.storageKey);
    }
}

/**
 * Initialize session tracking (call on login)
 */
export function initializeSession(): void {
    recordActivity();

    // Store session start time for absolute timeout
    if (typeof window !== 'undefined') {
        localStorage.setItem('chartspark_session_start', Date.now().toString());
    }
}

/**
 * Check if absolute session timeout has been reached
 */
export function hasAbsoluteTimeoutExpired(): boolean {
    if (typeof window !== 'undefined') {
        const sessionStart = localStorage.getItem('chartspark_session_start');
        if (sessionStart) {
            const elapsed = Date.now() - parseInt(sessionStart, 10);
            return elapsed > SESSION_CONFIG.absoluteTimeout;
        }
    }
    return false;
}

/**
 * List of sensitive actions requiring re-authentication
 */
export const SENSITIVE_ACTIONS = [
    'change_password',
    'enable_mfa',
    'disable_mfa',
    'delete_patient',
    'export_data',
    'change_email',
    'change_role',
    'revoke_access',
] as const;

export type SensitiveAction = typeof SENSITIVE_ACTIONS[number];

/**
 * Check if action requires re-authentication
 */
export function requiresReAuth(action: string): boolean {
    return SESSION_CONFIG.reAuthForSensitiveActions &&
        SENSITIVE_ACTIONS.includes(action as SensitiveAction);
}
