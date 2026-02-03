import { Sidebar } from "@/components/layout";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { SessionTimeout } from "@/components/SessionTimeout";
import { TrialBanner } from "@/components/subscriptions/trial-banner";
import { ReadOnlyBanner } from "@/components/subscriptions/read-only-banner";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Phase 2: Session timeout always enabled for HIPAA compliance
    const enableTimeout = true;

    return (
        <DemoAuthGuard>
            <TrialBanner />
            <ReadOnlyBanner />
            <div className="min-h-screen flex bg-background">
                <Sidebar />
                <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                    {children}
                </main>
            </div>
            <SessionTimeout enabled={enableTimeout} />
        </DemoAuthGuard>
    );
}
