import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering - admin pages need authentication at runtime
export const dynamic = 'force-dynamic';
import {
    LayoutDashboard,
    Users,
    FileText,
    Zap,
    MessageSquare,
    Settings,
    LogOut,
    User,
    ChevronLeft,
    Building2,
} from "lucide-react";

const adminNavItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Submissions", href: "/admin/submissions", icon: FileText },
    { label: "Features", href: "/admin/features", icon: Zap },
    { label: "Auditor Notes", href: "/admin/auditor-notes", icon: MessageSquare },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    let user = null;
    let profile = null;
    let organization = null;

    if (supabase) {
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;

            if (user) {
                const { data: profileData } = await supabase
                    .from("users")
                    .select("role, first_name, last_name, organization_id")
                    .eq("id", user.id)
                    .single();
                profile = profileData;

                // Get organization info
                if (profileData?.organization_id) {
                    const { data: orgData } = await supabase
                        .from("organizations")
                        .select("id, name, subscription_tier")
                        .eq("id", profileData.organization_id)
                        .single();
                    organization = orgData;
                }
            }
        } catch (e) {
            console.error("Supabase error in AdminLayout:", e);
        }
    }

    // Authorization check - ADMIN and SUPER_ADMIN can access
    if (profile && profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
        if (profile.role === 'AUDITOR') {
            redirect('/auditor');
        } else {
            redirect('/dashboard');
        }
    }

    // If no user at all, redirect to login
    if (!user) {
        redirect('/login');
    }

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.email || 'Admin';

    return (
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar role="ADMIN" context="admin" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
