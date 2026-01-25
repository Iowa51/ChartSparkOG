"use client";

import { ArrowLeft, ExternalLink, Database, Users, Receipt, Shield, Server } from "lucide-react";
import Link from "next/link";

const QUICK_LINKS = [
    { name: "Clearinghouse Settings", href: "/super-admin/managed-billing/clearinghouse", icon: Database, description: "Configure clearinghouse connections" },
    { name: "User Management", href: "/super-admin/users", icon: Users, description: "Manage platform users" },
    { name: "Financial Overview", href: "/super-admin/financials", icon: Receipt, description: "View revenue and billing" },
    { name: "Audit Logs", href: "/super-admin/audit-logs", icon: Shield, description: "Review security events" },
];

export default function SettingsPage() {
    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/super-admin"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Platform Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Configure platform-wide settings and preferences
                    </p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUICK_LINKS.map((link) => {
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center group-hover:bg-teal-200 dark:group-hover:bg-teal-900/60 transition-colors">
                                        <Icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900 dark:text-white">{link.name}</p>
                                        <p className="text-sm text-slate-500">{link.description}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* System Information */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Server className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-slate-500 mb-1">Platform Version</p>
                        <p className="font-medium text-slate-900 dark:text-white">ChartSpark v2.1.0</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-slate-500 mb-1">Environment</p>
                        <p className="font-medium text-slate-900 dark:text-white">Production</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-slate-500 mb-1">Last Updated</p>
                        <p className="font-medium text-slate-900 dark:text-white">Jan 25, 2026</p>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                    Additional configuration is managed through environment variables. Contact your system administrator for advanced settings.
                </p>
            </div>
        </div>
    );
}
