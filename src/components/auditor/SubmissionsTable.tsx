"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    ClipboardCheck,
    Search,
    Eye,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Building2,
    Check,
    Square,
    CheckSquare,
    Loader2,
    Flag,
} from "lucide-react";
import Link from "next/link";

interface Submission {
    id: string;
    cpt_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    patient_name: string;
    provider_name: string;
    organization_name: string;
    organization_id: string;
}

// Pre-defined flag templates for common issues
const FLAG_TEMPLATES = [
    { id: 1, label: "Missing documentation", reason: "Missing required documentation for medical necessity" },
    { id: 2, label: "Incomplete treatment plan", reason: "Treatment plan is incomplete or missing key elements" },
    { id: 3, label: "Session duration unclear", reason: "Session duration documentation is unclear or missing" },
    { id: 4, label: "Coding discrepancy", reason: "Potential coding discrepancy - CPT code may not match documented services" },
    { id: 5, label: "Missing signature", reason: "Provider signature or date is missing from documentation" },
];

export function SubmissionsTable({ submissions }: { submissions: Submission[] }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagReason, setFlagReason] = useState("");
    const [customReason, setCustomReason] = useState("");

    const filteredSubmissions = submissions.filter(sub => {
        const matchesSearch =
            sub.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.cpt_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending_audit');
    const canBatchAction = selectedIds.size > 0 && [...selectedIds].every(id =>
        pendingSubmissions.some(s => s.id === id)
    );

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === pendingSubmissions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pendingSubmissions.map(s => s.id)));
        }
    };

    const handleBatchApprove = async () => {
        if (!canBatchAction) return;
        setIsProcessing(true);

        try {
            const response = await fetch('/api/auditor/batch-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    submissionIds: [...selectedIds],
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to approve submissions');
            }

            window.location.reload();
        } catch (error) {
            console.error('Batch approve error:', error);
            alert('Failed to approve submissions');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBatchFlag = async () => {
        const reason = flagReason || customReason;
        if (!reason.trim()) {
            alert('Please select or enter a reason for flagging');
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch('/api/auditor/batch-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'flag',
                    submissionIds: [...selectedIds],
                    reason: reason,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to flag submissions');
            }

            setShowFlagModal(false);
            window.location.reload();
        } catch (error) {
            console.error('Batch flag error:', error);
            alert('Failed to flag submissions');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending_audit":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">Pending</span>;
            case "flagged":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Flagged</span>;
            case "approved":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Approved</span>;
            case "rejected":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Rejected</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{status}</span>;
        }
    };

    return (
        <>
            {/* Search & Batch Actions Bar */}
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by patient, provider, CPT code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>

                {/* Batch Action Buttons */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                            {selectedIds.size} selected
                        </span>
                        <button
                            onClick={handleBatchApprove}
                            disabled={isProcessing || !canBatchAction}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Batch Approve
                        </button>
                        <button
                            onClick={() => setShowFlagModal(true)}
                            disabled={isProcessing || !canBatchAction}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Flag className="h-4 w-4" />
                            Batch Flag
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Submissions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-slate-400 hover:text-amber-600 transition-colors"
                                >
                                    {selectedIds.size === pendingSubmissions.length && pendingSubmissions.length > 0 ? (
                                        <CheckSquare className="h-5 w-5" />
                                    ) : (
                                        <Square className="h-5 w-5" />
                                    )}
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Patient</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Provider</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Organization</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">CPT Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSubmissions.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p>No submissions found</p>
                                </td>
                            </tr>
                        ) : (
                            filteredSubmissions.map((submission) => (
                                <tr key={submission.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedIds.has(submission.id) ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                                    <td className="px-4 py-3">
                                        {submission.status === 'pending_audit' && (
                                            <button
                                                onClick={() => toggleSelect(submission.id)}
                                                className="text-slate-400 hover:text-amber-600 transition-colors"
                                            >
                                                {selectedIds.has(submission.id) ? (
                                                    <CheckSquare className="h-5 w-5 text-amber-600" />
                                                ) : (
                                                    <Square className="h-5 w-5" />
                                                )}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{submission.patient_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{submission.provider_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {submission.organization_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">{submission.cpt_code}</td>
                                    <td className="px-4 py-3">{getStatusBadge(submission.status)}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(submission.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/auditor/submissions/${submission.id}`}
                                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors inline-flex"
                                            title="Review submission"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Flag Modal with Templates */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFlagModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Flag className="h-5 w-5 text-red-500" />
                            Flag {selectedIds.size} Submission{selectedIds.size > 1 ? 's' : ''}
                        </h3>

                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Select a common issue or enter a custom reason:
                        </p>

                        {/* Flag Templates */}
                        <div className="space-y-2 mb-4">
                            {FLAG_TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        setFlagReason(template.reason);
                                        setCustomReason('');
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${flagReason === template.reason
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                >
                                    <span className="font-medium">{template.label}</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{template.reason}</p>
                                </button>
                            ))}
                        </div>

                        {/* Custom Reason */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Or enter custom reason:
                            </label>
                            <textarea
                                value={customReason}
                                onChange={(e) => {
                                    setCustomReason(e.target.value);
                                    setFlagReason('');
                                }}
                                placeholder="Describe the compliance issue..."
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-20 resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFlagModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBatchFlag}
                                disabled={isProcessing || (!flagReason && !customReason.trim())}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Flag className="h-4 w-4" />
                                )}
                                Flag Submissions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
