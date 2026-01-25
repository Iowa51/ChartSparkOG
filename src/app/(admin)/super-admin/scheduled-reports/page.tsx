/**
 * Super Admin Scheduled Reports Page
 * Platform-wide scheduled report management
 * Path: /super-admin/scheduled-reports
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Plus,
    Trash2,
    Edit2,
    Mail,
    CheckCircle2,
    XCircle,
    Loader2,
    Play,
    Pause,
    RefreshCw,
    FileText,
    BarChart3,
    Users,
    DollarSign,
    Building2,
} from 'lucide-react';

interface ScheduledReport {
    id: string;
    name: string;
    organization_name: string;
    report_type: string;
    frequency: string;
    time: string;
    recipients: string[];
    is_active: boolean;
    last_run?: string;
    next_run: string;
}

// Demo platform-wide scheduled reports
const DEMO_REPORTS: ScheduledReport[] = [
    {
        id: '1',
        name: 'Weekly Billing Summary',
        organization_name: 'Acme Healthcare',
        report_type: 'billing',
        frequency: 'weekly',
        time: '08:00',
        recipients: ['admin@acme.com'],
        is_active: true,
        last_run: new Date(Date.now() - 7 * 86400000).toISOString(),
        next_run: new Date(Date.now() + 7 * 86400000).toISOString(),
    },
    {
        id: '2',
        name: 'Monthly Provider Report',
        organization_name: 'Metro Clinic',
        report_type: 'provider_performance',
        frequency: 'monthly',
        time: '09:00',
        recipients: ['director@metro.com'],
        is_active: true,
        last_run: new Date(Date.now() - 30 * 86400000).toISOString(),
        next_run: new Date(Date.now() + 5 * 86400000).toISOString(),
    },
    {
        id: '3',
        name: 'Platform Revenue',
        organization_name: 'Platform',
        report_type: 'platform_revenue',
        frequency: 'daily',
        time: '06:00',
        recipients: ['finance@chartspark.ai'],
        is_active: true,
        last_run: new Date(Date.now() - 86400000).toISOString(),
        next_run: new Date(Date.now() + 86400000).toISOString(),
    },
];

export default function SuperAdminScheduledReportsPage() {
    const [reports, setReports] = useState<ScheduledReport[]>(DEMO_REPORTS);
    const [orgFilter, setOrgFilter] = useState<string>('all');

    const filteredReports = orgFilter === 'all'
        ? reports
        : reports.filter(r => r.organization_name === orgFilter);

    const orgs = ['all', ...new Set(reports.map(r => r.organization_name))];

    const stats = {
        total: reports.length,
        active: reports.filter(r => r.is_active).length,
        platform: reports.filter(r => r.organization_name === 'Platform').length,
    };

    const formatNextRun = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Scheduled Reports</h1>
                        <p className="text-slate-500 mt-1">All scheduled reports across organizations</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Total Schedules</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Active</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <p className="text-sm text-slate-500">Platform Reports</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.platform}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                    {orgs.map(org => (
                        <option key={org} value={org}>{org === 'all' ? 'All Organizations' : org}</option>
                    ))}
                </select>
            </div>

            {/* Reports Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Report</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Frequency</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Next Run</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3">
                                    <p className="font-medium text-slate-900 dark:text-white">{report.name}</p>
                                    <p className="text-xs text-slate-500">{report.report_type}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        <span className="text-slate-600 dark:text-slate-400">{report.organization_name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">
                                    {report.frequency} at {report.time}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                    {formatNextRun(report.next_run)}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${report.is_active
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                        }`}>
                                        {report.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {report.is_active ? 'Active' : 'Paused'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
