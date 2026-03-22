// SEC-SPRINT9: Server-side endpoint for meta-audit events (e.g., admin viewed audit logs).
// Replaces direct client-side insert into audit_logs, routing through the canonical helper.
// SEC-SPRINT10: Hardened with MFA requirement and Zod body validation.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

const AuditLogViewSchema = z.object({
    page: z.number().int().min(1).optional().default(1),
    resultCount: z.number().int().min(0).max(100).optional().default(25),
});

async function handlePost(context: AuthContext) {
    try {
        const body = await context.request.json();
        const parsed = AuditLogViewSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { page, resultCount } = parsed.data;

        await logAuditEvent({
            eventType: 'AUDIT_LOG_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            ipAddress: context.request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: context.request.headers.get('user-agent') || 'unknown',
            resourceType: 'audit_logs',
            details: { page, resultCount },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        logError({ action: 'AUDIT_LOG_VIEW_EVENT_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
