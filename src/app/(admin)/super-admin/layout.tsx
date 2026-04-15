import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering - super-admin pages need authentication at runtime
export const dynamic = 'force-dynamic';
import {
    LayoutDashboard,
    Building2,
    Users,
    UserCheck,
    DollarSign,
    Percent,
    ClipboardList,
    Settings,
    LogOut,
    User,
    ChevronLeft,
} from "lucide-react";

const superAdminNavItems = [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/super-admin/organizations", icon: Building2 },
    { label: "Users", href: "/super-admin/users", icon: Users },
    { label: "Auditors", href: "/super-admin/auditors", icon: UserCheck },
    { label: "Financials", href: "/super-admin/financials", icon: DollarSign },
    { label: "Platform Fees", href: "/super-admin/fees", icon: Percent },
    { label: "Audit Logs", href: "/super-admin/audit-logs", icon: ClipboardList },
    { label: "Settings", href: "/super-admin/settings", icon: Settings },
];

export default async function SuperAdminLayout({
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
                    .from("users")
                    .select("role, first_name, last_name")
                    .eq("id", user.id)
                    .single();
                profile = profileData;
            }
        } catch (e) {
            console.error("Supabase error in SuperAdminLayout:", e);
        }
    }

    // Authorization check - only SUPER_ADMIN can access
    if (profile && profile.role !== 'SUPER_ADMIN') {
        if (profile.role === 'ADMIN') {
            redirect('/admin');
        } else if (profile.role === 'AUDITOR') {
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
        : user?.email || 'Super Admin';

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar role="SUPER_ADMIN" context="super-admin" />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
                {children}
            </main>
        </div>
    );
}
