/**
 * Admin: ERA Files and Payments
 * View received ERA/835 files and payment details for organization
 */

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    FileText,
    Download,
    CheckCircle,
    AlertCircle,
    Clock,
    DollarSign,
    Upload,
    ChevronDown,
    ChevronRight,
    X,
    Loader2,
    FileUp
} from 'lucide-react';

interface ERAFile {
    id: string;
    file_name: string;
    received_at: string;
    status: 'received' | 'processing' | 'processed' | 'error' | 'partial';
    total_claims: number;
    total_paid: number;
    claims_matched: number;
    claims_unmatched: number;
}

interface ERAPayment {
    id: string;
    era_file_id: string;
    claim_number: string;
    patient_name: string;
    payer_name: string;
    service_date: string;
    billed_amount: number;
    paid_amount: number;
    adjustment_amount: number;
    patient_responsibility: number;
    matched: boolean;
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

const DEMO_ERA_FILES: ERAFile[] = [
    {
        id: '1',
        file_name: 'ERA_BCBS_20260123_001.835',
        received_at: '2026-01-23T10:30:00Z',
        status: 'processed',
        total_claims: 12,
        total_paid: 1525000,
        claims_matched: 11,
        claims_unmatched: 1,
    },
    {
        id: '2',
        file_name: 'ERA_AETNA_20260122_003.835',
        received_at: '2026-01-22T15:45:00Z',
        status: 'processed',
        total_claims: 8,
        total_paid: 870000,
        claims_matched: 8,
        claims_unmatched: 0,
    },
];

const DEMO_PAYMENTS: ERAPayment[] = [
    {
        id: '1',
        era_file_id: '1',
        claim_number: 'CLM-2026-001200',
        patient_name: 'Alice Thompson',
        payer_name: 'Blue Cross Blue Shield',
        service_date: '2026-01-15',
        billed_amount: 15000,
        paid_amount: 12500,
        adjustment_amount: 2000,
        patient_responsibility: 500,
        matched: true,
    },
    {
        id: '2',
        era_file_id: '1',
        claim_number: 'CLM-2026-001205',
        patient_name: 'Bob Martinez',
        payer_name: 'Blue Cross Blue Shield',
        service_date: '2026-01-16',
        billed_amount: 22000,
        paid_amount: 18500,
        adjustment_amount: 2500,
        patient_responsibility: 1000,
        matched: true,
    },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    received: { label: 'Received', color: 'bg-blue-100 text-blue-700', icon: Clock },
    processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    processed: { label: 'Processed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    error: { label: 'Error', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    partial: { label: 'Partial Match', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function AdminERAPage() {
    const [eraFiles, setERAFiles] = useState<ERAFile[]>(DEMO_ERA_FILES);
    const [payments] = useState<ERAPayment[]>(DEMO_PAYMENTS);
    const [expandedFile, setExpandedFile] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            year: 'numeric',
        });
    };

    const handleUpload = async () => {
        setUploading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        addToast('success', 'ERA file uploaded and processing started');
        setUploading(false);
    };

    const totalPaid = eraFiles.reduce((sum, f) => sum + f.total_paid, 0);
    const totalClaims = eraFiles.reduce((sum, f) => sum + f.total_claims, 0);

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
                        {toast.type === 'error' && <X className="w-5 h-5 text-red-600" />}
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
                            ERA Payments
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Electronic Remittance Advice files and payment details
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".835,.txt"
                        className="hidden"
                        onChange={handleUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Uploading...' : 'Upload ERA'}
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{eraFiles.length}</p>
                            <p className="text-sm text-slate-500">ERA Files</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                            <p className="text-sm text-slate-500">Total Paid</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalClaims}</p>
                            <p className="text-sm text-slate-500">Claims Processed</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ERA Files List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white">ERA Files</h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {eraFiles.map(file => {
                        const status = statusConfig[file.status];
                        const StatusIcon = status.icon;
                        const isExpanded = expandedFile === file.id;
                        const filePayments = payments.filter(p => p.era_file_id === file.id);

                        return (
                            <div key={file.id}>
                                <button
                                    onClick={() => setExpandedFile(isExpanded ? null : file.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <FileUp className="w-8 h-8 text-slate-400" />
                                        <div className="text-left">
                                            <p className="font-medium text-slate-900 dark:text-white">{file.file_name}</p>
                                            <p className="text-sm text-slate-500">{formatDate(file.received_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-medium text-green-600">{formatCurrency(file.total_paid)}</p>
                                            <p className="text-sm text-slate-500">{file.total_claims} claims</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {status.label}
                                        </span>
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-6 pb-4 bg-slate-50 dark:bg-slate-800">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-slate-500">
                                                    <th className="py-2">Claim #</th>
                                                    <th className="py-2">Patient</th>
                                                    <th className="py-2">Service Date</th>
                                                    <th className="py-2">Billed</th>
                                                    <th className="py-2">Paid</th>
                                                    <th className="py-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filePayments.map(payment => (
                                                    <tr key={payment.id}>
                                                        <td className="py-2 font-mono">{payment.claim_number}</td>
                                                        <td className="py-2">{payment.patient_name}</td>
                                                        <td className="py-2">{formatDate(payment.service_date)}</td>
                                                        <td className="py-2">{formatCurrency(payment.billed_amount)}</td>
                                                        <td className="py-2 text-green-600 font-medium">{formatCurrency(payment.paid_amount)}</td>
                                                        <td className="py-2">
                                                            {payment.matched ? (
                                                                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Matched</span>
                                                            ) : (
                                                                <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Unmatched</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {eraFiles.length === 0 && (
                    <div className="text-center py-12">
                        <FileUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No ERA files received yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
