import LoginPageClient from './LoginPageClient';

function getServerDemoModeEnabled(): boolean {
    const publicDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && publicDemoMode) {
        console.error('[SECURITY] NEXT_PUBLIC_DEMO_MODE is enabled in production. Demo mode has been forcibly disabled on the login page.');
        return false;
    }

    return publicDemoMode;
}

export default function LoginPage() {
    const demoModeEnabled = getServerDemoModeEnabled();

    return <LoginPageClient demoModeEnabled={demoModeEnabled} />;
}
