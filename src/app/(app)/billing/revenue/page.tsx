/**
 * Clinician Revenue Dashboard
 * Shows billing performance and revenue tracking for clinicians
 * 
 * This page is accessible from the main billing page for clinicians
 * to view their own billing statistics and pending claims.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    FileText,
    ArrowLeft,
    Calendar,
    BarChart3,
    ChevronRight
} from 'lucide-react';

// Demo data for revenue dashboard
const demoStats = {
    mtdCollected: 12450,
    mtdSubmitted: 15800,
    ytdCollected: 142500,
    ytdSubmitted: 168000,
    avgDaysToPayment: 23,
    collectionRate: 85,
};

const demoClaims = [
    { id: '1', patient: 'John Smith', date: '2026-01-20', amount: 18500, status: 'paid', payer: 'BlueCross' },
    { id: '2', patient: 'Mary Johnson', date: '2026-01-19', amount: 13500, status: 'submitted', payer: 'Aetna' },
    { id: '3', patient: 'Robert Davis', date: '2026-01-18', amount: 9500, status: 'pending', payer: 'Medicare' },
    { id: '4', patient: 'Lisa Wilson', date: '2026-01-17', amount: 21000, status: 'paid', payer: 'UnitedHealth' },
    { id: '5', patient: 'James Brown', date: '2026-01-16', amount: 11000, status: 'denied', payer: 'Cigna' },
];

const demoMonthlyData = [
    { month: 'Aug', submitted: 14200, collected: 12100 },
    { month: 'Sep', submitted: 15800, collected: 13400 },
    { month: 'Oct', submitted: 16500, collected: 14200 },
    { month: 'Nov', submitted: 14900, collected: 12800 },
    { month: 'Dec', submitted: 17200, collected: 14900 },
    { month: 'Jan', submitted: 15800, collected: 12450 },
];

export default function RevenueDashboardPage() {
    const [timeRange, setTimeRange] = useState<'mtd' | 'ytd'>('mtd');
    const [loading] = useState(false);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'submitted': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'denied': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/billing"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Revenue Dashboard
                                </h1>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Track your billing performance and collections
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => setTimeRange('mtd')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === 'mtd'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                                            : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    This Month
                                </button>
                                <button
                                    onClick={() => setTimeRange('ytd')}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === 'ytd'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                                            : 'text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    Year to Date
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {timeRange === 'mtd' ? 'MTD' : 'YTD'} Collected
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(timeRange === 'mtd' ? demoStats.mtdCollected : demoStats.ytdCollected)}
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                            <span>12% vs last period</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {timeRange === 'mtd' ? 'MTD' : 'YTD'} Submitted
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(timeRange === 'mtd' ? demoStats.mtdSubmitted : demoStats.ytdSubmitted)}
                        </div>
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {Math.round((timeRange === 'mtd' ? demoStats.mtdCollected / demoStats.mtdSubmitted : demoStats.ytdCollected / demoStats.ytdSubmitted) * 100)}% collection rate
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Avg Days to Payment
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {demoStats.avgDaysToPayment} days
                        </div>
                        <div className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                            2 days faster than avg
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Collection Rate
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {demoStats.collectionRate}%
                        </div>
                        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Industry avg: 82%
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Chart Section */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                6-Month Revenue Trend
                            </h2>
                            <BarChart3 className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="h-64 flex items-end gap-4">
                            {demoMonthlyData.map((month, index) => {
                                const maxValue = Math.max(...demoMonthlyData.map(m => m.submitted));
                                const submittedHeight = (month.submitted / maxValue) * 100;
                                const collectedHeight = (month.collected / maxValue) * 100;

                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full flex gap-1 items-end h-48">
                                            <div
                                                className="flex-1 bg-blue-200 dark:bg-blue-900/50 rounded-t"
                                                style={{ height: `${submittedHeight}%` }}
                                                title={`Submitted: ${formatCurrency(month.submitted)}`}
                                            />
                                            <div
                                                className="flex-1 bg-emerald-400 dark:bg-emerald-500 rounded-t"
                                                style={{ height: `${collectedHeight}%` }}
                                                title={`Collected: ${formatCurrency(month.collected)}`}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {month.month}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-200 dark:bg-blue-900/50 rounded" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Submitted</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-emerald-400 dark:bg-emerald-500 rounded" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Collected</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <Link
                                href="/billing/claims"
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">View All Claims</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            </Link>
                            <Link
                                href="/encounters"
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-teal-600" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Unbilled Encounters</span>
                                </div>
                                <span className="text-sm text-amber-600 font-medium">3</span>
                            </Link>
                            <Link
                                href="/billing/denials"
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Denied Claims</span>
                                </div>
                                <span className="text-sm text-red-600 font-medium">1</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Recent Claims Table */}
                <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Recent Claims
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Service Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Payer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {demoClaims.map((claim) => (
                                    <tr
                                        key={claim.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {claim.patient}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                            {formatDate(claim.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                            {claim.payer}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(claim.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(claim.status)}`}>
                                                {claim.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
