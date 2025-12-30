"use client";

import { Menu, Bell, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface HeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: { label: string; href?: string }[];
    actions?: React.ReactNode;
}

export function Header({ title, description, breadcrumbs, actions }: HeaderProps) {
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border px-6 py-4 lg:px-10 shadow-sm">
            <div className="max-w-7xl mx-auto w-full">
                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 text-sm">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={index} className="flex items-center gap-2">
                                {index > 0 && (
                                    <span className="text-border">/</span>
                                )}
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-primary font-medium">{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {/* Title Row */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-muted-foreground text-base mt-1">{description}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mobile menu toggle */}
                        <button className="flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted/50 transition-colors lg:hidden">
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Notifications */}
                        <div className="relative" id="notifications-menu" ref={notificationRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNotifications(!showNotifications);
                                }}
                                className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-all shadow-sm ${showNotifications ? 'bg-primary text-primary-foreground scale-105' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/50'}`}
                            >
                                <Bell className="h-5 w-5" />
                                <span className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full ring-2 ring-surface transition-colors ${showNotifications ? 'bg-white' : 'bg-red-500'}`} />
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ring-1 ring-black/5">
                                    <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70">Notifications</h3>
                                        <button className="text-[10px] text-primary font-black uppercase tracking-wider hover:underline">Mark all as read</button>
                                    </div>
                                    <div className="max-h-[380px] overflow-y-auto divide-y divide-border custom-scrollbar">
                                        {[
                                            { id: 1, title: "New Patient Registered", desc: "Sarah Johnson", time: "5 min ago", icon: AlertCircle, color: "text-blue-500 bg-blue-50" },
                                            { id: 2, title: "Appointment Reminder", desc: "Michael Chen at 2:00 PM today", time: "1h ago", icon: CheckCircle, color: "text-emerald-500 bg-emerald-50" },
                                            { id: 3, title: "Billing Payment Received", desc: "$450.00 - Coastal Mental Health", time: "3h ago", icon: MessageSquare, color: "text-amber-500 bg-amber-50" },
                                            { id: 4, title: "System Update", desc: "AI Engine upgraded to v2.4 (Clinical Compliance focus)", time: "5h ago", icon: Bell, color: "text-primary bg-primary/5" },
                                        ].map((n) => (
                                            <div key={n.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                                                <div className="flex gap-4">
                                                    <div className={`p-2.5 rounded-xl shrink-0 ${n.color} dark:bg-opacity-10 border border-current/10 shadow-sm`}>
                                                        <n.icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate uppercase tracking-tight">{n.title}</p>
                                                            <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">{n.time}</span>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 font-medium">{n.desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 border-t border-border bg-muted/10">
                                        <Link href="/notifications" className="block w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-center text-primary hover:bg-primary/5 transition-colors rounded-lg">
                                            View all activity
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom actions */}
                        {actions}
                    </div>
                </div>
            </div>
        </header>
    );
}
