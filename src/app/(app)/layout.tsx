import { Sidebar } from "@/components/layout";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { SessionTimeout } from "@/components/SessionTimeout";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only enable session timeout in production (when not in demo mode)
    const enableTimeout = process.env.NEXT_PUBLIC_DEMO_MODE !== 'true';

    return (
        <DemoAuthGuard>
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
