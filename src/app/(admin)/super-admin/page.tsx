"use client";

import {
    Building2,
    Users,
    FileText,
    DollarSign,
    TrendingUp,
    Activity,
    ArrowRight,
    AlertTriangle,
    ShieldAlert,
} from "lucide-react";
import { platformBillingStats } from "@/lib/demo-data/billing";
import Link from "next/link";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default function SuperAdminDashboardPage() {
    const stats = platformBillingStats;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <ShieldAlert className="h-7 w-7 text-primary" />
                        SUPER ADMIN CONSOLE
                    </h1>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-[0.2em] opacity-70">
                        Platform Governance & Revenue Control
                    </p>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/50">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Hero Stats Section - WOW Factor */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Revenue Card */}
                        <div className="lg:col-span-2 relative overflow-hidden bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-primary/20">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">Platform Revenue (Live)</span>
                                </div>
                                <h2 className="text-5xl font-black tracking-tighter mb-2">
                                    {formatCurrency(stats.total_billing)}
                                </h2>
                                <div className="flex items-center gap-4 text-slate-400">
                                    <div className="flex items-center gap-1 font-bold text-sm">
                                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                                        <span className="text-emerald-400">+12.5%</span> this month
                                    </div>
                                    <span className="text-slate-600">|</span>
                                    <div className="text-sm font-medium">
                                        Avg. Fee yield: <span className="text-white">1.0%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Graph Element */}
                            <div className="absolute bottom-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                                <div className="absolute bottom-0 right-0 w-full h-2/3 bg-gradient-to-t from-primary to-transparent" style={{ clipPath: "polygon(0 100%, 15% 85%, 30% 90%, 45% 70%, 60% 75%, 75% 55%, 90% 60%, 100% 40%, 100% 100%)" }} />
                            </div>
                            <div className="absolute top-0 right-0 p-8">
                                <DollarSign className="h-12 w-12 text-white/10" />
                            </div>
                        </div>

                        {/* Fees Card */}
                        <div className="bg-emerald-500 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-500/20 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between items-start mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Fees Collected</span>
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                </div>
                                <h3 className="text-4xl font-black tracking-tighter">
                                    {formatCurrency(stats.total_fees_collected)}
                                </h3>
                                <p className="text-emerald-100/70 text-sm mt-1 font-medium italic">Net platform earnings</p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/20 flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-bold uppercase opacity-60">Success Rate</p>
                                    <p className="text-xl font-bold">99.8%</p>
                                </div>
                                <div className="h-10 w-24 bg-white/20 rounded-lg flex items-center justify-center font-black text-xs">
                                    OPTIMIZED
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Building2 className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.total_organizations}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Clinics</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Users className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.total_users}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Users</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <FileText className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.total_notes.toLocaleString()}</p>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes Generated</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Hub */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Link
                            href="/super-admin/organizations"
                            className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-xl bg-primary/10">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                Organizations
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Manage Clinical Entities
                            </p>
                        </Link>

                        <Link
                            href="/super-admin/users"
                            className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                                    <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                Global Users
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                RBAC & Authentication
                            </p>
                        </Link>

                        <Link
                            href="/super-admin/templates"
                            className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                                    <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                Global Templates
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                System-wide Clinical Forms
                            </p>
                        </Link>

                        <Link
                            href="/super-admin/fees"
                            className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                                    <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                                Platform Fees
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Revenue Configuration
                            </p>
                        </Link>
                    </div>

                    {/* Bottom Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="font-bold text-slate-900 dark:text-white">
                                    Top Organizations by Revenue
                                </h2>
                                <Link href="/super-admin/organizations" className="text-sm text-primary font-medium hover:underline">
                                    View All
                                </Link>
                            </div>
                            <table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Users</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notes</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Revenue</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fees</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {stats.organizations.slice(0, 5).map((org) => (
                                        <tr key={org.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {org.organization_name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{org.total_users}</td>
                                            <td className="px-6 py-4 text-slate-500">{org.total_notes}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(org.total_billing)}
                                            </td>
                                            <td className="px-6 py-4 text-emerald-600 font-medium">
                                                {formatCurrency(org.total_fees)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Alerts */}
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 flex items-start gap-4">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-900 dark:text-amber-300">DEMO MODE LIVE</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                                        You are viewing simulated platform data. Real-time hooks are currently throttled for the demo environment.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
