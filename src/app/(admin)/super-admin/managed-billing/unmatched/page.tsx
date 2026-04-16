/**
 * Super Admin: Unmatched ERA Payments
 * View and match unmatched ERA payments to claims
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    AlertCircle,
    Search,
    Link2,
    CheckCircle,
    XCircle,
    DollarSign,
    FileText
} from 'lucide-react';

interface UnmatchedPayment {
    id: string;
    era_file_name: string;
    payer_claim_number: string;
    patient_control_number: string;
    payer_name: string;
    service_date: string;
    billed_amount: number;
    paid_amount: number;
    received_at: string;
}

interface PotentialMatch {
    id: string;
    claim_number: string;
    patient_name: string;
    service_date: string;
    amount: number;
    status: string;
}

const DEMO_UNMATCHED: UnmatchedPayment[] = [
    {
        id: '1',
        era_file_name: 'ERA_BCBS_20260123_001.835',
        payer_claim_number: 'BCBS-2026-98765',
        patient_control_number: 'CLM-2026-UNKNOWN-001',
        payer_name: 'Blue Cross Blue Shield',
        service_date: '2026-01-17',
        billed_amount: 8500,
        paid_amount: 7000,
        received_at: '2026-01-23T10:30:00Z',
    },
    {
        id: '2',
        era_file_name: 'ERA_BCBS_20260123_001.835',
        payer_claim_number: 'BCBS-2026-98766',
        patient_control_number: 'CLM-2026-UNKNOWN-002',
        payer_name: 'Blue Cross Blue Shield',
        service_date: '2026-01-18',
        billed_amount: 12000,
        paid_amount: 9800,
        received_at: '2026-01-23T10:30:00Z',
    },
    {
        id: '3',
        era_file_name: 'ERA_UHC_20260122_001.835',
        payer_claim_number: 'UHC-2026-45678',
        patient_control_number: 'OLD-SYSTEM-12345',
        payer_name: 'United Healthcare',
        service_date: '2026-01-15',
        billed_amount: 15500,
        paid_amount: 13200,
        received_at: '2026-01-22T09:15:00Z',
    },
];

const DEMO_POTENTIAL_MATCHES: PotentialMatch[] = [
    {
        id: '1',
        claim_number: 'CLM-2026-001189',
        patient_name: 'Demo Patient A',
        service_date: '2026-01-17',
        amount: 8500,
        status: 'submitted',
    },
    {
        id: '2',
        claim_number: 'CLM-2026-001190',
        patient_name: 'Michael Brown',
        service_date: '2026-01-17',
        amount: 8750,
        status: 'submitted',
    },
];

export default function UnmatchedPaymentsPage() {
    const [unmatched, setUnmatched] = useState<UnmatchedPayment[]>(DEMO_UNMATCHED);
    const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null);
    const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
    const [search, setSearch] = useState('');
    const [matching, setMatching] = useState(false);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const handleSelectPayment = (payment: UnmatchedPayment) => {
        setSelectedPayment(payment);
        // In production, this would fetch actual potential matches from API
        setPotentialMatches(DEMO_POTENTIAL_MATCHES);
    };

    const handleMatch = (claimId: string) => {
        setMatching(true);
        // Simulate matching
        setTimeout(() => {
            setMatching(false);
            setUnmatched(prev => prev.filter(p => p.id !== selectedPayment?.id));
            setSelectedPayment(null);
            setPotentialMatches([]);
            alert('Payment matched successfully!');
        }, 1000);
    };

    const handleDismiss = (paymentId: string) => {
        if (confirm('Are you sure you want to dismiss this payment? It will be marked as unrecoverable.')) {
            setUnmatched(prev => prev.filter(p => p.id !== paymentId));
        }
    };

    const totalUnmatched = unmatched.reduce((sum, p) => sum + p.paid_amount, 0);

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
                            Unmatched Payments
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            ERA payments that couldn't be automatically matched to claims
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">
                                {unmatched.length}
                            </p>
                            <p className="text-sm text-slate-500">Unmatched Payments</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalUnmatched)}
                            </p>
                            <p className="text-sm text-slate-500">Total Amount</p>
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-800 dark:text-amber-300">Action Required</p>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Match these payments to ensure accurate revenue tracking
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unmatched Payments List */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Unmatched Payments
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                        {unmatched.length === 0 ? (
                            <div className="p-8 text-center">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-400">
                                    All payments have been matched!
                                </p>
                            </div>
                        ) : (
                            unmatched.map((payment) => (
                                <div
                                    key={payment.id}
                                    onClick={() => handleSelectPayment(payment)}
                                    className={`px-6 py-4 cursor-pointer transition-colors ${selectedPayment?.id === payment.id
                                        ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-500'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
                                            {payment.payer_claim_number}
                                        </span>
                                        <span className="font-medium text-green-600">
                                            {formatCurrency(payment.paid_amount)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {payment.payer_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Service: {formatDate(payment.service_date)} • From: {payment.era_file_name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDismiss(payment.id);
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Matching Panel */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Match to Claim
                        </h2>
                    </div>

                    {selectedPayment ? (
                        <div className="p-6">
                            {/* Selected Payment Details */}
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                                <p className="text-sm text-slate-500 mb-1">Selected Payment</p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {selectedPayment.payer_claim_number}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm text-slate-600">
                                        {selectedPayment.payer_name}
                                    </span>
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(selectedPayment.paid_amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Search Claims */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search claims..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                                />
                            </div>

                            {/* Potential Matches */}
                            <p className="text-sm text-slate-500 mb-2">Potential Matches</p>
                            <div className="space-y-2">
                                {potentialMatches.map((match) => (
                                    <div
                                        key={match.id}
                                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-teal-500 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-sm text-teal-600">
                                                {match.claim_number}
                                            </span>
                                            <span className="font-medium">
                                                {formatCurrency(match.amount)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                    {match.patient_name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Service: {match.service_date}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleMatch(match.id)}
                                                disabled={matching}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
                                            >
                                                <Link2 className="w-4 h-4" />
                                                {matching ? 'Matching...' : 'Match'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {potentialMatches.length === 0 && (
                                <div className="text-center py-8">
                                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">
                                        No matching claims found. Try searching manually.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">
                                Select an unmatched payment to find matching claims
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
