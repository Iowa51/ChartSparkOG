/**
 * Super Admin Invitations Page
 * Manage invitations across all organizations
 * Path: /super-admin/invitations
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft,
    UserPlus,
    Search,
    Building2,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Loader2,
    Filter,
} from 'lucide-react';

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    organization_name: string;
    inviter_name: string;
    created_at: string;
    expires_at: string;
}

export default function SuperAdminInvitationsPage() {
    const supabase = createClient();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('invitations')
                .select(`
                    id,
                    email,
                    role,
                    status,
                    created_at,
                    expires_at,
                    organizations(name),
                    users!invitations_invited_by_fkey(first_name, last_name)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const formatted = (data || []).map((inv: any) => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                status: inv.status,
                organization_name: inv.organizations?.name || 'Unknown',
                inviter_name: inv.users ? `${inv.users.first_name} ${inv.users.last_name}` : 'System',
                created_at: inv.created_at,
                expires_at: inv.expires_at,
            }));

            setInvitations(formatted);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
            case 'accepted': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'expired': return <XCircle className="h-4 w-4 text-slate-400" />;
            case 'cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'accepted': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'expired': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const filteredInvitations = invitations.filter(inv => {
        if (searchTerm && !inv.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !inv.organization_name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
        return true;
    });

    const stats = {
        total: invitations.length,
        pending: invitations.filter(i => i.status === 'pending').length,
        accepted: invitations.filter(i => i.status === 'accepted').length,
        expired: invitations.filter(i => i.status === 'expired').length,
    };

    if (loading && invitations.length === 0) {
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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Invitations</h1>
                        <p className="text-slate-500 mt-1">All invitations across organizations</p>
                    </div>
                </div>
                <button
                    onClick={loadInvitations}
                    disabled={loading}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                    <RefreshCw className={`h-5 w-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                    <p className="text-xs text-slate-500">Total</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{stats.accepted}</p>
                    <p className="text-xs text-slate-500">Accepted</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold text-slate-400">{stats.expired}</p>
                    <p className="text-xs text-slate-500">Expired</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by email or organization..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Invited By</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInvitations.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                    No invitations found
                                </td>
                            </tr>
                        ) : (
                            filteredInvitations.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{inv.email}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                            <Building2 className="h-4 w-4" />
                                            {inv.organization_name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{inv.role}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inv.status)}`}>
                                            {getStatusIcon(inv.status)}
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{inv.inviter_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {new Date(inv.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
