import { AdminSidebar } from "@/components/admin";
import { DemoAuthGuard } from "@/components/auth/DemoAuthGuard";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch role from profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

    // Fallback for demo if profiles missing
    const role = profile?.role || (user?.email === "admin@chartspark.com" ? "SUPER_ADMIN" : "ADMIN");

    // Determine context from URL (using headers since we are in asServerComponent)
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") || "";
    const context = pathname.includes("/super-admin") ? "super-admin" : "admin";

    return (
        <DemoAuthGuard>
            <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
                <AdminSidebar role={role} context={context} />
                <main className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </main>
            </div>
        </DemoAuthGuard>
    );
}
