import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

// Force dynamic rendering - auditor pages need authentication at runtime
export const dynamic = 'force-dynamic';
import {
    LayoutDashboard,
    FileText,
    ClipboardCheck,
    BarChart3,
    Flag,
    Settings,
    User,
    Building2,
    PieChart,
    ShieldAlert,
    Database,
    Fingerprint,
    Layers,
    SearchCode,
    Activity,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";

const auditorNavItems = [
    { label: "General Dashboard", href: "/auditor", icon: LayoutDashboard },
    { label: "Submissions Queue", href: "/auditor/submissions", icon: ClipboardCheck },
    { label: "Notes Review", href: "/auditor/notes", icon: FileText },
    { label: "My Flags", href: "/auditor/flags", icon: Flag },
];

const financialNavItems = [
    { label: "Audit Overview", href: "/auditor/billing", icon: BarChart3 },
    { label: "Integrity Analytics", href: "/auditor/billing/analytics", icon: PieChart },
    { label: "Denial Forensics", href: "/auditor/billing/denials", icon: ShieldAlert },
    { label: "Fee Schedule Audit", href: "/auditor/billing/schedules", icon: Database },
    { label: "Matching Oversight", href: "/auditor/billing/era-audit", icon: Fingerprint },
    { label: "Benchmarking", href: "/auditor/billing/organizations", icon: Layers },
    { label: "Compliance Reports", href: "/auditor/reports", icon: Activity },
];

export default async function AuditorLayout({
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
                    .select("role, first_name, last_name, organization_id")
                    .eq("id", user.id)
                    .single();
                profile = profileData;

                // Authorization check - only AUDITOR and SUPER_ADMIN can access
                if (profile?.role !== 'AUDITOR' && profile?.role !== 'SUPER_ADMIN') {
                    redirect('/dashboard');
                }
            }
        } catch (e) {
            console.error("Supabase error in AuditorLayout:", e);
        }
    }

    const displayName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : user?.email || 'Auditor';

    return (
        <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            AUDITOR
                        </span>
                        <span className="text-xs text-slate-500">Read-Only Access</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clinical Oversight</p>
                        {auditorNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Financial Suite</p>
                        {financialNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Link
                            href="/auditor/settings"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Settings className="h-5 w-5" />
                            System Settings
                        </Link>
                    </div>
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <Link
                        href="/auditor/settings"
                        className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                    >
                        <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:ring-2 ring-amber-400 transition-all">
                            <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {displayName}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {user?.email}
                            </p>
                        </div>
                    </Link>
                    <LogoutButton />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
