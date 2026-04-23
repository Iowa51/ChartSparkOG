/**
 * Super Admin Reports Page
 * Platform-wide reporting
 * Path: /super-admin/reports
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    BarChart3,
    Building2,
    Users,
    FileText,
    DollarSign,
    TrendingUp,
    Download,
    RefreshCw,
    Loader2,
    Calendar,
    PieChart,
} from 'lucide-react';

interface PlatformReport {
    totalOrgs: number;
    totalUsers: number;
    totalNotes: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalRevenue: number;
    avgRevenuePerOrg: number;
    topOrgs: { name: string; revenue: number }[];
}

export default function SuperAdminReportsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<PlatformReport | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'usage'>('overview');

    useEffect(() => {
        loadReport();
    }, [dateRange]);

    const loadReport = async () => {
        setLoading(true);
        setError(null);

        try {
            const now = new Date();
            let startDate = new Date();
            if (dateRange === '7d') startDate.setDate(now.getDate() - 7);
            else if (dateRange === '30d') startDate.setDate(now.getDate() - 30);
            else if (dateRange === '90d') startDate.setDate(now.getDate() - 90);
            else startDate.setFullYear(now.getFullYear() - 1);

            // Get organizations
            const { data: orgs } = await supabase.from('organizations').select('id, name');

            // Get users
            const { data: users } = await supabase.from('users').select('id, organization_id');

            // Get notes
            const { data: notes } = await supabase
                .from('clinical_notes')
                .select('id, organization_id')
                .gte('created_at', startDate.toISOString());

            // Get submissions
            const { data: submissions } = await supabase
                .from('submissions')
                .select('id, organization_id, status, billing_amount')
                .gte('created_at', startDate.toISOString());

            const totalRevenue = submissions?.reduce((sum: number, s: any) => sum + (s.billing_amount || 0), 0) || 0;

            // Calculate top orgs by revenue
            const orgRevenue = new Map<string, { name: string; revenue: number }>();
            orgs?.forEach((org: any) => {
                const orgSubmissions = submissions?.filter((s: any) => s.organization_id === org.id) || [];
                const revenue = orgSubmissions.reduce((sum: number, s: any) => sum + (s.billing_amount || 0), 0);
                orgRevenue.set(org.id, { name: org.name, revenue });
            });
            const topOrgs = Array.from(orgRevenue.values())
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            setReport({
                totalOrgs: orgs?.length || 0,
                totalUsers: users?.length || 0,
                totalNotes: notes?.length || 0,
                totalSubmissions: submissions?.length || 0,
                approvedSubmissions: submissions?.filter((s: any) => s.status === 'approved').length || 0,
                pendingSubmissions: submissions?.filter((s: any) => s.status === 'pending').length || 0,
                rejectedSubmissions: submissions?.filter((s: any) => s.status === 'rejected').length || 0,
                totalRevenue,
                avgRevenuePerOrg: orgs?.length ? totalRevenue / orgs.length : 0,
                topOrgs,
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const handleExport = () => {
        if (!report) return;
        const data = {
            generatedAt: new Date().toISOString(),
            dateRange,
            ...report,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading && !report) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Reports</h1>
                        <p className="text-slate-500 mt-1">Platform-wide metrics and analytics</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">Last Year</option>
                    </select>
                    <button onClick={loadReport} disabled={loading} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                        <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'revenue', label: 'Revenue', icon: DollarSign },
                    { id: 'usage', label: 'Usage', icon: TrendingUp },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${activeTab === tab.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {report && (
                <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-5 w-5 text-purple-500" />
                                    <span className="text-sm text-slate-500">Organizations</span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">{report.totalOrgs}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm text-slate-500">Users</span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">{report.totalUsers}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-5 w-5 text-teal-500" />
                                    <span className="text-sm text-slate-500">Notes</span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">{report.totalNotes}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-5 w-5 text-green-500" />
                                    <span className="text-sm text-slate-500">Revenue</span>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(report.totalRevenue)}</p>
                            </div>
                        </div>
                    )}

                    {/* Revenue Tab */}
                    {activeTab === 'revenue' && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                    <p className="text-sm text-slate-500 mb-1">Total Revenue</p>
                                    <p className="text-3xl font-bold text-emerald-600">{formatCurrency(report.totalRevenue)}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                    <p className="text-sm text-slate-500 mb-1">Avg per Org</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(report.avgRevenuePerOrg)}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                    <p className="text-sm text-slate-500 mb-1">Submissions</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{report.totalSubmissions}</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top Organizations by Revenue</h3>
                                <div className="space-y-3">
                                    {report.topOrgs.map((org, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <span className="text-slate-600 dark:text-slate-400">{idx + 1}. {org.name}</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(org.revenue)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Usage Tab */}
                    {activeTab === 'usage' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Submission Status Breakdown</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                        <p className="text-2xl font-bold text-emerald-600">{report.approvedSubmissions}</p>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-400">Approved</p>
                                    </div>
                                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                        <p className="text-2xl font-bold text-amber-600">{report.pendingSubmissions}</p>
                                        <p className="text-sm text-amber-700 dark:text-amber-400">Pending</p>
                                    </div>
                                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                        <p className="text-2xl font-bold text-red-600">{report.rejectedSubmissions}</p>
                                        <p className="text-sm text-red-700 dark:text-red-400">Rejected</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
