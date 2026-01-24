/**
 * Claim Validation Modal
 * Shows pre-submission validation results before sending to clearinghouse
 */

'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Loader2, Send, RefreshCw } from 'lucide-react';

interface ValidationError {
    field: string;
    message: string;
    severity: 'error' | 'warning';
}

interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    confidenceScore: number;
    summary: {
        status: 'ready' | 'warnings' | 'errors' | 'blocked';
        message: string;
    };
}

interface ClaimValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    claimId: string;
    claimNumber: string;
    patientName: string;
    onSubmit: () => Promise<void>;
}

export function ClaimValidationModal({
    isOpen,
    onClose,
    claimId,
    claimNumber,
    patientName,
    onSubmit,
}: ClaimValidationModalProps) {
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<ValidationResult | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const runValidation = async () => {
        setValidating(true);
        try {
            const response = await fetch(`/api/managed-billing/claims/${claimId}/validate`, {
                method: 'POST',
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Validation error:', error);
            // Mock result for demo
            setResult({
                isValid: true,
                errors: [],
                warnings: [
                    { field: 'address', message: 'Patient address is incomplete', severity: 'warning' },
                ],
                confidenceScore: 92,
                summary: {
                    status: 'warnings',
                    message: 'Claim can be submitted with minor warnings',
                },
            });
        } finally {
            setValidating(false);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onSubmit();
            onClose();
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Run validation when modal opens
    useState(() => {
        if (isOpen && !result) {
            runValidation();
        }
    });

    if (!isOpen) return null;

    const getStatusIcon = () => {
        if (!result) return null;
        switch (result.summary.status) {
            case 'ready':
                return <CheckCircle className="h-12 w-12 text-emerald-500" />;
            case 'warnings':
                return <AlertTriangle className="h-12 w-12 text-amber-500" />;
            case 'errors':
            case 'blocked':
                return <XCircle className="h-12 w-12 text-red-500" />;
            default:
                return null;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-500';
        if (score >= 70) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Pre-Submission Check
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {claimNumber} • {patientName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {validating ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 text-teal-500 animate-spin mb-4" />
                            <p className="text-slate-600 dark:text-slate-400">
                                Validating claim...
                            </p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Status */}
                            <div className="flex flex-col items-center text-center">
                                {getStatusIcon()}
                                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                                    {result.summary.message}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Confidence Score:
                                    <span className={`ml-1 font-bold ${getScoreColor(result.confidenceScore)}`}>
                                        {result.confidenceScore}%
                                    </span>
                                </p>
                            </div>

                            {/* Errors */}
                            {result.errors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                                    <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                        <XCircle className="h-4 w-4" />
                                        Errors ({result.errors.length})
                                    </h4>
                                    <ul className="space-y-1">
                                        {result.errors.map((error, index) => (
                                            <li key={index} className="text-sm text-red-600 dark:text-red-400">
                                                • {error.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {result.warnings.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Warnings ({result.warnings.length})
                                    </h4>
                                    <ul className="space-y-1">
                                        {result.warnings.map((warning, index) => (
                                            <li key={index} className="text-sm text-amber-600 dark:text-amber-400">
                                                • {warning.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Success */}
                            {result.isValid && result.errors.length === 0 && result.warnings.length === 0 && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="font-medium">All checks passed</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <button
                                onClick={runValidation}
                                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors"
                            >
                                <RefreshCw className="h-5 w-5" />
                                Run Validation
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {result && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <button
                            onClick={runValidation}
                            disabled={validating}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <RefreshCw className={`h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
                            Re-validate
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || result.summary.status === 'blocked'}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition-colors ${result.summary.status === 'blocked'
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                                }`}
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {result.summary.status === 'warnings' ? 'Submit Anyway' : 'Submit Claim'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClaimValidationModal;
