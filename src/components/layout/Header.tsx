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
    const [notifications, setNotifications] = useState<any[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Sync notifications with localStorage
    useEffect(() => {
        const loadNotifications = () => {
            const saved = localStorage.getItem('cs_notifications');
            if (saved) {
                try { setNotifications(JSON.parse(saved)); } catch (e) { }
            }
        };

        loadNotifications();
        // Custom event to listen for updates from other pages
        window.addEventListener('notificationsUpdated', loadNotifications);
        return () => window.removeEventListener('notificationsUpdated', loadNotifications);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: number) => {
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(updated);
        localStorage.setItem('cs_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('notificationsUpdated'));
    };

    const handleMarkAllRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        localStorage.setItem('cs_notifications', JSON.stringify(updated));
        window.dispatchEvent(new Event('notificationsUpdated'));
    };

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
                    <div className="flex items-start gap-4 flex-1">
                        <div>
                            <h1 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-muted-foreground text-base mt-1">{description}</p>
                            )}
                        </div>
                        <img
                            src="/assets/logo.svg"
                            alt="ChartSpark"
                            className="h-24 w-auto hidden lg:block ml-auto"
                        />
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
                                {unreadCount > 0 && (
                                    <span className={`absolute top-2.5 right-2.5 h-2 w-2 rounded-full ring-2 ring-surface transition-colors ${showNotifications ? 'bg-white' : 'bg-red-500'}`} />
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ring-1 ring-black/5">
                                    <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70">Notifications</h3>
                                        <button
                                            onClick={handleMarkAllRead}
                                            disabled={unreadCount === 0}
                                            className="text-[10px] text-primary font-black uppercase tracking-wider hover:underline disabled:opacity-50 disabled:no-underline"
                                        >
                                            Mark all as read
                                        </button>
                                    </div>
                                    <div className="max-h-[380px] overflow-y-auto divide-y divide-border custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="py-12 px-4 text-center">
                                                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                                                <p className="text-xs font-bold text-muted-foreground">All caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((n) => {
                                                const Icon = Bell; // Use generic Bell or better icon mapping logic
                                                return (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => {
                                                            handleMarkAsRead(n.id);
                                                            if (n.link) window.location.href = n.link;
                                                        }}
                                                        className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer group ${!n.read ? 'bg-primary/5' : ''}`}
                                                    >
                                                        <div className="flex gap-4">
                                                            <div className={`p-2.5 rounded-xl shrink-0 ${n.color || 'text-primary bg-primary/5'} dark:bg-opacity-10 border border-current/10 shadow-sm`}>
                                                                <Bell className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <p className={`text-xs font-black group-hover:text-primary transition-colors truncate uppercase tracking-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                                                                    <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">{n.time}</span>
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 font-medium">{n.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="px-4 py-3 border-t border-border bg-muted/10">
                                        <Link
                                            href="/notifications"
                                            onClick={() => setShowNotifications(false)}
                                            className="block w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-center text-primary hover:bg-primary/5 transition-colors rounded-lg"
                                        >
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
