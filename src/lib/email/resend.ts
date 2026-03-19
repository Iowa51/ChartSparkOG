import { Resend } from 'resend';
import { logWarn, logError, logInfo, sanitizeError } from '@/lib/logging/safe-logger';

// Initialize Resend with API key
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ChartSpark <noreply@chartspark.app>';
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
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">ChartSpark</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Clinical Documentation Platform</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">You're Invited!</h2>
    
    <p style="color: #475569;">
      <strong>${data.inviterName}</strong> has invited you to join 
      <strong>${data.organizationName}</strong> on ChartSpark as a <strong>${data.role}</strong>.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      This invitation will expire on <strong>${expiresFormatted}</strong>.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
      If you didn't expect this invitation, you can safely ignore this email.
      <br><br>
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${inviteUrl}" style="color: #0ea5e9; word-break: break-all;">${inviteUrl}</a>
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
  `;

    return sendEmail({
        to: data.recipientEmail,
        subject: `You're invited to join ${data.organizationName} on ChartSpark`,
        html,
        text,
    });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    resetToken: string
): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">ChartSpark</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">Reset Your Password</h2>
    
    <p style="color: #475569;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      This link will expire in 1 hour.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `;

    return sendEmail({
        to: email,
        subject: 'Reset your ChartSpark password',
        html,
    });
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
    return !!resend;
}
