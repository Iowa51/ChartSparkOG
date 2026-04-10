/**
 * Renders all three email templates to standalone HTML files in /email-previews/.
 * Run with: npx tsx scripts/preview-emails.tsx
 * Then open the HTML files in your browser.
 */

import { render } from '@react-email/render';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

import WelcomeEmail from '../src/lib/email/templates/welcome';
import MFACodeEmail from '../src/lib/email/templates/mfa-code';
import PasswordResetEmail from '../src/lib/email/templates/password-reset';

const outDir = join(__dirname, '..', 'email-previews');
mkdirSync(outDir, { recursive: true });

async function main() {
    const templates = [
        {
            name: 'welcome',
            element: WelcomeEmail({
                firstName: 'Sarah',
                organizationName: 'Lakeshore Behavioral Health',
                loginUrl: 'https://app.chartspark.io/login',
            }),
        },
        {
            name: 'mfa-code',
            element: MFACodeEmail({
                firstName: 'Sarah',
                code: '847 291',
                expiresInMinutes: 10,
            }),
        },
        {
            name: 'password-reset',
            element: PasswordResetEmail({
                firstName: 'Sarah',
                resetUrl: 'https://app.chartspark.io/reset-password?token=abc123',
                expiresInMinutes: 60,
            }),
        },
    ];

    for (const t of templates) {
        const html = await render(t.element);
        const filePath = join(outDir, `${t.name}.html`);
        writeFileSync(filePath, html, 'utf-8');
        console.log(`  -> ${filePath}`);
    }

    console.log('\nDone! Open the HTML files in your browser to preview.');
}

main().catch(console.error);
