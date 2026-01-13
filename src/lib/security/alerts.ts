// src/lib/security/alerts.ts
// Security alert system

import { AuditLogEntry, RiskLevel } from './audit-log';

export interface SecurityAlert {
    id: string;
    timestamp: Date;
    severity: RiskLevel;
    title: string;
    description: string;
    event: AuditLogEntry;
    notified: boolean;
}

// In-memory alert store (use proper storage in production)
const alertStore: SecurityAlert[] = [];

/**
 * Create and send a security alert
 */
export async function sendSecurityAlert(event: AuditLogEntry): Promise<void> {
    const alert: SecurityAlert = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        timestamp: new Date(),
        severity: event.riskLevel,
        title: formatAlertTitle(event),
        description: formatAlertDescription(event),
        event,
        notified: false,
    };

    // Store alert
    alertStore.unshift(alert);

    // Keep only last 1000 alerts
    if (alertStore.length > 1000) {
        alertStore.pop();
    }

    // Log to console
    console.error(`[SECURITY ALERT - ${event.riskLevel}]`, alert.title);

    // In production, send notifications:
    // 1. Email to security team
    if (event.riskLevel === 'CRITICAL' || event.riskLevel === 'HIGH') {
        await sendEmailAlert(alert);
    }

    // 2. SMS for critical alerts
    if (event.riskLevel === 'CRITICAL') {
        await sendSMSAlert(alert);
    }

    // 3. Slack/Teams webhook
    await sendWebhookAlert(alert);

    alert.notified = true;
}

/**
 * Format alert title
 */
function formatAlertTitle(event: AuditLogEntry): string {
    const titles: Record<string, string> = {
        'DATA_BREACH_SUSPECTED': '🚨 Potential Data Breach Detected',
        'UNAUTHORIZED_ACCESS': '⚠️ Unauthorized Access Attempt',
        'SUSPICIOUS_ACTIVITY': '⚠️ Suspicious Activity Detected',
        'PATIENT_DELETE': '🗑️ Patient Record Deleted',
        'PHI_EXPORT': '📤 PHI Data Exported',
        'ROLE_CHANGED': '👤 User Role Changed',
        'LOGIN_FAILURE': '🔐 Failed Login Attempt',
        'RATE_LIMIT_EXCEEDED': '🚦 Rate Limit Exceeded',
    };

    return titles[event.eventType] || `Security Event: ${event.eventType}`;
}

/**
 * Format alert description
 */
function formatAlertDescription(event: AuditLogEntry): string {
    const parts: string[] = [];

    if (event.userEmail) {
        parts.push(`User: ${event.userEmail}`);
    }
    if (event.ipAddress) {
        parts.push(`IP: ${event.ipAddress}`);
    }
    if (event.resourceType && event.resourceId) {
        parts.push(`Resource: ${event.resourceType}/${event.resourceId}`);
    }
    if (event.details) {
        parts.push(`Details: ${JSON.stringify(event.details)}`);
    }

    return parts.join(' | ');
}

/**
 * Send email alert
 */
async function sendEmailAlert(alert: SecurityAlert): Promise<void> {
    const alertEmail = process.env.ALERT_EMAIL;

    if (!alertEmail) {
        console.log('[Alert] No ALERT_EMAIL configured, skipping email notification');
        return;
    }

    // In production, use your email service (SendGrid, AWS SES, etc.)
    console.log(`[Alert] Would send email to ${alertEmail}:`, alert.title);

    // Example implementation:
    // await sendEmail({
    //   to: alertEmail,
    //   subject: `[ChartSpark Security] ${alert.title}`,
    //   body: formatEmailBody(alert),
    // });
}

/**
 * Send SMS alert for critical events
 */
async function sendSMSAlert(alert: SecurityAlert): Promise<void> {
    const alertPhone = process.env.ALERT_PHONE;

    if (!alertPhone) {
        console.log('[Alert] No ALERT_PHONE configured, skipping SMS notification');
        return;
    }

    // In production, use your SMS service (Twilio, AWS SNS, etc.)
    console.log(`[Alert] Would send SMS to ${alertPhone}:`, alert.title);

    // Example implementation:
    // await sendSMS({
    //   to: alertPhone,
    //   message: `ChartSpark Alert: ${alert.title}. Check email for details.`,
    // });
}

/**
 * Send webhook alert (Slack, Teams, etc.)
 */
async function sendWebhookAlert(alert: SecurityAlert): Promise<void> {
    const webhookUrl = process.env.SECURITY_WEBHOOK_URL;

    if (!webhookUrl) {
        return;
    }

    try {
        await fetch(webhookUrl, {
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
        });
    } catch (error) {
        console.error('Failed to send webhook alert:', error);
    }
}

/**
 * Get color for severity level
 */
function getSeverityColor(severity: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
        'CRITICAL': '#dc2626', // red
        'HIGH': '#f97316', // orange
        'MEDIUM': '#eab308', // yellow
        'LOW': '#22c55e', // green
    };
    return colors[severity];
}

/**
 * Get recent alerts
 */
export function getRecentAlerts(limit = 50): SecurityAlert[] {
    return alertStore.slice(0, limit);
}

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(severity: RiskLevel, limit = 50): SecurityAlert[] {
    return alertStore
        .filter(a => a.severity === severity)
        .slice(0, limit);
}

/**
 * Get unacknowledged critical alerts
 */
export function getCriticalAlerts(): SecurityAlert[] {
    return alertStore.filter(a => a.severity === 'CRITICAL');
}
