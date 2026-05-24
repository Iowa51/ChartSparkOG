"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    ClipboardCheck,
    BarChart3,
    Flag,
    Settings,
    PieChart,
    ShieldAlert,
    Database,
    Fingerprint,
    Layers,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface AuditorSidebarNavProps {
    displayName: string;
    email: string;
    initials: string;
}

function NavLink({ href, label, Icon, isActive }: { href: string; label: string; Icon: React.ComponentType<{ className?: string }>; isActive: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                    ? "bg-[var(--cs-teal-light)] text-[var(--cs-teal)] border-l-[3px] border-[var(--cs-teal)]"
                    : "text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)]"
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
        </Link>
    );
}

export function AuditorSidebarNav({ displayName, email, initials }: AuditorSidebarNavProps) {
    const pathname = usePathname();
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

    return (
        <div className="flex flex-col w-full h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--cs-border)]">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--cs-coral-light)] text-[var(--cs-coral)]">
                        Auditor
                    </span>
                    <span className="text-xs text-[var(--cs-text-muted)]">Read-Only Access</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
                <div className="flex flex-col gap-0.5">
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--cs-text-muted)] mb-1.5">
                        Clinical Oversight
                    </p>
                    {auditorNavItems.map((item) => (
                        <NavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            Icon={item.icon}
                            isActive={isActive(item.href)}
                        />
                    ))}
                </div>

                <div className="flex flex-col gap-0.5">
                    <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--cs-text-muted)] mb-1.5">
                        Financial Suite
                    </p>
                    {financialNavItems.map((item) => (
                        <NavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            Icon={item.icon}
                            isActive={isActive(item.href)}
                        />
                    ))}
                </div>

                <div className="pt-3 border-t border-[var(--cs-border)]">
                    <NavLink
                        href="/auditor/settings"
                        label="System Settings"
                        Icon={Settings}
                        isActive={isActive("/auditor/settings")}
                    />
                </div>
            </nav>

            {/* User Profile & Logout */}
            <div className="p-3 border-t border-[var(--cs-border)]">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="h-8 w-8 rounded-full bg-[var(--cs-coral)] flex items-center justify-center text-white text-xs font-semibold">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--cs-text-primary)] truncate">
                            {displayName}
                        </p>
                        <p className="text-xs text-[var(--cs-text-muted)] truncate">
                            {email}
                        </p>
                    </div>
                </div>
                {/* NOTE: LogoutButton retains its legacy red styling — kept untouched
                    in Phase 3 because it lives next to auth/Supabase code. Restyle in
                    a follow-up alongside any other auth-component refresh. */}
                <LogoutButton />
            </div>
        </div>
    );
}
