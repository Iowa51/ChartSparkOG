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
    let user = null;
    let profile = null;

    if (supabase) {
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;

            if (user) {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();
                profile = profileData;
            }
        } catch (e) {
            console.error("Supabase error in AdminLayout:", e);
        }
    }

    // Fallback for demo if profiles missing or Supabase disabled
    const role = profile?.role || (user?.email === "admin@chartspark.io" ? "SUPER_ADMIN" : "ADMIN");

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
