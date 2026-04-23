/**
 * Super Admin Analytics Page
 * Platform-wide provider analytics
 * Path: /super-admin/analytics
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
    Building2,
    DollarSign,
    RefreshCw,
    Loader2,
    Download,
    Award,
    Activity,
} from 'lucide-react';

interface OrgStats {
    id: string;
    name: string;
    userCount: number;
    noteCount: number;
    patientCount: number;
    totalBilled: number;
    avgApprovalRate: number;
}

interface PlatformStats {
    totalOrgs: number;
    activeOrgs: number;
    totalUsers: number;
    totalNotes: number;
    totalPatients: number;
    totalBilled: number;
}

export default function SuperAdminAnalyticsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [orgs, setOrgs] = useState<OrgStats[]>([]);
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const [sortBy, setSortBy] = useState<'noteCount' | 'userCount' | 'totalBilled'>('noteCount');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            // Calculate date range
            const now = new Date();
            let startDate = new Date();
            if (dateRange === '7d') startDate.setDate(now.getDate() - 7);
            else if (dateRange === '30d') startDate.setDate(now.getDate() - 30);
            else if (dateRange === '90d') startDate.setDate(now.getDate() - 90);
            else startDate.setFullYear(now.getFullYear() - 1);

            // Get all organizations
            const { data: organizations } = await supabase
                .from('organizations')
                .select('id, name');

            // Get users by org
            const { data: users } = await supabase
                .from('users')
                .select('id, organization_id, is_active');

            // Get notes by org
            const { data: notes } = await supabase
                .from('clinical_notes')
                .select('id, organization_id')
                .gte('created_at', startDate.toISOString());

            // Get patients by org
            const { data: patients } = await supabase
                .from('patients')
                .select('id, organization_id');

            // Get submissions
            const { data: submissions } = await supabase
                .from('submissions')
                .select('organization_id, status, billing_amount')
                .gte('created_at', startDate.toISOString());

            // Build org stats
            const orgStats: OrgStats[] = (organizations || []).map((org: any) => {
                const orgUsers = users?.filter((u: any) => u.organization_id === org.id) || [];
                const orgNotes = notes?.filter((n: any) => n.organization_id === org.id) || [];
                const orgPatients = patients?.filter((p: any) => p.organization_id === org.id) || [];
                const orgSubmissions = submissions?.filter((s: any) => s.organization_id === org.id) || [];

                const approvedCount = orgSubmissions.filter((s: any) => s.status === 'approved').length;
                const totalBilled = orgSubmissions.reduce((sum: number, s: any) => sum + (s.billing_amount || 0), 0);

                return {
                    id: org.id,
                    name: org.name,
                    userCount: orgUsers.length,
                    noteCount: orgNotes.length,
                    patientCount: orgPatients.length,
                    totalBilled,
                    avgApprovalRate: orgSubmissions.length > 0
                        ? Math.round((approvedCount / orgSubmissions.length) * 100)
                        : 0,
                };
            });

            // Calculate platform stats
            const activeOrgs = orgStats.filter(o => o.noteCount > 0).length;
            const totalUsers = users?.length || 0;
            const totalNotes = notes?.length || 0;
            const totalPatients = patients?.length || 0;
            const totalBilled = orgStats.reduce((sum, o) => sum + o.totalBilled, 0);

            setPlatformStats({
                totalOrgs: orgStats.length,
                activeOrgs,
                totalUsers,
                totalNotes,
                totalPatients,
                totalBilled,
            });

            setOrgs(orgStats);

        } catch (err: any) {
            console.error('Error loading analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sortedOrgs = [...orgs].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    const handleExport = () => {
        const headers = ['Organization', 'Users', 'Notes', 'Patients', 'Total Billed', 'Approval Rate'];
        const rows = sortedOrgs.map(o => [
            o.name,
            o.userCount,
            o.noteCount,
            o.patientCount,
            o.totalBilled.toFixed(2),
            o.avgApprovalRate + '%',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `platform-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading && orgs.length === 0) {
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Analytics</h1>
                        <p className="text-slate-500 mt-1">Organization performance across the platform</p>
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
                    <button
                        onClick={loadAnalytics}
                        disabled={loading}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                        <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={orgs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Platform Stats */}
            {platformStats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-purple-500" />
                            <span className="text-xs text-slate-500">Organizations</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalOrgs}</p>
                        <p className="text-xs text-emerald-600">{platformStats.activeOrgs} active</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-slate-500">Total Users</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalUsers}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-teal-500" />
                            <span className="text-xs text-slate-500">Total Notes</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalNotes}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="h-4 w-4 text-amber-500" />
                            <span className="text-xs text-slate-500">Total Patients</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{platformStats.totalPatients}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-slate-500">Platform Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(platformStats.totalBilled)}</p>
                    </div>
                </div>
            )}

            {/* Organization Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-900 dark:text-white">Organization Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-purple-600"
                                    onClick={() => { setSortBy('userCount'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}
                                >
                                    Users {sortBy === 'userCount' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-purple-600"
                                    onClick={() => { setSortBy('noteCount'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}
                                >
                                    Notes {sortBy === 'noteCount' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Patients</th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-purple-600"
                                    onClick={() => { setSortBy('totalBilled'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}
                                >
                                    Billed {sortBy === 'totalBilled' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Approval</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedOrgs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                        No organization data available
                                    </td>
                                </tr>
                            ) : (
                                sortedOrgs.map((org, idx) => (
                                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {idx === 0 && (
                                                    <Award className="h-4 w-4 text-amber-500" />
                                                )}
                                                <Link
                                                    href={`/super-admin/organizations?id=${org.id}`}
                                                    className="font-medium text-slate-900 dark:text-white hover:text-purple-600"
                                                >
                                                    {org.name}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                            {org.userCount}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                            {org.noteCount}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                            {org.patientCount}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(org.totalBilled)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${org.avgApprovalRate >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    org.avgApprovalRate >= 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {org.avgApprovalRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
