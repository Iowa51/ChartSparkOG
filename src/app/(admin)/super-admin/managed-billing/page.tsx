/**
 * Super Admin: Managed Billing Dashboard
 * Main overview of claims, ERA files, and billing status
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    FileText,
    DollarSign,
    AlertCircle,
    Settings,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    Send
} from 'lucide-react';

interface DashboardStats {
    totalClaims: number;
    pendingClaims: number;
    submittedClaims: number;
    paidClaims: number;
    rejectedClaims: number;
    totalBilled: number;
    totalPaid: number;
    totalPending: number;
    eraFilesReceived: number;
    unmatchedPayments: number;
}

const DEMO_STATS: DashboardStats = {
    totalClaims: 1247,
    pendingClaims: 89,
    submittedClaims: 156,
    paidClaims: 892,
    rejectedClaims: 23,
    totalBilled: 487500,
    totalPaid: 412350,
    totalPending: 75150,
    eraFilesReceived: 34,
    unmatchedPayments: 7,
};

export default function ManagedBillingDashboard() {
    const [stats, setStats] = useState<DashboardStats>(DEMO_STATS);
    const [loading, setLoading] = useState(false);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const statCards = [
        {
            title: 'Total Claims',
            value: stats.totalClaims.toLocaleString(),
            icon: FileText,
            color: 'bg-blue-500',
            href: '/super-admin/managed-billing/claims',
        },
        {
            title: 'Pending Submission',
            value: stats.pendingClaims.toLocaleString(),
            icon: Clock,
            color: 'bg-yellow-500',
            href: '/super-admin/managed-billing/claims?status=pending',
        },
        {
            title: 'Submitted',
            value: stats.submittedClaims.toLocaleString(),
            icon: Send,
            color: 'bg-purple-500',
            href: '/super-admin/managed-billing/claims?status=submitted',
        },
        {
            title: 'Paid',
            value: stats.paidClaims.toLocaleString(),
            icon: CheckCircle,
            color: 'bg-green-500',
            href: '/super-admin/managed-billing/claims?status=paid',
        },
        {
            title: 'Rejected',
            value: stats.rejectedClaims.toLocaleString(),
            icon: XCircle,
            color: 'bg-red-500',
            href: '/super-admin/managed-billing/claims?status=rejected',
        },
        {
            title: 'Unmatched Payments',
            value: stats.unmatchedPayments.toLocaleString(),
            icon: AlertCircle,
            color: 'bg-orange-500',
            href: '/super-admin/managed-billing/unmatched',
        },
    ];

    const financialCards = [
        {
            title: 'Total Billed',
            value: formatCurrency(stats.totalBilled),
            subtitle: 'All submitted claims',
            color: 'text-blue-600',
        },
        {
            title: 'Total Collected',
            value: formatCurrency(stats.totalPaid),
            subtitle: 'Payments received',
            color: 'text-green-600',
        },
        {
            title: 'Outstanding',
            value: formatCurrency(stats.totalPending),
            subtitle: 'Awaiting payment',
            color: 'text-yellow-600',
        },
    ];

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/super-admin"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Managed Billing
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Claims processing and payment tracking
                        </p>
                    </div>
                </div>
                <Link
                    href="/super-admin/managed-billing/clearinghouse"
                    className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Clearinghouse Settings
                </Link>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {financialCards.map((card) => (
                    <div
                        key={card.title}
                        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                    >
                        <p className="text-sm text-slate-500 dark:text-slate-400">{card.title}</p>
                        <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                    </div>
                ))}
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all group"
                        >
                            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
                                <Icon className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {card.value}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-teal-600 transition-colors">
                                {card.title}
                            </p>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        href="/super-admin/managed-billing/claims"
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <FileText className="w-5 h-5 text-teal-600" />
                        <span className="font-medium">View All Claims</span>
                    </Link>
                    <Link
                        href="/super-admin/managed-billing/era"
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="font-medium">ERA Payments</span>
                    </Link>
                    <Link
                        href="/super-admin/managed-billing/unmatched"
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        <span className="font-medium">Unmatched Payments</span>
                    </Link>
                    <Link
                        href="/super-admin/managed-billing/clearinghouse"
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Settings className="w-5 h-5 text-slate-600" />
                        <span className="font-medium">Settings</span>
                    </Link>
                </div>
            </div>

            {/* Collection Rate */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Collection Rate
                    </h2>
                    <span className="text-2xl font-bold text-green-600">
                        {((stats.totalPaid / stats.totalBilled) * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                    <div
                        className="bg-green-500 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${(stats.totalPaid / stats.totalBilled) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-sm text-slate-500">
                    <span>Collected: {formatCurrency(stats.totalPaid)}</span>
                    <span>Outstanding: {formatCurrency(stats.totalPending)}</span>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-800 dark:text-blue-300">
                            Demo Mode Active
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            Showing sample data. Configure a clearinghouse in Settings to enable live claim submission.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
