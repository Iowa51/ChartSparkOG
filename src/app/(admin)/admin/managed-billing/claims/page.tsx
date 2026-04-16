/**
 * Admin: Claims List
 * View and manage organization's billing claims
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Search,
    Send,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronRight,
    Download,
    RefreshCw,
    X,
    Loader2
} from 'lucide-react';

interface Claim {
    id: string;
    claim_number: string;
    patient_name: string;
    provider_name: string;
    service_date: string;
    amount: number;
    status: 'draft' | 'pending' | 'submitted' | 'accepted' | 'paid' | 'rejected' | 'denied';
    payer_name: string;
    submitted_at: string | null;
    paid_at: string | null;
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

const DEMO_CLAIMS: Claim[] = [
    {
        id: '1',
        claim_number: 'CLM-2026-001247',
        patient_name: 'John Smith',
        provider_name: 'Demo Provider',
        service_date: '2026-01-20',
        amount: 15000,
        status: 'paid',
        payer_name: 'Blue Cross Blue Shield',
        submitted_at: '2026-01-21',
        paid_at: '2026-01-23',
    },
    {
        id: '2',
        claim_number: 'CLM-2026-001248',
        patient_name: 'Mary Johnson',
        provider_name: 'Demo Provider',
        service_date: '2026-01-21',
        amount: 22500,
        status: 'submitted',
        payer_name: 'Aetna',
        submitted_at: '2026-01-22',
        paid_at: null,
    },
    {
        id: '3',
        claim_number: 'CLM-2026-001249',
        patient_name: 'Robert Davis',
        provider_name: 'Dr. Michael Chen',
        service_date: '2026-01-22',
        amount: 8500,
        status: 'pending',
        payer_name: 'United Healthcare',
        submitted_at: null,
        paid_at: null,
    },
    {
        id: '4',
        claim_number: 'CLM-2026-001250',
        patient_name: 'Emily Brown',
        provider_name: 'Demo Provider',
        service_date: '2026-01-19',
        amount: 12000,
        status: 'rejected',
        payer_name: 'Cigna',
        submitted_at: '2026-01-20',
        paid_at: null,
    },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: Clock },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    submitted: { label: 'Submitted', color: 'bg-purple-100 text-purple-700', icon: Send },
    accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
    denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AdminClaimsPage() {
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get('status');

    const [claims, setClaims] = useState<Claim[]>(DEMO_CLAIMS);
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter || 'all');
    const [loading, setLoading] = useState(false);
    const [submittingClaimId, setSubmittingClaimId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleSubmitClaim = async (claimId: string, claimNumber: string) => {
        setSubmittingClaimId(claimId);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setClaims(prev => prev.map(c =>
            c.id === claimId
                ? { ...c, status: 'submitted' as const, submitted_at: new Date().toISOString().split('T')[0] }
                : c
        ));
        addToast('success', `Claim ${claimNumber} submitted successfully`);
        setSubmittingClaimId(null);
    };

    const handleResubmitClaim = async (claimId: string, claimNumber: string) => {
        setSubmittingClaimId(claimId);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setClaims(prev => prev.map(c =>
            c.id === claimId
                ? { ...c, status: 'submitted' as const, submitted_at: new Date().toISOString().split('T')[0] }
                : c
        ));
        addToast('success', `Claim ${claimNumber} resubmitted successfully`);
        setSubmittingClaimId(null);
    };

    const handleSyncStatus = async () => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        addToast('info', 'Claim statuses synchronized');
        setLoading(false);
    };

    const filteredClaims = claims.filter(claim => {
        const matchesSearch =
            claim.claim_number.toLowerCase().includes(search.toLowerCase()) ||
            claim.patient_name.toLowerCase().includes(search.toLowerCase()) ||
            claim.payer_name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = selectedStatus === 'all' || claim.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'success'
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : toast.type === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}
                    >
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                        {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
                        <span className="text-sm font-medium">{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/managed-billing"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Claims
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {filteredClaims.length} claims found
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={handleSyncStatus}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Syncing...' : 'Sync Status'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search claims..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    />
                </div>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="accepted">Accepted</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Claims Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Claim #</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Payer</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Service Date</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredClaims.map((claim) => {
                            const status = statusConfig[claim.status];
                            const StatusIcon = status.icon;
                            const isSubmitting = submittingClaimId === claim.id;

                            return (
                                <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-slate-900 dark:text-white">
                                            {claim.claim_number}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{claim.patient_name}</p>
                                            <p className="text-sm text-slate-500">{claim.provider_name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{claim.payer_name}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDate(claim.service_date)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{formatCurrency(claim.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {(claim.status === 'draft' || claim.status === 'pending') && (
                                                <button
                                                    onClick={() => handleSubmitClaim(claim.id, claim.claim_number)}
                                                    disabled={isSubmitting}
                                                    className="flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm font-medium disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                                </button>
                                            )}
                                            {claim.status === 'rejected' && (
                                                <button
                                                    onClick={() => handleResubmitClaim(claim.id, claim.claim_number)}
                                                    disabled={isSubmitting}
                                                    className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm font-medium disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                    {isSubmitting ? 'Resubmitting...' : 'Resubmit'}
                                                </button>
                                            )}
                                            <button className="text-slate-600 hover:text-slate-700 p-1">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredClaims.length === 0 && (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No claims found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}
