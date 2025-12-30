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
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${showNotifications ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                            >
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface" />
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                                        <h3 className="text-sm font-bold">Notifications</h3>
                                        <button className="text-[10px] text-primary font-bold hover:underline">Mark all as read</button>
                                    </div>
                                    <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                                        {[
                                            { id: 1, title: "New Lab Results", desc: "John Doe's metabolic panel is ready for review.", time: "10m ago", icon: AlertCircle, color: "text-amber-500 bg-amber-50" },
                                            { id: 2, title: "Note Signed", desc: "Your note for Maria Rodriguez has been electronically signed.", time: "1h ago", icon: CheckCircle, color: "text-emerald-500 bg-emerald-50" },
                                            { id: 3, title: "New Message", desc: "You have a new secure message from Sarah (Admin).", time: "3h ago", icon: MessageSquare, color: "text-blue-500 bg-blue-50" },
                                        ].map((n) => (
                                            <div key={n.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                                                <div className="flex gap-3">
                                                    <div className={`p-2 rounded-lg shrink-0 ${n.color} dark:bg-opacity-10`}>
                                                        <n.icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{n.title}</p>
                                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{n.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 border-t border-border bg-muted/10 text-center">
                                        <Link href="/notifications" className="text-xs font-bold text-primary hover:underline">View all notifications</Link>
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
