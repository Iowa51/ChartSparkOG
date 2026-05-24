import { Sidebar } from "@/components/layout";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { MFAGate } from "@/components/auth/MFAGate";
import { SessionTimeout } from "@/components/SessionTimeout";
import { TrialBanner } from "@/components/subscriptions/trial-banner";
import { ReadOnlyBanner } from "@/components/subscriptions/read-only-banner";
import { PilotReadOnlyBanner } from "@/components/pilot/pilot-readonly-banner-server";
import { ToastProvider } from "@/components/ui/toast";
import { CSShell } from "@/components/cs";

// Force dynamic rendering - app pages require authentication at runtime
export const dynamic = 'force-dynamic';

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Phase 2: Session timeout always enabled for HIPAA compliance
    const enableTimeout = true;

    return (
        <ToastProvider>
            <DemoAuthGuard>
                <PilotReadOnlyBanner />
                <TrialBanner />
                <ReadOnlyBanner />
                <CSShell sidebar={<Sidebar />}>
                    {children}
                </CSShell>
                <SessionTimeout enabled={enableTimeout} />
                <MFAGate />
            </DemoAuthGuard>
        </ToastProvider>
    );
}
