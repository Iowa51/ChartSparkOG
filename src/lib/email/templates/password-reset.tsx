import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Hr,
    Link,
    Preview,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
    firstName: string;
    resetUrl: string;
    expiresInMinutes: number;
}

const colors = {
    navy: '#1a2e4a',
    background: '#fafaf8',
    teal: '#2a9d8f',
    bodyText: '#4a5568',
    muted: '#94a3b8',
    border: '#e2e8f0',
};

export default function PasswordResetEmail({
    firstName,
    resetUrl,
    expiresInMinutes,
}: PasswordResetEmailProps) {
    return (
        <Html lang="en">
            <Head />
            <Preview>Reset your ChartSpark password</Preview>
            <Body style={body}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Text style={wordmark}>ChartSpark</Text>
                    </Section>

                    {/* Content */}
                    <Section style={content}>
                        <Text style={heading}>Password reset request</Text>

                        <Text style={paragraph}>
                            Hi {firstName}, we received a request to reset your
                            ChartSpark password. Click the button below to choose a
                            new password.
                        </Text>

                        <Section style={ctaContainer}>
                            <Button style={ctaButton} href={resetUrl}>
                                Reset My Password
                            </Button>
                        </Section>

                        <Text style={expiry}>
                            This link expires in {expiresInMinutes} minutes.
                        </Text>

                        <Text style={securityNote}>
                            If you did not request a password reset, you can safely
                            ignore this email. Your password will not change unless
                            you click the link above.
                        </Text>

                        <Hr style={divider} />

                        <Text style={footer}>
                            ChartSpark — Secure Mental Health Records
                            <br />
                            Questions? Reply to this email or contact{' '}
                            <Link href="mailto:support@chartspark.io" style={link}>
                                support@chartspark.io
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

export function passwordResetPlainText({
    firstName,
    resetUrl,
    expiresInMinutes,
}: PasswordResetEmailProps): string {
    return `Hi ${firstName},

We received a request to reset your ChartSpark password.

Reset your password here: ${resetUrl}

This link expires in ${expiresInMinutes} minutes.

If you did not request this, you can safely ignore this email.

ChartSpark — Secure Mental Health Records
Questions? Contact support@chartspark.io`;
}

// Styles
const body: React.CSSProperties = {
    backgroundColor: '#f1f0ee',
    fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    margin: 0,
    padding: '40px 0',
};

const container: React.CSSProperties = {
    maxWidth: '560px',
    margin: '0 auto',
};

const header: React.CSSProperties = {
    backgroundColor: colors.navy,
    padding: '32px 40px',
    borderRadius: '12px 12px 0 0',
    textAlign: 'center' as const,
};

const wordmark: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    margin: 0,
};

const content: React.CSSProperties = {
    backgroundColor: colors.background,
    padding: '40px',
    border: `1px solid ${colors.border}`,
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
};

const heading: React.CSSProperties = {
    color: colors.navy,
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '32px',
    margin: '0 0 20px',
};

const paragraph: React.CSSProperties = {
    color: colors.bodyText,
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 28px',
};

const ctaContainer: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const ctaButton: React.CSSProperties = {
    backgroundColor: colors.teal,
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
};

const expiry: React.CSSProperties = {
    color: colors.bodyText,
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
};

const securityNote: React.CSSProperties = {
    color: colors.muted,
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
};

const divider: React.CSSProperties = {
    borderColor: colors.border,
    margin: '28px 0',
};

const footer: React.CSSProperties = {
    color: colors.muted,
    fontSize: '13px',
    lineHeight: '20px',
    margin: 0,
    textAlign: 'center' as const,
};

const link: React.CSSProperties = {
    color: colors.teal,
    textDecoration: 'underline',
};
