// POST /api/auth/forgot-password
// Generates a Supabase recovery link via the Admin API and sends it
// using the branded ChartSpark password-reset email template.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/email/resend';
import { logError, logInfo, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEvent } from '@/lib/security/audit-log';
import { checkRateLimitByKey } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';
import { getClientIP } from '@/lib/utils/get-client-ip';

const ForgotPasswordSchema = z.object({
    email: z.string().email().max(320),
});

const RESET_EXPIRY_MINUTES = 60;

export async function POST(request: NextRequest) {
    // SEC-PT6-F4: CSRF origin validation for pre-auth state-changing route
    if (!validateOrigin(request)) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        // Rate limit by IP to prevent enumeration
        const rateLimit = await checkRateLimitByKey(ipAddress, 'emailSend', '/api/auth/forgot-password');
        if (!rateLimit.success && rateLimit.response) {
            return rateLimit.response;
        }

        const body = await request.json();
        const parsed = ForgotPasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        const { email } = parsed.data;

        // Always return success to the client to prevent email enumeration.
        // Actual work happens below, but errors are swallowed from the client.
        const successResponse = NextResponse.json({
            success: true,
            message: 'If an account with that email exists, you will receive a password reset link shortly.',
        });

        const supabase = createServiceRoleClient();
        if (!supabase) {
            return successResponse;
        }

        // Look up the user to get their first name for the email template
        const { data: userRecord } = await supabase
            .from('users')
            .select('id, first_name')
            .eq('email', email.toLowerCase())
            .single();

        if (!userRecord) {
            // User doesn't exist — return generic success (anti-enumeration)
            return successResponse;
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chart-spark-og.vercel.app';

        // Generate a recovery link using Supabase Admin API
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: email.toLowerCase(),
            options: {
                redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
            },
        });

        if (linkError || !linkData?.properties?.action_link) {
            logError({ action: 'FORGOT_PASSWORD_LINK_GENERATION_FAILED', error: sanitizeError(linkError) });
            return successResponse;
        }

        // Send the branded email
        if (isEmailConfigured()) {
            const resetUrl = linkData.properties.action_link;
            const firstName = userRecord.first_name || 'there';

            const emailResult = await sendPasswordResetEmail(
                email.toLowerCase(),
                firstName,
                resetUrl,
                RESET_EXPIRY_MINUTES,
            );

            if (!emailResult.success) {
                logError({ action: 'FORGOT_PASSWORD_EMAIL_FAILED', error: emailResult.error });
            }
        }

        await logAuditEvent({
            eventType: 'PASSWORD_RESET',
            userId: userRecord.id,
            userEmail: email,
            ipAddress,
            userAgent,
            resourceType: 'user',
            resourceId: userRecord.id,
            details: { action: 'reset_requested' },
            phiAccessed: false,
            riskLevel: 'MEDIUM',
        });

        logInfo({ action: 'FORGOT_PASSWORD_SENT', resourceId: userRecord.id });
        return successResponse;
    } catch (error) {
        logError({ action: 'FORGOT_PASSWORD_ERROR', error: sanitizeError(error) });
        // Still return generic success — never leak internal errors
        return NextResponse.json({
            success: true,
            message: 'If an account with that email exists, you will receive a password reset link shortly.',
        });
    }
}
