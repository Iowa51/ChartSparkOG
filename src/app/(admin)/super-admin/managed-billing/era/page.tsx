/**
 * Super Admin: ERA Files and Payments
 * View received ERA/835 files and payment details with file upload
 */

'use client';

import { useEffect, useState, useRef } from 'react';
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
        total_claims: 45,
        total_paid: 4525000,
        claims_matched: 43,
        claims_unmatched: 2,
    },
    {
        id: '2',
        file_name: 'ERA_AETNA_20260122_003.835',
        received_at: '2026-01-22T15:45:00Z',
        status: 'processed',
        total_claims: 28,
        total_paid: 2870000,
        claims_matched: 28,
        claims_unmatched: 0,
    },
    {
        id: '3',
        file_name: 'ERA_UHC_20260122_001.835',
        received_at: '2026-01-22T09:15:00Z',
        status: 'partial',
        total_claims: 52,
        total_paid: 3950000,
        claims_matched: 47,
        claims_unmatched: 5,
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
    {
        id: '3',
        era_file_id: '1',
        claim_number: 'UNKNOWN-001',
        patient_name: 'Unknown Patient',
        payer_name: 'Blue Cross Blue Shield',
        service_date: '2026-01-17',
        billed_amount: 8500,
        paid_amount: 7000,
        adjustment_amount: 1500,
        patient_responsibility: 0,
        matched: false,
    },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    received: { label: 'Received', color: 'bg-blue-100 text-blue-700', icon: Clock },
    processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    processed: { label: 'Processed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    error: { label: 'Error', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    partial: { label: 'Partial Match', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export default function ERAPage() {
    const [eraFiles, setERAFiles] = useState<ERAFile[]>(DEMO_ERA_FILES);
    const [payments, setPayments] = useState<ERAPayment[]>(DEMO_PAYMENTS);
    const [expandedFile, setExpandedFile] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
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
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.835') || file.name.endsWith('.txt')) {
                setSelectedFile(file);
            } else {
                addToast('error', 'Please upload an .835 or .txt file');
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.name.endsWith('.835') || file.name.endsWith('.txt')) {
                setSelectedFile(file);
            } else {
                addToast('error', 'Please upload an .835 or .txt file');
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Add new ERA file to list
        const newFile: ERAFile = {
            id: (eraFiles.length + 1).toString(),
            file_name: selectedFile.name,
            received_at: new Date().toISOString(),
            status: 'processing',
            total_claims: 0,
            total_paid: 0,
            claims_matched: 0,
            claims_unmatched: 0,
        };

        setERAFiles(prev => [newFile, ...prev]);
        addToast('success', `ERA file "${selectedFile.name}" uploaded successfully. Processing...`);

        // Simulate processing completion after 3 seconds
        setTimeout(() => {
            setERAFiles(prev => prev.map(f =>
                f.id === newFile.id
                    ? {
                        ...f,
                        status: 'processed' as const,
                        total_claims: Math.floor(Math.random() * 30) + 10,
                        total_paid: Math.floor(Math.random() * 5000000) + 1000000,
                        claims_matched: Math.floor(Math.random() * 25) + 8,
                        claims_unmatched: Math.floor(Math.random() * 5),
                    }
                    : f
            ));
            addToast('info', `ERA file "${selectedFile.name}" processed. Payments posted.`);
        }, 3000);

        setUploading(false);
        setSelectedFile(null);
        setShowUploadModal(false);
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right duration-300 ${toast.type === 'success'
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

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Upload ERA/835 File
                            </h2>
                            <button
                                onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragActive
                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                : selectedFile
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".835,.txt"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {selectedFile ? (
                                <div className="space-y-2">
                                    <FileText className="w-12 h-12 text-green-600 mx-auto" />
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <FileUp className="w-12 h-12 text-slate-400 mx-auto" />
                                    <p className="font-medium text-slate-900 dark:text-white">
                                        Drag and drop your ERA file here
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        or click to browse • Supports .835 and .txt files
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || uploading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload & Process
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            ERA Files & Payments
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Electronic Remittance Advice files received
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Upload ERA File
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {eraFiles.length}
                            </p>
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
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(eraFiles.reduce((sum, f) => sum + f.total_paid, 0))}
                            </p>
                            <p className="text-sm text-slate-500">Total Received</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {eraFiles.reduce((sum, f) => sum + f.claims_matched, 0)}
                            </p>
                            <p className="text-sm text-slate-500">Claims Matched</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">
                                {eraFiles.reduce((sum, f) => sum + f.claims_unmatched, 0)}
                            </p>
                            <p className="text-sm text-slate-500">Unmatched</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ERA Files List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Recent ERA Files
                    </h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {eraFiles.map((file) => {
                        const status = statusConfig[file.status];
                        const StatusIcon = status.icon;
                        const isExpanded = expandedFile === file.id;
                        const filePayments = payments.filter(p => p.era_file_id === file.id);

                        return (
                            <div key={file.id}>
                                <div
                                    className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    onClick={() => setExpandedFile(isExpanded ? null : file.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {file.file_name}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    Received {formatDate(file.received_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="font-medium text-green-600">
                                                    {formatCurrency(file.total_paid)}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {file.total_claims} claims
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                {file.status === 'processing' ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                )}
                                                {status.label}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                                                    <Download className="w-4 h-4 text-slate-500" />
                                                </button>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Payments */}
                                {isExpanded && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-xs text-slate-500 uppercase">
                                                    <th className="text-left pb-2">Claim #</th>
                                                    <th className="text-left pb-2">Patient</th>
                                                    <th className="text-left pb-2">Service Date</th>
                                                    <th className="text-right pb-2">Billed</th>
                                                    <th className="text-right pb-2">Paid</th>
                                                    <th className="text-right pb-2">Adj.</th>
                                                    <th className="text-left pb-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filePayments.map((payment) => (
                                                    <tr key={payment.id} className="text-sm">
                                                        <td className="py-2 font-mono">{payment.claim_number}</td>
                                                        <td className="py-2">{payment.patient_name}</td>
                                                        <td className="py-2">{payment.service_date}</td>
                                                        <td className="py-2 text-right">{formatCurrency(payment.billed_amount)}</td>
                                                        <td className="py-2 text-right text-green-600 font-medium">
                                                            {formatCurrency(payment.paid_amount)}
                                                        </td>
                                                        <td className="py-2 text-right text-red-500">
                                                            -{formatCurrency(payment.adjustment_amount)}
                                                        </td>
                                                        <td className="py-2">
                                                            {payment.matched ? (
                                                                <span className="text-green-600 flex items-center gap-1">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Matched
                                                                </span>
                                                            ) : (
                                                                <Link
                                                                    href="/super-admin/managed-billing/unmatched"
                                                                    className="text-orange-600 flex items-center gap-1 hover:underline"
                                                                >
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    Unmatched
                                                                </Link>
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
            </div>
        </div>
    );
}
