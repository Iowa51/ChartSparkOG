"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FileText,
    Search,
    Eye,
    AlertTriangle,
    Calendar,
    User,
    Clock,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Loader2,
    Tag,
    Send,
    Filter,
} from "lucide-react";

interface ReviewNote {
    id: string;
    type?: string;
    chief_complaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    content?: string;
    status: string;
    created_at: string;
    updated_at: string;
    cpt_codes?: string[];
    icd10_codes?: string[];
    patient?: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

export default function AuditorNotesPage() {
    const [notes, setNotes] = useState<ReviewNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNote, setSelectedNote] = useState<ReviewNote | null>(null);
    const [reviewFeedback, setReviewFeedback] = useState("");
    const [reviewAction, setReviewAction] = useState<"approve" | "needs_revision" | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("pending_review");
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchNotes = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/notes");
            if (!res.ok) throw new Error("Failed to fetch notes");
            const data = await res.json();
            // Filter for review-relevant statuses
            const reviewNotes = (data.notes || []).filter((n: ReviewNote) =>
                ["pending_review", "approved", "needs_revision"].includes(n.status)
            );
            setNotes(reviewNotes);
        } catch {
            setError("Failed to load notes");
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const handleReview = async (action: "approve" | "needs_revision") => {
        if (!selectedNote) return;
        if (action === "needs_revision" && !reviewFeedback.trim()) {
            setError("Feedback is required when requesting revision");
            setTimeout(() => setError(null), 3000);
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch(`/api/notes/${selectedNote.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, feedback: reviewFeedback }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit review");
            }
            setSuccessMessage(
                action === "approve"
                    ? "Note approved — ready for billing!"
                    : "Revision requested — clinician notified"
            );
            setTimeout(() => setSuccessMessage(null), 3000);
            setSelectedNote(null);
            setReviewFeedback("");
            setReviewAction(null);
            fetchNotes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Review failed");
            setTimeout(() => setError(null), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredNotes = notes.filter((note) => {
        const matchesSearch =
            !searchQuery ||
            `${note.patient?.first_name} ${note.patient?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || note.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = notes.filter(n => n.status === "pending_review").length;
    const approvedCount = notes.filter(n => n.status === "approved").length;
    const revisionCount = notes.filter(n => n.status === "needs_revision").length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending_review":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pending Review</span>;
            case "approved":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Approved</span>;
            case "needs_revision":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Needs Revision</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{status}</span>;
        }
    };

    return (
        <div className="flex-1 overflow-auto">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Note Review Queue</h1>
                        <p className="text-slate-500 text-sm mt-1">Review clinical documentation before billing submission</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-bold text-amber-700">{pendingCount} Pending</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 rounded-lg">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-bold text-emerald-700">{approvedCount} Approved</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 rounded-lg">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-bold text-red-700">{revisionCount} Revisions</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Search & Filter Bar */}
                <div className="flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by patient name or note ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        {["pending_review", "approved", "needs_revision", "all"].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === filter
                                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                                    }`}
                            >
                                {filter === "all" ? "All" :
                                    filter === "pending_review" ? "Pending" :
                                        filter === "approved" ? "Approved" : "Revisions"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                        <p className="text-slate-500 font-medium">No notes in this queue</p>
                        <p className="text-slate-400 text-sm mt-1">Notes submitted for review will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => setSelectedNote(note)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {getStatusBadge(note.status)}
                                            <span className="px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">
                                                {note.type || "Clinical Note"}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-1">
                                            {note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : "Unknown Patient"}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2">
                                            {note.subjective || note.content || note.chief_complaint || "No preview available"}
                                        </p>

                                        {/* Codes Preview */}
                                        {(note.cpt_codes?.length || note.icd10_codes?.length) ? (
                                            <div className="flex items-center gap-2 mt-3">
                                                <Tag className="h-3.5 w-3.5 text-slate-400" />
                                                {note.cpt_codes?.map(c => (
                                                    <span key={c} className="text-xs font-mono px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-bold">{c}</span>
                                                ))}
                                                {note.icd10_codes?.map(c => (
                                                    <span key={c} className="text-xs font-mono px-2 py-0.5 bg-purple-50 text-purple-600 rounded font-bold">{c}</span>
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(note.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-amber-500 transition-colors mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {selectedNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedNote(null); setReviewAction(null); setReviewFeedback(""); }}>
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <Eye className="h-5 w-5 text-amber-500" />
                                <h3 className="text-lg font-bold">Review Note</h3>
                                {getStatusBadge(selectedNote.status)}
                            </div>
                            <button onClick={() => { setSelectedNote(null); setReviewAction(null); setReviewFeedback(""); }} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Patient & Meta */}
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 rounded-xl p-4">
                                <div><span className="text-slate-500">Patient:</span> <span className="font-bold">{selectedNote.patient ? `${selectedNote.patient.first_name} ${selectedNote.patient.last_name}` : "Unknown"}</span></div>
                                <div><span className="text-slate-500">Type:</span> <span className="font-bold capitalize">{selectedNote.type || "Clinical Note"}</span></div>
                                <div><span className="text-slate-500">Created:</span> <span className="font-bold">{new Date(selectedNote.created_at).toLocaleString()}</span></div>
                                <div><span className="text-slate-500">Status:</span> <span className="font-bold capitalize">{selectedNote.status.replace("_", " ")}</span></div>
                            </div>

                            {/* SOAP Content */}
                            {(selectedNote.subjective || selectedNote.objective || selectedNote.assessment || selectedNote.plan) ? (
                                <div className="space-y-3">
                                    {[
                                        { key: "subjective", label: "Subjective", color: "bg-primary" },
                                        { key: "objective", label: "Objective", color: "bg-blue-500" },
                                        { key: "assessment", label: "Assessment", color: "bg-purple-500" },
                                        { key: "plan", label: "Plan", color: "bg-emerald-500" },
                                    ].map(({ key, label, color }) => {
                                        const val = selectedNote[key as keyof ReviewNote] as string | undefined;
                                        if (!val) return null;
                                        return (
                                            <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="px-4 py-2 bg-slate-50 flex items-center gap-2">
                                                    <span className={`h-5 w-5 rounded ${color} text-white flex items-center justify-center text-xs font-black`}>{label[0]}</span>
                                                    <span className="font-bold text-xs uppercase tracking-widest text-slate-600">{label}</span>
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-sm text-slate-700 leading-relaxed">{val}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl p-4">
                                    <p className="text-sm text-slate-600">{selectedNote.content || selectedNote.chief_complaint || "No content"}</p>
                                </div>
                            )}

                            {/* Billing Codes */}
                            <div className="border border-slate-200 rounded-xl p-4">
                                <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    Billing Codes
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold mb-2">CPT Codes</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedNote.cpt_codes?.length ? selectedNote.cpt_codes.map(c => (
                                                <span key={c} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-mono font-bold border border-blue-200">{c}</span>
                                            )) : (
                                                <span className="text-sm text-slate-400 italic">None</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold mb-2">ICD-10 Codes</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedNote.icd10_codes?.length ? selectedNote.icd10_codes.map(c => (
                                                <span key={c} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-mono font-bold border border-purple-200">{c}</span>
                                            )) : (
                                                <span className="text-sm text-slate-400 italic">None</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Review Actions - Only for pending_review */}
                            {selectedNote.status === "pending_review" && (
                                <div className="border-t border-slate-200 pt-5 space-y-4">
                                    {/* Action Buttons */}
                                    {!reviewAction && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleReview("approve")}
                                                disabled={submitting}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                            >
                                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                Approve for Billing
                                            </button>
                                            <button
                                                onClick={() => setReviewAction("needs_revision")}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 border border-red-200 transition-colors"
                                            >
                                                <AlertTriangle className="h-4 w-4" />
                                                Request Revision
                                            </button>
                                        </div>
                                    )}

                                    {/* Revision Feedback Form */}
                                    {reviewAction === "needs_revision" && (
                                        <div className="bg-red-50 rounded-xl p-4 space-y-3">
                                            <label className="block font-bold text-sm text-red-700">
                                                What needs to be corrected?
                                            </label>
                                            <textarea
                                                value={reviewFeedback}
                                                onChange={(e) => setReviewFeedback(e.target.value)}
                                                placeholder="Describe what the clinician needs to fix..."
                                                rows={3}
                                                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-400 bg-white"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReview("needs_revision")}
                                                    disabled={submitting || !reviewFeedback.trim()}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                    Send Revision Request
                                                </button>
                                                <button
                                                    onClick={() => { setReviewAction(null); setReviewFeedback(""); }}
                                                    className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                </div>
            )}
            {error && (
                <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-red-600 text-white rounded-xl shadow-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
