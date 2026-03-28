// src/app/api/auth/record-attempt/route.ts
// SEC-REMEDIATION: Server-side login attempt recording with service role client

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { LoginAttemptSchema, validateRequest } from '@/lib/validation/schemas';
import { validateOrigin } from '@/lib/security/csrf';
import { getClientIP } from '@/lib/utils/get-client-ip';

// F-020: In-memory IP-based rate limiting for record-attempt endpoint
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // max 20 requests per IP per minute

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
    // SEC-PT6-F4: CSRF origin validation for pre-auth state-changing route
    if (!validateOrigin(request)) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    try {
        const ipAddress = getClientIP(request);

        // F-020: Rate limit by IP to prevent lockout flooding
        if (isRateLimited(ipAddress)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await request.json();

        // F-020: Validate email format with Zod
        const validation = validateRequest(LoginAttemptSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.errors }, { status: 400 });
        }
        const { email, success } = validation.data;

        // SEC-REMEDIATION: Use service role client for recording attempts
        // This bypasses RLS since we need to record before user is authenticated
        const supabase = createServiceRoleClient();

        if (!supabase) {
            // In demo mode without Supabase, just acknowledge
            const isDemoMode = process.env.NODE_ENV !== 'production' &&
                process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
            if (isDemoMode) {
                return NextResponse.json({ recorded: true, demo: true });
            }
            // In production without service client, log error but don't block
            logError({ action: 'RECORD_ATTEMPT_NO_SERVICE_ROLE', error: 'Service role not configured' });
            return NextResponse.json({ recorded: false, error: 'Service unavailable' });
        }

        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Record the attempt in login_attempts table
        try {
            await supabase.from('login_attempts').insert({
                email: email.toLowerCase(),
                ip_address: ipAddress,
                user_agent: userAgent,
                success,
                created_at: new Date().toISOString(),
            });

            // If successful, clear old failed attempts for this email
            if (success) {
                await supabase
                    .from('login_attempts')
                    .delete()
                    .eq('email', email.toLowerCase())
                    .eq('success', false)
                    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Older than 24h
            }
        } catch (dbError) {
            // Log but don't fail - recording is important but not blocking
            logError({ action: 'RECORD_ATTEMPT_DB_ERROR', error: sanitizeError(dbError) });
        }

        // SEC-SPRINT8: Route audit writes through canonical helper
        try {
            await logAuditEvent({
                eventType: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
                userEmail: email,
                ipAddress,
                userAgent,
                riskLevel: success ? 'LOW' : 'MEDIUM',
            });
        } catch {
            // Audit log failure is not blocking
        }

        return NextResponse.json({ recorded: true });

    } catch (error) {
        logError({ action: 'RECORD_ATTEMPT_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to record' }, { status: 500 });
    }
}
