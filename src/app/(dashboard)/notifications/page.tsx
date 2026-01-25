/**
 * Notification Center Page
 * Phase 3: Notification Center
 * Path: /notifications
 * 
 * Central hub for all user notifications:
 * - System alerts
 * - Pending approvals
 * - Security warnings
 * - Team updates
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    Bell,
    Check,
    CheckCheck,
    AlertTriangle,
    Info,
    Shield,
    FileText,
    Users,
    Clock,
    Trash2,
    Filter,
    Loader2,
    RefreshCw,
    X,
    ExternalLink,
} from 'lucide-react';

interface Notification {
    id: string;
    type: 'info' | 'warning' | 'success' | 'security' | 'approval' | 'team';
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

// Demo notifications until backend is fully wired
const DEMO_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'security',
        title: 'MFA Required',
        message: 'Multi-factor authentication is now required for admin accounts. Please enable MFA in your security settings.',
        link: '/settings/security/mfa',
        is_read: false,
        created_at: new Date().toISOString(),
    },
    {
        id: '2',
        type: 'approval',
        title: 'Pending Submissions',
        message: 'You have submissions awaiting review.',
        link: '/admin/submissions',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: '3',
        type: 'info',
        title: 'New Features Available',
        message: 'Check out the new Provider Analytics dashboard for team productivity metrics.',
        link: '/admin/analytics',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: '4',
        type: 'team',
        title: 'Team Update',
        message: 'A new user has been invited to join your organization.',
        link: '/admin/invitations',
        is_read: true,
        created_at: new Date(Date.now() - 172800000).toISOString(),
    },
];

const TYPE_CONFIG = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    success: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    security: { icon: Shield, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    approval: { icon: FileText, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    team: { icon: Users, color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' },
};

export default function NotificationCenterPage() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, is_read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        if (confirm('Clear all notifications?')) {
            setNotifications([]);
        }
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Bell className="h-6 w-6 text-teal-600" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-sm font-bold bg-red-500 text-white rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">Stay updated on important activities</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Mark all read
                    </button>
                    <button
                        onClick={clearAll}
                        disabled={notifications.length === 0}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear all
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                >
                    All ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'unread'
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                >
                    Unread ({unreadCount})
                </button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                        <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => {
                        const config = TYPE_CONFIG[notification.type];
                        const Icon = config.icon;

                        return (
                            <div
                                key={notification.id}
                                className={`bg-white dark:bg-slate-900 rounded-xl border p-4 transition-all ${notification.is_read
                                        ? 'border-slate-200 dark:border-slate-800'
                                        : 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-lg ${config.bg}`}>
                                        <Icon className={`h-5 w-5 ${config.color}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`font-semibold ${notification.is_read
                                                    ? 'text-slate-700 dark:text-slate-300'
                                                    : 'text-slate-900 dark:text-white'
                                                }`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTime(notification.created_at)}
                                            </span>
                                            {notification.link && (
                                                <Link
                                                    href={notification.link}
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                                                >
                                                    View details
                                                    <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                                title="Mark as read"
                                            >
                                                <Check className="h-4 w-4 text-slate-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification.id)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            title="Delete"
                                        >
                                            <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Info Banner */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Pro Tip:</strong> Enable browser notifications in your settings to receive
                            real-time alerts for pending approvals and security events.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
