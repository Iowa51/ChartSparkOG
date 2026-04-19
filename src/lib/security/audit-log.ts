// F-028: Consolidated HIPAA-compliant audit logging service
// Uses service role client to bypass RLS (audit logs should always be written)

import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export type AuditEventType =
    | 'phi_read'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'MFA_CHALLENGE_SUCCESS'
    | 'MFA_CHALLENGE_FAILURE'
    | 'SESSION_TIMEOUT'
    | 'SESSION_EXTENDED'
    | 'PATIENT_VIEW'
    | 'PATIENT_CREATE'
    | 'PATIENT_UPDATE'
    | 'PATIENT_DELETE'
    | 'PATIENT_SEARCH'
    | 'PATIENT_LIST'
    | 'NOTE_VIEW'
    | 'NOTE_CREATE'
    | 'NOTE_UPDATE'
    | 'NOTE_DELETE'
    | 'NOTE_SIGN'
    | 'NOTE_APPROVED'
    | 'NOTE_REVISION_REQUESTED'
    | 'VITALS_VIEW'
    | 'VITALS_CREATE'
    | 'SCREENING_VIEW'
    | 'SCREENING_CREATE'
    | 'ENCOUNTER_VIEW'
    | 'ENCOUNTER_CREATE'
    | 'ENCOUNTER_UPDATE'
    | 'ENCOUNTER_DELETE'
    | 'PHI_EXPORT'
    | 'PHI_PRINT'
    | 'PHI_DOWNLOAD'
    | 'FEATURE_ASSIGNED'
    | 'FEATURE_REVOKED'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DEACTIVATED'
    | 'ROLE_CHANGED'
    | 'USER_INVITATION_CREATED'
    | 'USER_INVITATION_ACCEPTED'
    | 'USER_INVITATION_ACCEPTED_LINK'
    | 'USER_INVITATION_CANCELLED'
    | 'INVITATION_LIST_VIEW'
    | 'UNAUTHORIZED_INVITATION_ATTEMPT'
    | 'UNAUTHORIZED_ACCESS'
    | 'PERMISSION_DENIED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'DATA_BREACH_SUSPECTED'
    | 'API_ERROR'
    | 'SYSTEM_ERROR'
    | 'AUDIT_LOG_VIEW'
    | 'AUDIT_LOG_EXPORT'
    | 'APPOINTMENT_VIEW'
    | 'APPOINTMENT_CREATE'
    | 'APPOINTMENT_UPDATE'
    | 'APPOINTMENT_DELETE'
    | 'EHR_CONNECTION_ATTEMPT'
    | 'EHR_CONSENT_UPDATED'
    | 'AI_DIAGNOSE_REQUEST'
    | 'AI_RECOMMENDATION_REQUEST'
    | 'AI_TREATMENT_PLAN_REQUEST'
    | 'AI_CHAT_REQUEST'
    | 'AI_GENERATE_NOTE_REQUEST'
    // Billing events (F-028: consolidated from legacy managed billing audit flow)
    | 'BILLING_RECORD_VIEW'
    | 'BILLING_RECORD_CREATE'
    | 'BILLING_CLAIM_GENERATED'
    | 'BILLING_CLAIM_SUBMITTED'
    | 'BILLING_CLAIM_STATUS_CHANGED'
    | 'BILLING_PAYMENT_RECEIVED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogEntry {
    id?: string;
    timestamp?: Date;
    eventType: AuditEventType;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, any>;
    phiAccessed?: boolean;
    riskLevel: RiskLevel;
}

/**
 * SEC-009: Sanitize details object to remove any potential PHI
 */
function sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const phiFields = [
        'ssn', 'social_security', 'date_of_birth', 'dob', 'address',
        'phone', 'email', 'patient_name', 'first_name', 'last_name',
        'insurance_id', 'medical_record', 'diagnosis', 'medication',
        'treatment', 'symptoms', 'notes', 'content', 'patient', 'name',
    ];
    const sensitiveDiagnosticFields = ['error', 'message', 'stack'];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(details)) {
        const lowerKey = key.toLowerCase();

        if (phiFields.some(phi => lowerKey.includes(phi))) {
            sanitized[key] = '[REDACTED]';
        } else if (sensitiveDiagnosticFields.some(field => lowerKey.includes(field)) && typeof value === 'string') {
            sanitized[key] = '[REDACTED_DIAGNOSTIC]';
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeDetails(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Determine risk level based on event type
 */
export function getRiskLevel(eventType: AuditEventType): RiskLevel {
    const criticalEvents: AuditEventType[] = [
        'DATA_BREACH_SUSPECTED',
        'UNAUTHORIZED_ACCESS',
    ];

    const highEvents: AuditEventType[] = [
        'PATIENT_DELETE',
        'NOTE_DELETE',
        'PHI_EXPORT',
        'PHI_DOWNLOAD',
        'USER_DEACTIVATED',
        'ROLE_CHANGED',
        'SUSPICIOUS_ACTIVITY',
        'PERMISSION_DENIED',
    ];

    const mediumEvents: AuditEventType[] = [
        'phi_read',
        'PATIENT_VIEW',
        'NOTE_VIEW',
        'PATIENT_UPDATE',
        'NOTE_UPDATE',
        'PHI_PRINT',
        'LOGIN_FAILURE',
        'RATE_LIMIT_EXCEEDED',
    ];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (highEvents.includes(eventType)) return 'HIGH';
    if (mediumEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
}

/**
 * Log an audit event (fire-and-forget for non-critical events)
 * OPTIMIZATION: Non-blocking - doesn't wait for DB write to complete
 */
export function logAuditEventAsync(entry: AuditLogEntry): void {
    // Fire and forget - don't await
    logAuditEvent(entry).catch(err => {
        logError({ action: 'AUDIT_LOG_ASYNC_ERROR', error: sanitizeError(err) });
    });
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    // Defensive guard: production audit_logs.entity_type is NOT NULL.
    // Surface the offending call site immediately instead of a cryptic DB
    // constraint violation later.
    if (!entry.resourceType) {
        const callSite = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
        logError({
            action: 'AUDIT_LOG_MISSING_ENTITY_TYPE',
            error: `eventType=${entry.eventType} callSite=${callSite}`,
        });
        throw new Error(
            `Audit log missing required resourceType for eventType=${entry.eventType}`,
        );
    }

    try {
        // F-028: Use service role client to bypass RLS (audit logs must always be written)
        let supabase;
        try {
            supabase = createServiceRoleClient();
        } catch {
            // In demo mode or missing config, just log to console
            console.log('[AUDIT]', entry.eventType, sanitizeDetails(entry.details || {}));
            return;
        }

        if (!supabase) {
            console.log('[AUDIT]', entry.eventType, sanitizeDetails(entry.details || {}));
            return;
        }

        // Sanitize details to remove any PHI
        const sanitizedDetails = entry.details ? sanitizeDetails(entry.details) : {};

        // DB schema uses compact column names; HIPAA metadata goes into details JSONB.
        // A full-schema migration lives at supabase/migrations/20260407_fix_audit_logs_schema.sql
        const { error } = await supabase.from('audit_logs').insert({
            action: entry.eventType,
            user_id: entry.userId,
            organization_id: entry.organizationId,
            entity_type: entry.resourceType || null,
            entity_id: entry.resourceId || null,
            ip_address: entry.ipAddress || null,
            details: {
                ...sanitizedDetails,
                user_email: entry.userEmail,
                user_role: entry.userRole,
                user_agent: entry.userAgent,
                phi_accessed: entry.phiAccessed || false,
                risk_level: entry.riskLevel || getRiskLevel(entry.eventType),
            },
        });

        if (error) {
            const errMsg = (error as { message?: string; code?: string; details?: string })?.message
                || (error as { code?: string })?.code
                || sanitizeError(error);
            logError({ action: 'AUDIT_LOG_DB_WRITE_FAILED', error: errMsg });
        }

        // For critical events, trigger alert
        if (entry.riskLevel === 'CRITICAL') {
            await triggerSecurityAlert(entry);
        }
    } catch (err) {
        logError({ action: 'AUDIT_LOG_ERROR', error: sanitizeError(err) });
    }
}

/**
 * Log PHI access (helper function)
 */
export async function logPHIAccess(
    userId: string,
    userEmail: string,
    userRole: string,
    organizationId: string,
    resourceType: 'PATIENT' | 'NOTE' | 'ENCOUNTER',
    resourceId: string,
    action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'PRINT',
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    const eventType = `${resourceType}_${action}` as AuditEventType;

    await logAuditEvent({
        eventType,
        userId,
        userEmail,
        userRole,
        organizationId,
        ipAddress,
        userAgent,
        resourceType: resourceType.toLowerCase(),
        resourceId,
        details: { action },
        phiAccessed: true,
        riskLevel: getRiskLevel(eventType),
    });
}

/**
 * Log login attempt
 */
export async function logLoginAttempt(
    success: boolean,
    email: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string
): Promise<void> {
    await logAuditEvent({
        eventType: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
        userId,
        userEmail: email,
        ipAddress,
        userAgent,
        details: success ? undefined : { reason: failureReason },
        phiAccessed: false,
        riskLevel: success ? 'LOW' : 'MEDIUM',
    });
}

/**
 * Log security event (unauthorized access, suspicious activity, etc.)
 */
export async function logSecurityEvent(
    eventType: 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_SUSPECTED' | 'RATE_LIMIT_EXCEEDED',
    details: Record<string, any>,
    userId?: string,
    userEmail?: string,
    ipAddress?: string
): Promise<void> {
    await logAuditEvent({
        eventType,
        userId,
        userEmail,
        ipAddress,
        details,
        phiAccessed: false,
        riskLevel: eventType === 'DATA_BREACH_SUSPECTED' ? 'CRITICAL' : 'HIGH',
    });
}

// SEC-SPRINT10: Stable alert code descriptions for breach notification emails.
// Emails contain ONLY the alert code, timestamp, severity, and a fixed description.
// Full context (user ID, org ID, IP, details) stays in audit_logs only.
const ALERT_DESCRIPTIONS: Record<string, string> = {
    DATA_BREACH_SUSPECTED: 'A potential data breach has been detected. Immediate investigation is required.',
    UNAUTHORIZED_ACCESS: 'An unauthorized access attempt was detected against a protected resource.',
    SUSPICIOUS_ACTIVITY: 'Suspicious activity pattern detected that may indicate a security threat.',
    RATE_LIMIT_EXCEEDED: 'Rate limiting threshold exceeded, indicating possible automated attack.',
};

/**
 * C2: Trigger security alert for critical events
 * HIPAA Breach Notification Rule — sends minimal email via Resend and logs to console.
 * SEC-SPRINT10: Email body reduced to stable alert taxonomy — no PII, no freeform details.
 * The audit_logs table is the record of truth for full context.
 */
async function triggerSecurityAlert(entry: AuditLogEntry): Promise<void> {
    const timestamp = new Date().toISOString();

    // Always log as secondary output
    logError({ action: 'SECURITY_ALERT', resourceType: entry.eventType, timestamp });

    // Send breach notification email via Resend (server-side only)
    if (typeof window === 'undefined') {
        try {
            const alertCode = entry.eventType;
            const description = ALERT_DESCRIPTIONS[alertCode] || 'A critical security event has been recorded.';
            const severity = entry.riskLevel;

            // Dynamic import to avoid pulling Node.js-only Resend library into Edge Runtime
            const { sendEmail } = await import('@/lib/email/resend');
            await sendEmail({
                to: 'support@chartspark.io',
                subject: `[SECURITY ALERT] ${alertCode} — ${severity}`,
                html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; padding: 20px; color: #1e293b;">
  <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">Security Alert</h2>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; font-weight: bold;">Alert Code</td><td>${alertCode}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Timestamp</td><td>${timestamp}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Severity</td><td>${severity}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Description</td><td>${description}</td></tr>
    </table>
    <hr style="margin: 16px 0; border: none; border-top: 1px solid #e2e8f0;">
    <p style="color: #64748b; font-size: 13px;">
      This is an automated security alert from ChartSpark. For full context
      including user, organization, and event details, consult the audit_logs table.
    </p>
  </div>
</body>
</html>`,
                text: `SECURITY ALERT\nAlert Code: ${alertCode}\nTimestamp: ${timestamp}\nSeverity: ${severity}\nDescription: ${description}\n\nConsult the audit_logs table for full context.`,
            });
        } catch (emailError) {
            // Email failure must not suppress the alert — log and continue
            logError({ action: 'SECURITY_ALERT_EMAIL_FAILED', error: sanitizeError(emailError) });
        }
    }
}

/**
 * Query audit logs (Super Admin only)
 */
export async function queryAuditLogs(options: {
    startDate?: Date;
    endDate?: Date;
    eventTypes?: AuditEventType[];
    userId?: string;
    organizationId?: string;
    riskLevels?: RiskLevel[];
    phiOnly?: boolean;
    limit?: number;
    offset?: number;
}): Promise<AuditLogEntry[]> {
    let supabase;
    try {
        supabase = createServiceRoleClient();
    } catch {
        return [];
    }

    if (!supabase) {
        return [];
    }

    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

    if (options.startDate) {
        query = query.gte('timestamp', options.startDate.toISOString());
    }
    if (options.endDate) {
        query = query.lte('timestamp', options.endDate.toISOString());
    }
    if (options.eventTypes?.length) {
        query = query.in('event_type', options.eventTypes);
    }
    if (options.userId) {
        query = query.eq('user_id', options.userId);
    }
    if (options.organizationId) {
        query = query.eq('organization_id', options.organizationId);
    }
    if (options.riskLevels?.length) {
        query = query.in('risk_level', options.riskLevels);
    }
    if (options.phiOnly) {
        query = query.eq('phi_accessed', true);
    }

    query = query.limit(options.limit || 100);

    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
        logError({ action: 'AUDIT_LOG_QUERY_ERROR', error: sanitizeError(error) });
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.timestamp),
        eventType: row.event_type as AuditEventType,
        userId: row.user_id,
        userEmail: row.user_email,
        userRole: row.user_role,
        organizationId: row.organization_id,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: row.details,
        phiAccessed: row.phi_accessed,
        riskLevel: row.risk_level as RiskLevel,
    }));
}
