"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Clock,
    CheckCircle2,
    Flag,
    Square,
    CheckSquare,
    Loader2,
    Timer,
    ClipboardList,
    AlertTriangle,
} from "lucide-react";

interface ChecklistItem {
    id: string;
    checklist_item: string;
    category: string;
    is_required: boolean;
}

interface Props {
    submissionId: string;
    cptCode: string;
    currentStatus: string;
    checklistItems: ChecklistItem[];
    auditorId: string;
}

// Flag templates
const FLAG_TEMPLATES = [
    { label: "Missing documentation", reason: "Missing required documentation for medical necessity" },
    { label: "Incomplete treatment plan", reason: "Treatment plan is incomplete or missing key elements" },
    { label: "Session duration unclear", reason: "Session duration documentation is unclear or missing" },
    { label: "Coding discrepancy", reason: "Potential coding discrepancy - CPT code may not match documented services" },
    { label: "Missing signature", reason: "Provider signature or date is missing from documentation" },
];

export function AuditWorkspace({ submissionId, cptCode, currentStatus, checklistItems, auditorId }: Props) {
    const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagReason, setFlagReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [auditNotes, setAuditNotes] = useState("");

    // Timer state
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<Date | null>(null);

    // Start timer and create session on mount
    useEffect(() => {
        if (currentStatus !== 'pending_audit') return;

        startTimeRef.current = new Date();

        // Create audit session
        const createSession = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('audit_sessions')
                .insert({
                    submission_id: submissionId,
                    auditor_id: auditorId,
                    started_at: startTimeRef.current?.toISOString(),
                })
                .select('id')
                .single();

            if (data) {
                setSessionId(data.id);
            }
        };

        createSession();

        // Start timer
        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [submissionId, auditorId, currentStatus]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleCheckItem = (id: string) => {
        const newSet = new Set(completedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setCompletedItems(newSet);
    };

    const requiredItems = checklistItems.filter(i => i.is_required);
    const allRequiredComplete = requiredItems.every(i => completedItems.has(i.id));

    const endSession = async (actionTaken: string) => {
        if (!sessionId) return;

        const supabase = createClient();
        await supabase
            .from('audit_sessions')
            .update({
                ended_at: new Date().toISOString(),
                duration_seconds: elapsedSeconds,
                checklist_completed: [...completedItems],
                notes: auditNotes,
                action_taken: actionTaken,
            })
            .eq('id', sessionId);
    };

    const handleApprove = async () => {
        if (!allRequiredComplete && checklistItems.length > 0) {
            alert('Please complete all required checklist items before approving.');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/auditor/batch-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    submissionIds: [submissionId],
                }),
            });

            if (!response.ok) throw new Error('Failed to approve');

            await endSession('approved');
            window.location.href = '/auditor/submissions';
        } catch (error) {
            console.error('Approve error:', error);
            alert('Failed to approve submission');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFlag = async () => {
        const reason = flagReason || customReason;
        if (!reason.trim()) {
            alert('Please select or enter a reason');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/auditor/batch-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'flag',
                    submissionIds: [submissionId],
                    reason: reason,
                }),
            });

            if (!response.ok) throw new Error('Failed to flag');

            await endSession('flagged');
            window.location.href = '/auditor/submissions';
        } catch (error) {
            console.error('Flag error:', error);
            alert('Failed to flag submission');
        } finally {
            setIsProcessing(false);
        }
    };

    const isPending = currentStatus === 'pending_audit';

    // Group checklist by category
    const groupedChecklist = checklistItems.reduce((acc, item) => {
        const cat = item.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, ChecklistItem[]>);

    const categoryLabels: Record<string, string> = {
        documentation: 'Documentation',
        medical_necessity: 'Medical Necessity',
        treatment: 'Treatment Plan',
        clinical: 'Clinical Notes',
        compliance: 'Compliance',
        general: 'General',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist Panel */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-amber-500" />
                        CPT {cptCode} Audit Checklist
                    </h2>
                    {checklistItems.length > 0 && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {completedItems.size}/{checklistItems.length} complete
                        </span>
                    )}
                </div>

                {checklistItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No checklist defined for CPT code {cptCode}</p>
                        <p className="text-sm mt-1">You can still approve or flag this submission.</p>
                    </div>
                ) : (
                    <div className="p-5 space-y-6">
                        {Object.entries(groupedChecklist).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                    {categoryLabels[category] || category}
                                </h3>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => isPending && toggleCheckItem(item.id)}
                                            disabled={!isPending}
                                            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${completedItems.has(item.id)
                                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                } ${!isPending ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {completedItems.has(item.id) ? (
                                                <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <Square className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className={`text-sm ${completedItems.has(item.id) ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {item.checklist_item}
                                                {item.is_required && (
                                                    <span className="text-red-500 ml-1">*</span>
                                                )}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <p className="text-xs text-slate-400 mt-2">* Required items</p>
                    </div>
                )}
            </div>

            {/* Action Panel */}
            <div className="space-y-4">
                {/* Timer */}
                {isPending && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Timer className="h-4 w-4" />
                                Audit Time
                            </span>
                            <span className={`font-mono text-2xl font-bold ${elapsedSeconds > 300 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                                {formatTime(elapsedSeconds)}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all ${elapsedSeconds > 300 ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min((elapsedSeconds / 300) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Target: 5 minutes per audit</p>
                    </div>
                )}

                {/* Audit Notes */}
                {isPending && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Audit Notes (Optional)
                        </label>
                        <textarea
                            value={auditNotes}
                            onChange={(e) => setAuditNotes(e.target.value)}
                            placeholder="Add any notes about this audit..."
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm h-20 resize-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                {isPending && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                        <button
                            onClick={handleApprove}
                            disabled={isProcessing || (!allRequiredComplete && checklistItems.length > 0)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-800 text-white rounded-lg font-medium transition-colors"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5" />
                            )}
                            Approve Submission
                        </button>
                        <button
                            onClick={() => setShowFlagModal(true)}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
                        >
                            <Flag className="h-5 w-5" />
                            Flag for Review
                        </button>
                        {!allRequiredComplete && checklistItems.length > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Complete all required items to approve
                            </p>
                        )}
                    </div>
                )}

                {/* Already Processed */}
                {!isPending && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-5 text-center">
                        <p className="text-slate-600 dark:text-slate-400">
                            This submission has already been {currentStatus.replace('_', ' ')}.
                        </p>
                    </div>
                )}
            </div>

            {/* Flag Modal */}
            {showFlagModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFlagModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Flag className="h-5 w-5 text-red-500" />
                            Flag Submission
                        </h3>

                        <div className="space-y-2 mb-4">
                            {FLAG_TEMPLATES.map((template, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setFlagReason(template.reason); setCustomReason(''); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${flagReason === template.reason
                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                >
                                    <span className="font-medium">{template.label}</span>
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={customReason}
                            onChange={(e) => { setCustomReason(e.target.value); setFlagReason(''); }}
                            placeholder="Or enter custom reason..."
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg h-20 resize-none mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFlagModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFlag}
                                disabled={isProcessing || (!flagReason && !customReason.trim())}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                                Flag
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
