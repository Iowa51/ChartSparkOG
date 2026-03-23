import { Resend } from 'resend';
import { render } from '@react-email/render';
import { logWarn, logError, logInfo, sanitizeError } from '@/lib/logging/safe-logger';
import WelcomeEmail, { welcomePlainText } from './templates/welcome';
import MFACodeEmail, { mfaCodePlainText } from './templates/mfa-code';
import PasswordResetEmail, { passwordResetPlainText } from './templates/password-reset';

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

// Email configuration
const FROM_EMAIL = 'ChartSpark <noreply@chartspark.io>';
const REPLY_TO = 'support@chartspark.io';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chart-spark-og.vercel.app';

export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface InvitationEmailData {
    recipientEmail: string;
    inviterName: string;
    organizationName: string;
    role: string;
    invitationToken: string;
    expiresAt: Date;
}

/**
 * Send a generic email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!resend) {
        logWarn({ action: 'EMAIL_RESEND_NOT_CONFIGURED', error: 'RESEND_API_KEY missing' });
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            replyTo: REPLY_TO,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });

        if (error) {
            logError({ action: 'EMAIL_RESEND_SEND_ERROR', error: sanitizeError(error) });
            return { success: false, error: error.message };
        }

        logInfo({ action: 'EMAIL_SENT_SUCCESSFULLY', resourceId: data?.id });
        return { success: true };
    } catch (err) {
        logError({ action: 'EMAIL_SEND_FAILED', error: sanitizeError(err) });
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

// =============================================
// TEMPLATE-BASED SENDER FUNCTIONS
// =============================================

/**
 * Send a welcome email after account creation
 */
export async function sendWelcomeEmail(
    to: string,
    firstName: string,
    organizationName: string,
    loginUrl: string
): Promise<{ success: boolean; error?: string }> {
    const html = await render(WelcomeEmail({ firstName, organizationName, loginUrl }));
    const text = welcomePlainText({ firstName, organizationName, loginUrl });

    return sendEmail({
        to,
        subject: `Welcome to ChartSpark, ${firstName}`,
        html,
        text,
    });
}

/**
 * Send an MFA verification code email
 */
export async function sendMFACodeEmail(
    to: string,
    firstName: string,
    code: string,
    expiresInMinutes: number
): Promise<{ success: boolean; error?: string }> {
    const html = await render(MFACodeEmail({ firstName, code, expiresInMinutes }));
    const text = mfaCodePlainText({ firstName, code, expiresInMinutes });

    return sendEmail({
        to,
        subject: `Your ChartSpark verification code: ${code}`,
        html,
        text,
    });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
    to: string,
    firstName: string,
    resetUrl: string,
    expiresInMinutes: number
): Promise<{ success: boolean; error?: string }> {
    const html = await render(PasswordResetEmail({ firstName, resetUrl, expiresInMinutes }));
    const text = passwordResetPlainText({ firstName, resetUrl, expiresInMinutes });

    return sendEmail({
        to,
        subject: 'Reset your ChartSpark password',
        html,
        text,
    });
}

// =============================================
// LEGACY SENDER FUNCTIONS
// =============================================

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${APP_URL}/accept-invitation?token=${data.invitationToken}`;
    const expiresFormatted = data.expiresAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a2e4a; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">ChartSpark</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Clinical Documentation Platform</p>
  </div>

  <div style="background: #fafaf8; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1a2e4a; margin-top: 0;">You're Invited!</h2>

    <p style="color: #4a5568;">
      <strong>${data.inviterName}</strong> has invited you to join
      <strong>${data.organizationName}</strong> on ChartSpark as a <strong>${data.role}</strong>.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}"
         style="display: inline-block; background: #2a9d8f; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #94a3b8; font-size: 14px;">
      This invitation will expire on <strong>${expiresFormatted}</strong>.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
      <br><br>
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${inviteUrl}" style="color: #2a9d8f; word-break: break-all;">${inviteUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

    <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0;">
      ChartSpark — Secure Mental Health Records<br>
      Questions? Reply to this email or contact <a href="mailto:support@chartspark.io" style="color: #2a9d8f;">support@chartspark.io</a>
    </p>
  </div>
</body>
</html>
  `;

    const text = `
You're Invited to ChartSpark!

${data.inviterName} has invited you to join ${data.organizationName} on ChartSpark as a ${data.role}.

Accept your invitation by visiting:
${inviteUrl}

This invitation will expire on ${expiresFormatted}.

If you didn't expect this invitation, you can safely ignore this email.

ChartSpark — Secure Mental Health Records
Questions? Contact support@chartspark.io
  `;

    return sendEmail({
        to: data.recipientEmail,
        subject: `You're invited to join ${data.organizationName} on ChartSpark`,
        html,
        text,
    });
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
    return !!resend;
}
