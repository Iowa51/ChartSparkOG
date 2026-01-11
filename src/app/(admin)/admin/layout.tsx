import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-slate-800">
                    <Link href="/admin" className="block">
                        <img
                            src="/ChartSparkLogo.png"
                            alt="ChartSpark"
                            className="h-10 w-auto"
                            style={{ filter: "brightness(0) invert(1)" }}
                        />
                    </Link>
                    <div className="mt-3">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-600 text-white">
                            ADMIN
                        </span>
                    </div>
                    {organization && (
                        <div className="mt-3 flex items-center gap-2 text-slate-400">
                            <Building2 className="h-4 w-4" />
                            <span className="text-sm truncate">{organization.name}</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {adminNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Back to App */}
                <div className="p-4 border-t border-slate-800">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back to ChartSpark App
                    </Link>
                </div>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {displayName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                                {profile?.role}
                            </p>
                        </div>
                    </div>
                    <form action="/api/auth/signout" method="POST">
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
