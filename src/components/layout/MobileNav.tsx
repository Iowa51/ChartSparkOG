"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Menu,
    X,
    LayoutDashboard,
    Users,
    Calendar,
    CreditCard,
    FileText,
    Settings,
    Stethoscope,
    ClipboardList,
    BookOpen,
    Video,
    Pill,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    tier?: "starter" | "pro" | "complete";
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Patients", href: "/patients", icon: Users },
    { label: "Encounters", href: "/encounters", icon: ClipboardList },
    { label: "Templates", href: "/templates", icon: FileText },
    { label: "References", href: "/references", icon: BookOpen },
    { label: "Billing", href: "/billing", icon: CreditCard },
    { label: "Calendar", href: "/calendar", icon: Calendar, tier: "pro" },
    { label: "Telehealth", href: "/telehealth", icon: Video, tier: "pro" },
    { label: "E-Prescribe", href: "/e-prescribe", icon: Pill, tier: "complete" },
    { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted/50 transition-colors"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-out Navigation */}
            <aside
                className={cn(
                    "fixed top-0 left-0 h-full w-72 bg-surface border-r border-border z-50 transform transition-transform duration-300 lg:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                            <Stethoscope className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-foreground text-lg font-bold">ChartSpark</span>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation Items */}
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                    isActive
                                        ? "bg-accent text-accent-foreground font-bold"
                                        : "text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="text-sm">{item.label}</span>
                                {item.tier && (
                                    <span
                                        className={cn(
                                            "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                            item.tier === "pro"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                        )}
                                    >
                                        {item.tier.toUpperCase()}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            SK
                        </div>
                        <div className="flex flex-col">
                            <p className="text-foreground text-sm font-semibold">Dr. Sarah K.</p>
                            <p className="text-muted-foreground text-xs">View Profile</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
