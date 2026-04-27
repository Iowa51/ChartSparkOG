import { Sidebar } from "@/components/layout";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { MFAGate } from "@/components/auth/MFAGate";
import { SessionTimeout } from "@/components/SessionTimeout";
import { TrialBanner } from "@/components/subscriptions/trial-banner";
import { ReadOnlyBanner } from "@/components/subscriptions/read-only-banner";
import { PilotReadOnlyBanner } from "@/components/pilot/pilot-readonly-banner-server";
import { ToastProvider } from "@/components/ui/toast";

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
                <div className="min-h-screen flex bg-background">
                    <Sidebar />
                    <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                        {children}
                    </main>
                </div>
                <SessionTimeout enabled={enableTimeout} />
                <MFAGate />
            </DemoAuthGuard>
        </ToastProvider>
    );
}
