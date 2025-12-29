"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    Percent,
    Settings,
    ChevronLeft,
    Stethoscope,
    Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Organizations", href: "/admin/organizations", icon: Building2 },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Templates", href: "/admin/templates", icon: FileText },
    { label: "Platform Fees", href: "/admin/fees", icon: Percent },
    { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex flex-col w-60 bg-slate-900 text-white h-screen sticky top-0">
            <div className="p-6">
                <Link href="/admin" className="block mb-2 -ml-1">
                    <div className="relative h-12 w-full overflow-hidden">
                        <img
                            src="/ChartSparkLogo.png"
                            alt="ChartSpark"
                            className="absolute top-0 left-0 w-[140%] h-auto max-w-none -translate-x-4 -translate-y-1 brightness-0 invert"
                            style={{ clipPath: 'inset(0 0 38% 0)' }}
                        />
                    </div>
                </Link>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">
                    <Shield className="h-3 w-3 text-primary" />
                    <span>Admin Console</span>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                {adminNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm",
                                isActive
                                    ? "bg-primary text-white font-bold"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Back to App Link */}
            <div className="p-4 border-t border-slate-700">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back to ChartSpark App
                </Link>
            </div>

            {/* Admin Profile */}
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                        SA
                    </div>
                    <div className="flex flex-col">
                        <p className="text-white text-sm font-semibold">Super Admin</p>
                        <p className="text-slate-400 text-xs">admin@chartspark.io</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
