// src/app/api/auth/record-attempt/route.ts
// SEC-014: Server-side login attempt recording

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, success } = body;

        if (!email || typeof success !== 'boolean') {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const supabase = await createClient();
        if (!supabase) {
            // In demo mode without Supabase, just acknowledge
            return NextResponse.json({ recorded: true, demo: true });
        }

        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        // Record the attempt in login_attempts table (if it exists)
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
            // Table might not exist yet - log but don't fail
            console.warn('login_attempts table not available:', dbError);
        }

        // Also log to audit_logs
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
            // Audit log table might not exist
        }

        return NextResponse.json({ recorded: true });

    } catch (error) {
        console.error('Record attempt error:', error);
        return NextResponse.json({ error: 'Failed to record' }, { status: 500 });
    }
}
