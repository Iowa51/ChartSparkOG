// src/lib/audit/audit-service.ts
// SEC-REMEDIATION: Comprehensive HIPAA-compliant audit logging service

import { createServiceRoleClient } from '@/lib/supabase/service-role-client';

/**
 * All auditable actions in the system
 * These map to HIPAA access requirements
 */
export type AuditAction =
    // Authentication events
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'MFA_ENABLED'
    | 'MFA_VERIFIED'
    | 'MFA_FAILED'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET'

    // User management
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'USER_ROLE_CHANGED'
    | 'USER_INVITED'
    | 'USER_ACTIVATED'
    | 'USER_DEACTIVATED'

    // PHI access events
    | 'PATIENT_VIEWED'
    | 'PATIENT_CREATED'
    | 'PATIENT_UPDATED'
    | 'PATIENT_DELETED'
    | 'PATIENT_SEARCH'
    | 'PATIENT_EXPORTED'

    // Clinical documentation
    | 'NOTE_VIEWED'
    | 'NOTE_CREATED'
    | 'NOTE_UPDATED'
    | 'NOTE_SIGNED'
    | 'NOTE_DELETED'
    | 'ENCOUNTER_VIEWED'
    | 'ENCOUNTER_CREATED'
    | 'ENCOUNTER_UPDATED'

    // AI interactions (PHI processing)
    | 'AI_DIAGNOSIS_REQUESTED'
    | 'AI_TREATMENT_PLAN_GENERATED'
    | 'AI_CHAT_SESSION'
    | 'AI_NOTE_GENERATED'

    // Administrative actions
    | 'ORG_SETTINGS_UPDATED'
    | 'SUBSCRIPTION_CHANGED'
    | 'FEATURE_GRANTED'
    | 'FEATURE_REVOKED'
    | 'AUDIT_LOG_EXPORTED'

    // Security events
    | 'UNAUTHORIZED_ACCESS'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'CSRF_BLOCKED'
    | 'LOCKOUT_TRIGGERED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogEntry {
    action: AuditAction;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    organizationId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    riskLevel: RiskLevel;
    phiAccessed: boolean;
    details?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 * Uses service role client to bypass RLS (audit logs should always be written)
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        const supabase = createServiceRoleClient();

        if (!supabase) {
            // In demo mode, just log to console
            console.log('[AUDIT]', entry);
            return;
        }

        await supabase.from('audit_logs').insert({
            event_type: entry.action,
            user_id: entry.userId,
            user_email: entry.userEmail,
            user_role: entry.userRole,
            organization_id: entry.organizationId,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            ip_address: entry.ipAddress,
            user_agent: entry.userAgent,
            risk_level: entry.riskLevel,
            phi_accessed: entry.phiAccessed,
            details: entry.details,
            created_at: new Date().toISOString(),
        });
    } catch (error) {
        // Never throw on audit log failure - log locally and continue
        console.error('[AUDIT ERROR]', error, entry);
    }
}

/**
 * Log PHI access - convenience wrapper for common PHI events
 */
export async function logPHIAccess(
    action: AuditAction,
    userId: string,
    userEmail: string,
    userRole: string,
    organizationId: string,
    patientId: string,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    await createAuditLog({
        action,
        userId,
        userEmail,
        userRole,
        organizationId,
        resourceType: 'PATIENT',
        resourceId: patientId,
        ipAddress,
        userAgent,
        riskLevel: 'MEDIUM',
        phiAccessed: true,
    });
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
    action: AuditAction,
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string
): Promise<void> {
    await createAuditLog({
        action,
        userId,
        userEmail: email,
        ipAddress,
        userAgent,
        riskLevel: success ? 'LOW' : 'MEDIUM',
        phiAccessed: false,
    });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
    action: AuditAction,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    userEmail?: string
): Promise<void> {
    await createAuditLog({
        action,
        userId,
        userEmail,
        ipAddress,
        userAgent,
        riskLevel: 'HIGH',
        phiAccessed: false,
        details,
    });
}
