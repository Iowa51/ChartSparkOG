import LoginPageClient, { type DemoCredential } from './LoginPageClient';

function getServerDemoModeEnabled(): boolean {
    const publicDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && publicDemoMode) {
        console.error('[SECURITY] NEXT_PUBLIC_DEMO_MODE is enabled in production. Demo mode has been forcibly disabled on the login page.');
        return false;
    }

    return publicDemoMode;
}

// SEC-AUDIT-2026-04-10: Demo credentials used to be hardcoded in
// LoginPageClient.tsx (email/password literals, including the "Demo123!!"
// password) and guarded only by a runtime flag. Moving them to env-driven
// config means:
//   1. No default password exists in application code / git history.
//   2. Production builds with NODE_ENV=production receive an empty array —
//      no credential string is ever shipped to the browser.
//   3. Local dev seeds these via DEMO_LOGIN_CREDENTIALS in .env.local.
//
// Expected env format (JSON, server-side only, never NEXT_PUBLIC_*):
//   DEMO_LOGIN_CREDENTIALS='[{"label":"Admin","email":"a@x","password":"..."}]'
function getServerDemoCredentials(): DemoCredential[] {
    if (process.env.NODE_ENV === 'production') return [];

    const raw = process.env.DEMO_LOGIN_CREDENTIALS;
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((entry): entry is DemoCredential =>
                entry &&
                typeof entry === 'object' &&
                typeof entry.label === 'string' &&
                typeof entry.email === 'string' &&
                typeof entry.password === 'string'
            );
    } catch {
        console.error('[SECURITY] DEMO_LOGIN_CREDENTIALS could not be parsed as JSON; ignoring.');
        return [];
    }
}

export default function LoginPage() {
    const demoModeEnabled = getServerDemoModeEnabled();
    const demoCredentials = demoModeEnabled ? getServerDemoCredentials() : [];

    return <LoginPageClient demoModeEnabled={demoModeEnabled} demoCredentials={demoCredentials} />;
}
