// src/app/api/auth/record-attempt/route.ts
// SEC-REMEDIATION: Server-side login attempt recording with service role client

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, success } = body;

        if (!email || typeof success !== 'boolean') {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

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

        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';
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

        // Also log to audit_logs for HIPAA compliance
        try {
            await supabase.from('audit_logs').insert({
                event_type: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
                user_email: email,
                ip_address: ipAddress,
                user_agent: userAgent,
                risk_level: success ? 'LOW' : 'MEDIUM',
                created_at: new Date().toISOString(),
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
