/**
 * Admin Reports Dashboard
 * Task 1.2: Organization-level reports and analytics
 * Path: /admin/reports
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    Users,
    FileText,
    DollarSign,
    Calendar,
    Download,
    Loader2,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertCircle,
    PieChart,
} from 'lucide-react';

interface ReportData {
    billing: {
        totalBilled: number;
        totalApproved: number;
        totalPending: number;
        totalRejected: number;
        avgClaimAmount: number;
        claimsByMonth: { month: string; amount: number }[];
    };
    users: {
        totalUsers: number;
        activeUsers: number;
        notesByUser: { name: string; count: number }[];
    };
    patients: {
        totalPatients: number;
        newThisMonth: number;
        activeThisMonth: number;
    };
    claims: {
        totalSubmissions: number;
        approvalRate: number;
        avgProcessingDays: number;
        byStatus: { status: string; count: number }[];
        byCPT: { cpt: string; count: number; amount: number }[];
    };
}

const initialData: ReportData = {
    billing: {
        totalBilled: 0,
        totalApproved: 0,
        totalPending: 0,
        totalRejected: 0,
        avgClaimAmount: 0,
        claimsByMonth: [],
    },
    users: {
        totalUsers: 0,
        activeUsers: 0,
        notesByUser: [],
    },
    patients: {
        totalPatients: 0,
        newThisMonth: 0,
        activeThisMonth: 0,
    },
    claims: {
        totalSubmissions: 0,
        approvalRate: 0,
        avgProcessingDays: 0,
        byStatus: [],
        byCPT: [],
    },
};

export default function AdminReportsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ReportData>(initialData);
    const [selectedReport, setSelectedReport] = useState<'overview' | 'billing' | 'users' | 'claims'>('overview');
    const [dateRange, setDateRange] = useState<'30d' | '90d' | '1y' | 'all'>('30d');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadReportData();
    }, [dateRange]);

    const loadReportData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get current user's organization
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) {
                throw new Error('Organization not found');
            }

            const orgId = profile.organization_id;

            // Calculate date filter
            const now = new Date();
            let startDate: Date | null = null;
            if (dateRange === '30d') startDate = new Date(now.setDate(now.getDate() - 30));
            else if (dateRange === '90d') startDate = new Date(now.setDate(now.getDate() - 90));
            else if (dateRange === '1y') startDate = new Date(now.setFullYear(now.getFullYear() - 1));

            // Fetch users data
            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId);

            const { count: activeUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('is_active', true);

            // Fetch patients data
            const { count: totalPatients } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId);

            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const { count: newPatients } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .gte('created_at', startOfMonth.toISOString());

            // Fetch submissions data
            let submissionsQuery = supabase
                .from('submissions')
                .select('*')
                .eq('organization_id', orgId);

            if (startDate) {
                submissionsQuery = submissionsQuery.gte('created_at', startDate.toISOString());
            }

            const { data: submissions } = await submissionsQuery;

            // Calculate billing stats
            const billingStats = {
                totalBilled: 0,
                totalApproved: 0,
                totalPending: 0,
                totalRejected: 0,
                avgClaimAmount: 0,
                claimsByMonth: [] as { month: string; amount: number }[],
            };

            const claimStats = {
                totalSubmissions: submissions?.length || 0,
                approvalRate: 0,
                avgProcessingDays: 0,
                byStatus: [] as { status: string; count: number }[],
                byCPT: [] as { cpt: string; count: number; amount: number }[],
            };

            if (submissions && submissions.length > 0) {
                // Billing calculations
                submissions.forEach((sub: any) => {
                    billingStats.totalBilled += sub.billing_amount || 0;
                    if (sub.status === 'approved') billingStats.totalApproved += sub.billing_amount || 0;
                    if (sub.status === 'pending_approval' || sub.status === 'pending_audit') billingStats.totalPending += sub.billing_amount || 0;
                    if (sub.status === 'rejected') billingStats.totalRejected += sub.billing_amount || 0;
                });
                billingStats.avgClaimAmount = billingStats.totalBilled / submissions.length;

                // Status breakdown
                const statusCounts: Record<string, number> = {};
                const cptData: Record<string, { count: number; amount: number }> = {};

                submissions.forEach((sub: any) => {
                    statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
                    if (sub.cpt_code) {
                        if (!cptData[sub.cpt_code]) {
                            cptData[sub.cpt_code] = { count: 0, amount: 0 };
                        }
                        cptData[sub.cpt_code].count++;
                        cptData[sub.cpt_code].amount += sub.billing_amount || 0;
                    }
                });

                claimStats.byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
                claimStats.byCPT = Object.entries(cptData)
                    .map(([cpt, data]) => ({ cpt, count: data.count, amount: data.amount }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                // Approval rate
                const approved = submissions.filter((s: any) => s.status === 'approved').length;
                const processedTotal = submissions.filter((s: any) => ['approved', 'rejected'].includes(s.status)).length;
                claimStats.approvalRate = processedTotal > 0 ? Math.round((approved / processedTotal) * 100) : 0;
            }

            setData({
                billing: billingStats,
                users: {
                    totalUsers: totalUsers || 0,
                    activeUsers: activeUsers || 0,
                    notesByUser: [], // Would require additional query
                },
                patients: {
                    totalPatients: totalPatients || 0,
                    newThisMonth: newPatients || 0,
                    activeThisMonth: 0, // Would require appointment/encounter data
                },
                claims: claimStats,
            });

        } catch (err: any) {
            console.error('Error loading report data:', err);
            setError(err.message || 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type: 'pdf' | 'csv') => {
        setExporting(true);
        try {
            if (type === 'csv') {
                // Generate CSV for claims data
                const headers = ['Status', 'Count', 'Percentage'];
                const rows = data.claims.byStatus.map(s => [
                    s.status,
                    s.count.toString(),
                    data.claims.totalSubmissions > 0
                        ? ((s.count / data.claims.totalSubmissions) * 100).toFixed(1) + '%'
                        : '0%'
                ]);

                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report-${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-500">Loading reports...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
                        <p className="text-slate-500 mt-1">Organization performance metrics</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as any)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">Last Year</option>
                        <option value="all">All Time</option>
                    </select>
                    <button
                        onClick={loadReportData}
                        disabled={loading}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                    >
                        <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                    >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Report Type Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                    { id: 'overview', label: 'Overview', icon: PieChart },
                    { id: 'billing', label: 'Billing Summary', icon: DollarSign },
                    { id: 'users', label: 'User Productivity', icon: Users },
                    { id: 'claims', label: 'Claims Analytics', icon: FileText },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedReport(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${selectedReport === tab.id
                                ? 'bg-teal-600 text-white'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Report */}
            {selectedReport === 'overview' && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <span className="text-sm text-slate-500">Total Users</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.users.totalUsers}</p>
                            <p className="text-sm text-emerald-600 mt-1">{data.users.activeUsers} active</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                                    <FileText className="h-5 w-5 text-teal-600" />
                                </div>
                                <span className="text-sm text-slate-500">Total Patients</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.patients.totalPatients}</p>
                            <p className="text-sm text-emerald-600 mt-1">+{data.patients.newThisMonth} this month</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                </div>
                                <span className="text-sm text-slate-500">Total Billed</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(data.billing.totalBilled)}</p>
                            <p className="text-sm text-emerald-600 mt-1">{formatCurrency(data.billing.totalApproved)} approved</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-purple-600" />
                                </div>
                                <span className="text-sm text-slate-500">Approval Rate</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.claims.approvalRate}%</p>
                            <p className="text-sm text-slate-500 mt-1">{data.claims.totalSubmissions} total claims</p>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Claims by Status</h3>
                            {data.claims.byStatus.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No claims data available</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.claims.byStatus.map((item) => (
                                        <div key={item.status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {item.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                {item.status.includes('pending') && <Clock className="h-4 w-4 text-amber-500" />}
                                                {item.status === 'rejected' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                                <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">
                                                    {item.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-slate-900 dark:text-white">{item.count}</span>
                                                <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.status === 'approved' ? 'bg-emerald-500' :
                                                                item.status.includes('pending') ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${(item.count / data.claims.totalSubmissions) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Top CPT Codes</h3>
                            {data.claims.byCPT.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No CPT data available</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.claims.byCPT.slice(0, 5).map((item) => (
                                        <div key={item.cpt} className="flex items-center justify-between">
                                            <span className="font-mono text-sm font-bold text-teal-600">{item.cpt}</span>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900 dark:text-white">{item.count} claims</p>
                                                <p className="text-sm text-slate-500">{formatCurrency(item.amount)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Billing Summary Report */}
            {selectedReport === 'billing' && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6">
                            <p className="text-sm text-emerald-600 font-medium">Approved</p>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(data.billing.totalApproved)}</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6">
                            <p className="text-sm text-amber-600 font-medium">Pending</p>
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(data.billing.totalPending)}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                            <p className="text-sm text-red-600 font-medium">Rejected</p>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(data.billing.totalRejected)}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                            <p className="text-sm text-blue-600 font-medium">Avg Claim</p>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(data.billing.avgClaimAmount)}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Billing by CPT Code</h3>
                        {data.claims.byCPT.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No billing data available</p>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left py-2 text-xs font-bold text-slate-500 uppercase">CPT Code</th>
                                        <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase">Claims</th>
                                        <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase">Total Amount</th>
                                        <th className="text-right py-2 text-xs font-bold text-slate-500 uppercase">Avg Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.claims.byCPT.map((item) => (
                                        <tr key={item.cpt} className="border-b border-slate-100 dark:border-slate-800">
                                            <td className="py-3 font-mono font-bold text-teal-600">{item.cpt}</td>
                                            <td className="py-3 text-right text-slate-600 dark:text-slate-300">{item.count}</td>
                                            <td className="py-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</td>
                                            <td className="py-3 text-right text-slate-500">{formatCurrency(item.amount / item.count)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Users Report */}
            {selectedReport === 'users' && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <p className="text-sm text-slate-500">Total Users</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.users.totalUsers}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <p className="text-sm text-slate-500">Active Users</p>
                            <p className="text-3xl font-bold text-emerald-600">{data.users.activeUsers}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <p className="text-sm text-slate-500">Inactive Users</p>
                            <p className="text-3xl font-bold text-slate-400">{data.users.totalUsers - data.users.activeUsers}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                        <p className="text-blue-800 dark:text-blue-200">
                            <strong>Coming Soon:</strong> Individual provider productivity metrics including notes per day,
                            average documentation time, and claim submission rates.
                        </p>
                    </div>
                </div>
            )}

            {/* Claims Analytics Report */}
            {selectedReport === 'claims' && (
                <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <p className="text-sm text-slate-500">Total Claims</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{data.claims.totalSubmissions}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <p className="text-sm text-slate-500">Approval Rate</p>
                            <p className="text-3xl font-bold text-emerald-600">{data.claims.approvalRate}%</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                            <p className="text-sm text-slate-500">Avg Processing</p>
                            <p className="text-3xl font-bold text-blue-600">{data.claims.avgProcessingDays || '—'} days</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Claims by Status</h3>
                        {data.claims.byStatus.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No claims data available</p>
                        ) : (
                            <div className="space-y-4">
                                {data.claims.byStatus.map((item) => (
                                    <div key={item.status}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize">
                                                {item.status.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {item.count} ({((item.count / data.claims.totalSubmissions) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${item.status === 'approved' ? 'bg-emerald-500' :
                                                        item.status.includes('pending') ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${(item.count / data.claims.totalSubmissions) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
