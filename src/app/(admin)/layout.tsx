import { AdminSidebar } from "@/components/admin";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DemoAuthGuard>
            <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
                <AdminSidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </main>
            </div>
        </DemoAuthGuard>
    );
}
