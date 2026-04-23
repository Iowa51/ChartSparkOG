/**
 * Admin Provider Analytics Page
 * Task 2.1: Provider Performance Analytics
 * Path: /admin/analytics
 * 
 * Shows provider productivity metrics:
 * - Notes per provider per day
 * - Average documentation time (estimated)
 * - Claim submission rates
 * - Productivity trends
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
    Clock,
    DollarSign,
    RefreshCw,
    Loader2,
    Download,
    Calendar,
    Award,
    Target,
} from 'lucide-react';

interface ProviderStats {
    id: string;
    name: string;
    email: string;
    specialty?: string;
    notesCount: number;
    patientsCount: number;
    claimsSubmitted: number;
    claimsApproved: number;
    totalBilled: number;
    avgNotesPerDay: number;
    approvalRate: number;
}

interface TeamStats {
    totalProviders: number;
    activeProviders: number;
    totalNotes: number;
    totalPatients: number;
    totalBilled: number;
    avgNotesPerProvider: number;
    avgApprovalRate: number;
}

export default function ProviderAnalyticsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [providers, setProviders] = useState<ProviderStats[]>([]);
    const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const [sortBy, setSortBy] = useState<'notesCount' | 'claimsSubmitted' | 'totalBilled' | 'approvalRate'>('notesCount');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
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

            // Calculate date range
            const now = new Date();
            let startDate = new Date();
            if (dateRange === '7d') startDate.setDate(now.getDate() - 7);
            else if (dateRange === '30d') startDate.setDate(now.getDate() - 30);
            else if (dateRange === '90d') startDate.setDate(now.getDate() - 90);
            else startDate.setFullYear(now.getFullYear() - 1);

            const daysInRange = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            // Get all providers in org
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, first_name, last_name, email, specialty, role, is_active')
                .eq('organization_id', orgId)
                .eq('role', 'USER');

            if (usersError) throw usersError;

            // Get notes count by user
            const { data: notes } = await supabase
                .from('clinical_notes')
                .select('provider_id, id')
                .eq('organization_id', orgId)
                .gte('created_at', startDate.toISOString());

            // Get submissions by user
            const { data: submissions } = await supabase
                .from('submissions')
                .select('provider_id, status, billing_amount')
                .eq('organization_id', orgId)
                .gte('created_at', startDate.toISOString());

            // Get patient count by provider
            const { data: patients } = await supabase
                .from('patients')
                .select('primary_provider_id, id')
                .eq('organization_id', orgId);

            // Build provider stats
            const providerStats: ProviderStats[] = (users || []).map((u: any) => {
                const userNotes = notes?.filter((n: any) => n.provider_id === u.id) || [];
                const userSubmissions = submissions?.filter((s: any) => s.provider_id === u.id) || [];
                const userPatients = patients?.filter((p: any) => p.primary_provider_id === u.id) || [];

                const approvedCount = userSubmissions.filter((s: any) => s.status === 'approved').length;
                const totalBilled = userSubmissions.reduce((sum: number, s: any) => sum + (s.billing_amount || 0), 0);

                return {
                    id: u.id,
                    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
                    email: u.email,
                    specialty: u.specialty,
                    notesCount: userNotes.length,
                    patientsCount: userPatients.length,
                    claimsSubmitted: userSubmissions.length,
                    claimsApproved: approvedCount,
                    totalBilled,
                    avgNotesPerDay: userNotes.length / daysInRange,
                    approvalRate: userSubmissions.length > 0
                        ? Math.round((approvedCount / userSubmissions.length) * 100)
                        : 0,
                };
            });

            // Calculate team stats
            const activeProviders = providerStats.filter(p => p.notesCount > 0).length;
            const totalNotes = providerStats.reduce((sum, p) => sum + p.notesCount, 0);
            const totalPatients = new Set(patients?.map((p: any) => p.id) || []).size;
            const totalBilled = providerStats.reduce((sum, p) => sum + p.totalBilled, 0);
            const avgApprovalRate = providerStats.length > 0
                ? Math.round(providerStats.reduce((sum, p) => sum + p.approvalRate, 0) / providerStats.length)
                : 0;

            setTeamStats({
                totalProviders: providerStats.length,
                activeProviders,
                totalNotes,
                totalPatients,
                totalBilled,
                avgNotesPerProvider: providerStats.length > 0 ? totalNotes / providerStats.length : 0,
                avgApprovalRate,
            });

            setProviders(providerStats);

        } catch (err: any) {
            console.error('Error loading analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sortedProviders = [...providers].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortDir('desc');
        }
    };

    const handleExport = () => {
        const headers = ['Name', 'Email', 'Specialty', 'Notes', 'Patients', 'Claims', 'Approved', 'Total Billed', 'Avg Notes/Day', 'Approval Rate'];
        const rows = sortedProviders.map(p => [
            p.name,
            p.email,
            p.specialty || '',
            p.notesCount,
            p.patientsCount,
            p.claimsSubmitted,
            p.claimsApproved,
            p.totalBilled.toFixed(2),
            p.avgNotesPerDay.toFixed(2),
            p.approvalRate + '%',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `provider-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // Find top performer
    const topPerformer = sortedProviders[0];

    if (loading && providers.length === 0) {
        return (
            <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-slate-500">Loading analytics...</p>
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Provider Analytics</h1>
                        <p className="text-slate-500 mt-1">Team productivity and performance metrics</p>
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
                        disabled={providers.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
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

            {/* Team Stats */}
            {teamStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-slate-500">Providers</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.totalProviders}</p>
                        <p className="text-xs text-emerald-600">{teamStats.activeProviders} active</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-teal-500" />
                            <span className="text-xs text-slate-500">Total Notes</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.totalNotes}</p>
                        <p className="text-xs text-slate-500">{teamStats.avgNotesPerProvider.toFixed(1)} avg/provider</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-purple-500" />
                            <span className="text-xs text-slate-500">Patients</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.totalPatients}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-slate-500">Total Billed</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(teamStats.totalBilled)}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <span className="text-xs text-slate-500">Avg Approval</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{teamStats.avgApprovalRate}%</p>
                    </div>

                    {topPerformer && (
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Award className="h-4 w-4 text-amber-500" />
                                <span className="text-xs text-amber-700 dark:text-amber-400">Top Performer</span>
                            </div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200 truncate">{topPerformer.name}</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">{topPerformer.notesCount} notes</p>
                        </div>
                    )}
                </div>
            )}

            {/* Provider Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-900 dark:text-white">Provider Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Specialty</th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-teal-600"
                                    onClick={() => handleSort('notesCount')}
                                >
                                    Notes {sortBy === 'notesCount' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Notes/Day</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Patients</th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-teal-600"
                                    onClick={() => handleSort('claimsSubmitted')}
                                >
                                    Claims {sortBy === 'claimsSubmitted' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-teal-600"
                                    onClick={() => handleSort('totalBilled')}
                                >
                                    Billed {sortBy === 'totalBilled' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-teal-600"
                                    onClick={() => handleSort('approvalRate')}
                                >
                                    Approval {sortBy === 'approvalRate' && (sortDir === 'desc' ? '↓' : '↑')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedProviders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                        No provider data available for this period
                                    </td>
                                </tr>
                            ) : (
                                sortedProviders.map((provider, idx) => (
                                    <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {idx === 0 && sortBy === 'notesCount' && sortDir === 'desc' && (
                                                    <Award className="h-4 w-4 text-amber-500" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{provider.name}</p>
                                                    <p className="text-xs text-slate-500">{provider.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                            {provider.specialty || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                            {provider.notesCount}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                            {provider.avgNotesPerDay.toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                            {provider.patientsCount}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                            {provider.claimsSubmitted}
                                            {provider.claimsApproved > 0 && (
                                                <span className="text-emerald-600"> ({provider.claimsApproved})</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                                            {formatCurrency(provider.totalBilled)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${provider.approvalRate >= 90 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                    provider.approvalRate >= 70 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                }`}>
                                                {provider.approvalRate >= 90 ? <TrendingUp className="h-3 w-3" /> :
                                                    provider.approvalRate < 70 ? <TrendingDown className="h-3 w-3" /> : null}
                                                {provider.approvalRate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights */}
            {sortedProviders.length > 0 && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-3">📊 Insights</h3>
                    <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        {teamStats && teamStats.avgNotesPerProvider < 5 && (
                            <li>• Average notes per provider is below 5. Consider reviewing workflow efficiency.</li>
                        )}
                        {teamStats && teamStats.avgApprovalRate < 80 && (
                            <li>• Team approval rate is {teamStats.avgApprovalRate}%. Review common rejection reasons.</li>
                        )}
                        {sortedProviders.filter(p => p.notesCount === 0).length > 0 && (
                            <li>• {sortedProviders.filter(p => p.notesCount === 0).length} provider(s) have no notes in this period.</li>
                        )}
                        {topPerformer && topPerformer.notesCount > teamStats!.avgNotesPerProvider * 2 && (
                            <li>• {topPerformer.name} is performing 2x above team average. Consider sharing best practices.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
