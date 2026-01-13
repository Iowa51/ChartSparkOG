import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { SessionTimeout } from "@/components/SessionTimeout";

/**
 * Parent layout for admin route group.
 * Note: Individual child layouts (admin/layout.tsx, super-admin/layout.tsx) 
 * provide their own context-specific sidebars. This parent layout only 
 * provides the DemoAuthGuard wrapper to avoid duplicated sidebars.
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const enableTimeout = process.env.NEXT_PUBLIC_DEMO_MODE !== 'true';

    return (
        <DemoAuthGuard>
            {children}
            <SessionTimeout enabled={enableTimeout} />
        </DemoAuthGuard>
    );
}

