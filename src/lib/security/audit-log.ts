// src/lib/security/audit-log.ts
// Comprehensive audit logging for HIPAA compliance

import { createClient } from '@/lib/supabase/client';

// Audit event types
export type AuditEventType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'SESSION_TIMEOUT'
    | 'SESSION_EXTENDED'
    | 'PATIENT_VIEW'
    | 'PATIENT_CREATE'
    | 'PATIENT_UPDATE'
    | 'PATIENT_DELETE'
    | 'PATIENT_SEARCH'
    | 'NOTE_VIEW'
    | 'NOTE_CREATE'
    | 'NOTE_UPDATE'
    | 'NOTE_DELETE'
    | 'NOTE_SIGN'
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
    | 'UNAUTHORIZED_ACCESS'
    | 'PERMISSION_DENIED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'DATA_BREACH_SUSPECTED'
    | 'API_ERROR'
    | 'SYSTEM_ERROR';

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
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        const supabase = createClient();

        if (!supabase) {
            // In demo mode, just log to console
            console.log('[AUDIT]', entry.eventType, entry);
            return;
        }

        const { error } = await supabase.from('audit_logs').insert({
            timestamp: new Date().toISOString(),
            event_type: entry.eventType,
            user_id: entry.userId,
            user_email: entry.userEmail,
            user_role: entry.userRole,
            organization_id: entry.organizationId,
            ip_address: entry.ipAddress,
            user_agent: entry.userAgent,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            details: entry.details,
            phi_accessed: entry.phiAccessed || false,
            risk_level: entry.riskLevel || getRiskLevel(entry.eventType),
        });

        if (error) {
            console.error('Failed to log audit event:', error);
        }

        // For critical events, trigger alert
        if (entry.riskLevel === 'CRITICAL') {
            await triggerSecurityAlert(entry);
        }
    } catch (err) {
        console.error('Audit logging error:', err);
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

/**
 * Trigger security alert for critical events
 */
async function triggerSecurityAlert(entry: AuditLogEntry): Promise<void> {
    console.error('[SECURITY ALERT]', entry.eventType, entry);

    // In production, this would:
    // 1. Send email to security team
    // 2. Send SMS for critical alerts
    // 3. Trigger SIEM integration
    // 4. Create incident ticket

    // For now, just log prominently
    if (typeof window === 'undefined') {
        // Server-side
        console.error(`
================================================================================
🚨 CRITICAL SECURITY ALERT 🚨
================================================================================
Event Type: ${entry.eventType}
User: ${entry.userEmail || 'Unknown'} (${entry.userId || 'N/A'})
IP Address: ${entry.ipAddress || 'Unknown'}
Time: ${new Date().toISOString()}
Details: ${JSON.stringify(entry.details, null, 2)}
================================================================================
    `);
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
    const supabase = createClient();

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
        console.error('Error querying audit logs:', error);
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
