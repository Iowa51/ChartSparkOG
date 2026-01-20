"use client";

import { useState } from "react";
import {
    Bell,
    CheckCircle,
    AlertCircle,
    MessageSquare,
    Calendar,
    UserPlus,
    CreditCard,
    FileText,
    Settings,
    Check,
    Trash2,
    Filter,
    Search
} from "lucide-react";

interface Notification {
    id: number;
    title: string;
    description: string;
    time: string;
    date: string;
    type: "system" | "patient" | "appointment" | "billing" | "document";
    read: boolean;
    icon: typeof Bell;
    color: string;
}

const allNotifications: Notification[] = [
    {
        id: 1,
        title: "New Patient Registered",
        description: "Sarah Johnson has been added to your patient roster. Complete their intake assessment when ready.",
        time: "5 min ago",
        date: "Today",
        type: "patient",
        read: false,
        icon: UserPlus,
        color: "text-blue-500 bg-blue-50 dark:bg-blue-950/50"
    },
    {
        id: 2,
        title: "Appointment Reminder",
        description: "Michael Chen's appointment is scheduled for 2:00 PM today. Review their notes before the session.",
        time: "1h ago",
        date: "Today",
        type: "appointment",
        read: false,
        icon: Calendar,
        color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"
    },
    {
        id: 3,
        title: "Billing Payment Received",
        description: "$450.00 payment received from Coastal Mental Health for claim #CLM-2024-0892.",
        time: "3h ago",
        date: "Today",
        type: "billing",
        read: false,
        icon: CreditCard,
        color: "text-amber-500 bg-amber-50 dark:bg-amber-950/50"
    },
    {
        id: 4,
        title: "AI System Update",
        description: "The Clinical AI Engine has been upgraded to version 2.4 with improved treatment plan recommendations and HIPAA compliance features.",
        time: "5h ago",
        date: "Today",
        type: "system",
        read: true,
        icon: Settings,
        color: "text-purple-500 bg-purple-50 dark:bg-purple-950/50"
    },
    {
        id: 5,
        title: "Document Ready for Review",
        description: "SOAP note for Lisa Anderson (Follow-up visit) has been generated and is ready for your review and signature.",
        time: "Yesterday",
        date: "Jan 19",
        type: "document",
        read: true,
        icon: FileText,
        color: "text-slate-500 bg-slate-50 dark:bg-slate-800/50"
    },
    {
        id: 6,
        title: "Appointment Cancelled",
        description: "James Wilson has cancelled their 11:30 AM appointment scheduled for tomorrow. The slot is now available.",
        time: "Yesterday",
        date: "Jan 19",
        type: "appointment",
        read: true,
        icon: Calendar,
        color: "text-red-500 bg-red-50 dark:bg-red-950/50"
    },
    {
        id: 7,
        title: "Treatment Plan Updated",
        description: "AI has generated an updated treatment plan for patient Robert Davis based on their latest PHQ-9 scores.",
        time: "2 days ago",
        date: "Jan 18",
        type: "document",
        read: true,
        icon: FileText,
        color: "text-primary bg-primary/10"
    },
    {
        id: 8,
        title: "New Message Received",
        description: "Dr. Emily Chen sent you a message regarding patient referral for Michael Thompson.",
        time: "2 days ago",
        date: "Jan 18",
        type: "system",
        read: true,
        icon: MessageSquare,
        color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50"
    }
];

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState(allNotifications);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredNotifications = notifications
        .filter(n => filter === "all" || !n.read)
        .filter(n =>
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
        const date = notification.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(notification);
        return acc;
    }, {} as Record<string, Notification[]>);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Bell className="h-5 w-5 text-primary" />
                        </div>
                        Activity Center
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        View all your notifications and activity history
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold">
                            {unreadCount} unread
                        </span>
                    )}
                    <button
                        onClick={markAllAsRead}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        Mark all as read
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as "all" | "unread")}
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All Notifications</option>
                        <option value="unread">Unread Only</option>
                    </select>
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-6">
                {Object.entries(groupedNotifications).length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            All caught up!
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            No notifications to show at this time.
                        </p>
                    </div>
                ) : (
                    Object.entries(groupedNotifications).map(([date, items]) => (
                        <div key={date}>
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 px-1">
                                {date}
                            </h2>
                            <div className="space-y-2">
                                {items.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${!notification.read ? "ring-2 ring-primary/20 bg-primary/5" : ""
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-xl shrink-0 ${notification.color} border border-current/10`}>
                                                <notification.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className={`text-sm font-bold text-slate-900 dark:text-white ${!notification.read ? "text-primary" : ""
                                                        }`}>
                                                        {notification.title}
                                                        {!notification.read && (
                                                            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />
                                                        )}
                                                    </h3>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                                        {notification.time}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                                    {notification.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
