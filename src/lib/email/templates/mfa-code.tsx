import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Hr,
    Link,
    Preview,
} from '@react-email/components';
import * as React from 'react';

interface MFACodeEmailProps {
    firstName: string;
    code: string;
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

export default function MFACodeEmail({
    firstName,
    code,
    expiresInMinutes,
}: MFACodeEmailProps) {
    return (
        <Html lang="en">
            <Head />
            <Preview>Your ChartSpark verification code: {code}</Preview>
            <Body style={body}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <Text style={wordmark}>ChartSpark</Text>
                    </Section>

                    {/* Content */}
                    <Section style={content}>
                        <Text style={heading}>Your verification code</Text>

                        <Text style={greeting}>Hi {firstName},</Text>

                        <Section style={codeContainer}>
                            <Text style={codeText}>{code}</Text>
                        </Section>

                        <Text style={expiry}>
                            This code expires in {expiresInMinutes} minutes.
                        </Text>

                        <Text style={securityNote}>
                            If you did not request this code, your account may be at
                            risk. Contact{' '}
                            <Link href="mailto:support@chartspark.io" style={link}>
                                support@chartspark.io
                            </Link>{' '}
                            immediately and do not share this code with anyone.
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

export function mfaCodePlainText({
    firstName,
    code,
    expiresInMinutes,
}: MFACodeEmailProps): string {
    return `Hi ${firstName},

Your ChartSpark verification code is: ${code}

This code expires in ${expiresInMinutes} minutes.

If you did not request this code, contact support@chartspark.io immediately. Do not share this code with anyone.

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
    margin: '0 0 8px',
};

const greeting: React.CSSProperties = {
    color: colors.bodyText,
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 24px',
};

const codeContainer: React.CSSProperties = {
    backgroundColor: colors.navy,
    borderRadius: '10px',
    padding: '24px',
    textAlign: 'center' as const,
    margin: '0 0 20px',
};

const codeText: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '36px',
    fontWeight: 700,
    fontFamily: "'Courier New', Courier, monospace",
    letterSpacing: '8px',
    margin: 0,
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
