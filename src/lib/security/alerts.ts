// src/lib/security/alerts.ts
// Security alert system. Alerts are persisted to audit_logs as SECURITY_ALERT
// events and delivered to an optional Slack/Teams webhook.
//
// Email/SMS alert delivery requires integration with Resend (email) or Twilio
// (SMS). Not implemented — alerts are persisted to audit_logs and delivered
// via webhook only.

import { AuditLogEntry, RiskLevel, logAuditEvent } from './audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';

export interface SecurityAlert {
    timestamp: Date;
    severity: RiskLevel;
    title: string;
    description: string;
    event: AuditLogEntry;
}

const LOGIN_FAILURE_THRESHOLD = 10;
const LOGIN_FAILURE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Persist a security alert to audit_logs and deliver via webhook.
 */
export async function sendSecurityAlert(event: AuditLogEntry): Promise<void> {
    const alert: SecurityAlert = {
        timestamp: new Date(),
        severity: event.riskLevel,
        title: formatAlertTitle(event),
        description: formatAlertDescription(event),
        event,
    };

    await logAuditEvent({
        eventType: 'SECURITY_ALERT',
        userId: event.userId,
        userEmail: event.userEmail,
        userRole: event.userRole,
        organizationId: event.organizationId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        resourceType: 'security_alert',
        resourceId: event.resourceId,
        details: {
            alert_severity: event.riskLevel,
            alert_source_event: event.eventType,
            alert_title: alert.title,
            alert_description: alert.description,
            source_details: event.details,
        },
        phiAccessed: false,
        riskLevel: event.riskLevel,
        requestId: event.requestId,
    });

    await sendWebhookAlert(alert);
}

/**
 * Check the elevated auth failure rate. Call after recording LOGIN_FAILURE.
 * If more than LOGIN_FAILURE_THRESHOLD failed attempts occur for the same
 * email within LOGIN_FAILURE_WINDOW_MS, raises a HIGH severity alert.
 */
export async function checkAuthFailureRate(email: string, ipAddress?: string): Promise<void> {
    let supabase;
    try {
        supabase = createServiceRoleClient();
    } catch {
        return;
    }
    if (!supabase) return;

    const since = new Date(Date.now() - LOGIN_FAILURE_WINDOW_MS).toISOString();

    try {
        const { count, error } = await supabase
            .from('login_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('email', email.toLowerCase())
            .eq('success', false)
            .gte('created_at', since);

        if (error || count === null || count <= LOGIN_FAILURE_THRESHOLD) return;

        await sendSecurityAlert({
            eventType: 'SUSPICIOUS_ACTIVITY',
            userEmail: email,
            ipAddress,
            details: {
                reason: 'elevated_login_failure_rate',
                failure_count: count,
                window_minutes: LOGIN_FAILURE_WINDOW_MS / 60_000,
                threshold: LOGIN_FAILURE_THRESHOLD,
            },
            phiAccessed: false,
            riskLevel: 'HIGH',
        });
    } catch (err) {
        logError({ action: 'AUTH_FAILURE_RATE_CHECK_FAILED', error: sanitizeError(err) });
    }
}

function formatAlertTitle(event: AuditLogEntry): string {
    const titles: Record<string, string> = {
        'DATA_BREACH_SUSPECTED': 'Potential Data Breach Detected',
        'UNAUTHORIZED_ACCESS': 'Unauthorized Access Attempt',
        'SUSPICIOUS_ACTIVITY': 'Suspicious Activity Detected',
        'PATIENT_DELETE': 'Patient Record Deleted',
        'PHI_EXPORT': 'PHI Data Exported',
        'ROLE_CHANGED': 'User Role Changed',
        'LOGIN_FAILURE': 'Failed Login Attempt',
        'RATE_LIMIT_EXCEEDED': 'Rate Limit Exceeded',
    };
    return titles[event.eventType] || `Security Event: ${event.eventType}`;
}

function formatAlertDescription(event: AuditLogEntry): string {
    const parts: string[] = [];
    if (event.userEmail) parts.push(`User: ${event.userEmail}`);
    if (event.ipAddress) parts.push(`IP: ${event.ipAddress}`);
    if (event.resourceType && event.resourceId) {
        parts.push(`Resource: ${event.resourceType}/${event.resourceId}`);
    }
    if (event.details) parts.push(`Details: ${JSON.stringify(event.details)}`);
    return parts.join(' | ');
}

async function sendWebhookAlert(alert: SecurityAlert): Promise<void> {
    const webhookUrl = process.env.SECURITY_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetchWithTimeout(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `*${alert.title}*\n${alert.description}`,
                attachments: [
                    {
                        color: getSeverityColor(alert.severity),
                        fields: [
                            { title: 'Severity', value: alert.severity, short: true },
                            { title: 'Time', value: alert.timestamp.toISOString(), short: true },
                            { title: 'Event Type', value: alert.event.eventType, short: true },
                            { title: 'User', value: alert.event.userEmail || 'Unknown', short: true },
                        ],
                    },
                ],
            }),
            timeoutMs: 5000,
        });
    } catch (error) {
        logError({ action: 'ALERT_WEBHOOK_SEND_FAILED', error: sanitizeError(error) });
    }
}

function getSeverityColor(severity: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
        'CRITICAL': '#dc2626',
        'HIGH': '#f97316',
        'MEDIUM': '#eab308',
        'LOW': '#22c55e',
    };
    return colors[severity];
}
