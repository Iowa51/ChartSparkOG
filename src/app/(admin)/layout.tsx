import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";

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
    return (
        <DemoAuthGuard>
            {children}
        </DemoAuthGuard>
    );
}
