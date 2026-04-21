"use client";

import { Header } from "@/components/layout";
import {
    Calendar,
    User,
    FileText,
    Edit3,
    Trash2,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Lock,
    Loader2,
    FileSignature,
    Send,
    AlertTriangle,
    DollarSign,
    X,
    Plus,
    Tag,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Note {
    id: string;
    patient_id: string;
    type?: string;
    chief_complaint?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    content?: string;
    status: string;
    signed_at?: string;
    created_at: string;
    updated_at: string;
    cpt_codes?: string[];
    icd10_codes?: string[];
    reviewer_feedback?: string;
    reviewed_at?: string;
    billing_amount?: number;
    patient?: {
        first_name: string;
        last_name: string;
        date_of_birth: string;
    };
}

// Common CPT codes for mental health
const COMMON_CPT_CODES = [
    { code: "90834", label: "Psychotherapy, 45 min" },
    { code: "90837", label: "Psychotherapy, 60 min" },
    { code: "90791", label: "Psychiatric Diagnostic Eval" },
    { code: "90792", label: "Psych Diagnostic Eval w/ Medical" },
    { code: "99213", label: "Office Visit, Est. (Low)" },
    { code: "99214", label: "Office Visit, Est. (Moderate)" },
    { code: "99215", label: "Office Visit, Est. (High)" },
    { code: "90833", label: "Psychotherapy Add-on, 30 min" },
    { code: "90836", label: "Psychotherapy Add-on, 45 min" },
    { code: "90847", label: "Family Therapy w/ Patient" },
];

export default function NotePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const actionParam = searchParams.get('action');

    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSignModal, setShowSignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // CPT/ICD-10 editing state
    const [editingCodes, setEditingCodes] = useState(false);
    const [cptCodes, setCptCodes] = useState<string[]>([]);
    const [icd10Codes, setIcd10Codes] = useState<string[]>([]);
    const [newCptCode, setNewCptCode] = useState("");
    const [newIcd10Code, setNewIcd10Code] = useState("");
    const [savingCodes, setSavingCodes] = useState(false);

    useEffect(() => {
        const fetchNote = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/notes/${id}`);
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to load note');
                }
                const data = await response.json();
                setNote(data.note);
                setCptCodes(data.note.cpt_codes || []);
                setIcd10Codes(data.note.icd10_codes || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load note');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchNote();
    }, [id]);

    // Auto-open submit modal when navigated with ?action=submit
    useEffect(() => {
        if (actionParam === 'submit' && note && (note.status === 'draft' || note.status === 'needs_revision')) {
            setShowSubmitModal(true);
        }
    }, [actionParam, note]);

    const handleSubmitForReview = async () => {
        if (!note) return;
        if (signing) return; // idempotent — ignore rapid double-clicks
        setSigning(true);
        try {
            const response = await fetch(`/api/notes/${id}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!response.ok) {
                let message = 'Failed to sign note';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch {
                    // leave default message
                }
                setError(message);
                setTimeout(() => setError(null), 4000);
                return; // keep the modal open on error
            }
            setShowSubmitModal(false);
            setSuccessMessage('Sent for review');
            router.push('/notes');
        } catch {
            setError('Failed to sign note');
            setTimeout(() => setError(null), 4000);
        } finally {
            setSigning(false);
        }
    };

    const handleSignNote = async () => {
        if (!note) return;
        try {
            setSigning(true);
            const response = await fetch(`/api/notes/${id}/sign`, {
                method: 'POST',
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to sign note');
            }
            const data = await response.json();
            setNote(data.note);
            setSuccessMessage('Note signed and locked!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to sign note');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSigning(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!note) return;
        try {
            setDeleting(true);
            const response = await fetch(`/api/notes/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete note');
            }
            router.push('/notes');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete note');
            setTimeout(() => setError(null), 3000);
        } finally {
            setDeleting(false);
        }
    };

    const handleSubmitClaim = async () => {
        if (!note) return;
        try {
            setSubmittingClaim(true);
            // Sign the note (final state after billing)
            const response = await fetch(`/api/notes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'signed',
                    signed_at: new Date().toISOString(),
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit claim');
            }
            const data = await response.json();
            setNote(data.note);
            setSuccessMessage('Claim submitted! Note signed and locked.');
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit claim');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSubmittingClaim(false);
        }
    };

    const handleSaveCodes = async () => {
        if (!note) return;
        try {
            setSavingCodes(true);
            const response = await fetch(`/api/notes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpt_codes: cptCodes, icd10_codes: icd10Codes }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save codes');
            }
            const data = await response.json();
            setNote(data.note);
            setEditingCodes(false);
            setSuccessMessage('Billing codes saved!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save codes');
            setTimeout(() => setError(null), 3000);
        } finally {
            setSavingCodes(false);
        }
    };

    const addCptCode = (code: string) => {
        if (code && !cptCodes.includes(code)) {
            setCptCodes([...cptCodes, code]);
        }
        setNewCptCode("");
    };

    const addIcd10Code = () => {
        const code = newIcd10Code.trim().toUpperCase();
        if (code && !icd10Codes.includes(code)) {
            setIcd10Codes([...icd10Codes, code]);
        }
        setNewIcd10Code("");
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'signed':
                return { label: 'Signed & Locked', color: 'bg-emerald-500/10 text-emerald-500', icon: Lock };
            case 'pending_review':
                return { label: 'Pending Review', color: 'bg-amber-500/10 text-amber-600', icon: Clock };
            case 'approved':
                return { label: 'Approved', color: 'bg-blue-500/10 text-blue-500', icon: CheckCircle2 };
            case 'needs_revision':
                return { label: 'Needs Revision', color: 'bg-red-500/10 text-red-500', icon: AlertTriangle };
            default:
                return { label: 'Draft', color: 'bg-amber-500/10 text-amber-500', icon: Clock };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
                <Header
                    title="Loading Note..."
                    description="Please wait"
                    breadcrumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Notes", href: "/notes" },
                        { label: `View Note` },
                    ]}
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading note...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
                <Header
                    title="Note Not Found"
                    description="Unable to load note"
                    breadcrumbs={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Notes", href: "/notes" },
                        { label: `View Note` },
                    ]}
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-lg text-destructive mb-4">{error || 'Note not found'}</p>
                        <Link
                            href="/notes"
                            className="text-primary hover:underline"
                        >
                            Back to Notes
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const patientName = note.patient
        ? `${note.patient.first_name} ${note.patient.last_name}`
        : 'Unknown Patient';

    const hasSOAPContent = !!(note.subjective || note.objective || note.assessment || note.plan);
    const statusConfig = getStatusConfig(note.status);
    const StatusIcon = statusConfig.icon;
    const isEditable = note.status === 'draft' || note.status === 'needs_revision';
    const canSubmitForReview = note.status === 'draft' || note.status === 'needs_revision';
    const canSubmitClaim = note.status === 'approved';
    const isLocked = note.status === 'signed';

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title={`Note: ${note.type || 'Clinical Note'}`}
                description={`Viewing record for ${patientName}`}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Notes", href: "/notes" },
                    { label: `View Note` },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Revision Feedback Banner */}
                {note.status === 'needs_revision' && note.reviewer_feedback && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="font-bold text-red-700 dark:text-red-400 mb-1">Revision Requested by Auditor</h4>
                                <p className="text-sm text-red-600 dark:text-red-300">{note.reviewer_feedback}</p>
                                {note.reviewed_at && (
                                    <p className="text-xs text-red-400 mt-2">
                                        {new Date(note.reviewed_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/notes"
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Notes
                    </Link>
                    <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${statusConfig.color} border border-current/10`}>
                            <StatusIcon className="h-4 w-4" />
                            {statusConfig.label}
                        </div>

                        {/* Edit Button - only for draft/needs_revision */}
                        {isEditable && (
                            <Link
                                href={`/notes/new?edit=${id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
                            >
                                <Edit3 className="h-4 w-4" />
                                Edit Note
                            </Link>
                        )}

                        {/* Submit for Review - only for draft/needs_revision */}
                        {canSubmitForReview && (
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                disabled={signing}
                                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {signing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Sign & Send for Review
                                    </>
                                )}
                            </button>
                        )}

                        {/* Submit Claim - only for approved notes */}
                        {canSubmitClaim && (
                            <button
                                onClick={() => setShowClaimModal(true)}
                                disabled={submittingClaim}
                                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingClaim ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <DollarSign className="h-4 w-4" />
                                        Submit Claim
                                    </>
                                )}
                            </button>
                        )}

                        {/* Delete - always available unless signed */}
                        {!isLocked && (
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                                {deleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* Note Meta Card */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Patient</p>
                            <p className="text-base font-bold text-foreground">{patientName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Created</p>
                            <p className="text-base font-bold text-foreground">
                                {new Date(note.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${statusConfig.color}`}>
                            <StatusIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Status</p>
                            <p className="text-base font-bold text-foreground capitalize">
                                {statusConfig.label}
                            </p>
                        </div>
                    </div>
                </div>

                {/* SOAP Content Area */}
                <div className="space-y-6">
                    {hasSOAPContent ? (
                        <div className="grid grid-cols-1 gap-6">
                            {note.subjective && (
                                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                        <span className="h-6 w-6 rounded bg-primary text-white flex items-center justify-center text-xs font-black">S</span>
                                        <h3 className="font-bold uppercase tracking-widest text-xs">Subjective</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-foreground leading-relaxed italic text-sm">
                                            &quot;{note.subjective}&quot;
                                        </p>
                                    </div>
                                </div>
                            )}

                            {note.objective && (
                                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                        <span className="h-6 w-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-black">O</span>
                                        <h3 className="font-bold uppercase tracking-widest text-xs">Objective</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-foreground leading-relaxed text-sm">
                                            {note.objective}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {note.assessment && (
                                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                        <span className="h-6 w-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-black">A</span>
                                        <h3 className="font-bold uppercase tracking-widest text-xs">Assessment</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-foreground leading-relaxed text-sm">
                                            {note.assessment}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {note.plan && (
                                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                        <span className="h-6 w-6 rounded bg-emerald-500 text-white flex items-center justify-center text-xs font-black">P</span>
                                        <h3 className="font-bold uppercase tracking-widest text-xs">Plan</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-foreground leading-relaxed text-sm">
                                            {note.plan}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <h3 className="font-bold uppercase tracking-widest text-xs">Note Content</h3>
                            </div>
                            <div className="p-8">
                                <p className="text-foreground leading-[1.8] text-base whitespace-pre-line">
                                    {note.content || note.chief_complaint || 'No content available'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* CPT / ICD-10 Codes Section */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-primary" />
                            <h3 className="font-bold uppercase tracking-widest text-xs">Billing Codes</h3>
                        </div>
                        {isEditable && !editingCodes && (
                            <button
                                onClick={() => setEditingCodes(true)}
                                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                                Edit Codes
                            </button>
                        )}
                        {editingCodes && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setEditingCodes(false); setCptCodes(note.cpt_codes || []); setIcd10Codes(note.icd10_codes || []); }}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCodes}
                                    disabled={savingCodes}
                                    className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {savingCodes && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="p-6 space-y-5">
                        {/* CPT Codes */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">CPT Codes</p>
                            <div className="flex flex-wrap gap-2">
                                {cptCodes.length === 0 && !editingCodes && (
                                    <p className="text-sm text-muted-foreground italic">No CPT codes assigned</p>
                                )}
                                {cptCodes.map((code) => {
                                    const info = COMMON_CPT_CODES.find(c => c.code === code);
                                    return (
                                        <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-mono font-bold border border-blue-200 dark:border-blue-800">
                                            {code}
                                            {info && <span className="font-normal text-blue-500 dark:text-blue-400 text-xs">({info.label})</span>}
                                            {editingCodes && (
                                                <button onClick={() => setCptCodes(cptCodes.filter(c => c !== code))} className="ml-1 text-blue-400 hover:text-blue-600">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </span>
                                    );
                                })}
                                {editingCodes && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={newCptCode}
                                            onChange={(e) => { if (e.target.value) addCptCode(e.target.value); }}
                                            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-card"
                                        >
                                            <option value="">+ Add CPT</option>
                                            {COMMON_CPT_CODES.filter(c => !cptCodes.includes(c.code)).map(c => (
                                                <option key={c.code} value={c.code}>{c.code} - {c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ICD-10 Codes */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">ICD-10 Diagnosis Codes</p>
                            <div className="flex flex-wrap gap-2">
                                {icd10Codes.length === 0 && !editingCodes && (
                                    <p className="text-sm text-muted-foreground italic">No ICD-10 codes assigned</p>
                                )}
                                {icd10Codes.map((code) => (
                                    <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-mono font-bold border border-purple-200 dark:border-purple-800">
                                        {code}
                                        {editingCodes && (
                                            <button onClick={() => setIcd10Codes(icd10Codes.filter(c => c !== code))} className="ml-1 text-purple-400 hover:text-purple-600">
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                                {editingCodes && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={newIcd10Code}
                                            onChange={(e) => setNewIcd10Code(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIcd10Code(); } }}
                                            placeholder="e.g. F32.1"
                                            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-card w-28 font-mono"
                                        />
                                        <button
                                            onClick={addIcd10Code}
                                            className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 hover:bg-purple-200"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 p-4 bg-muted/20 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {note.status === 'signed' && note.signed_at
                        ? `Signed on ${new Date(note.signed_at).toLocaleString()}`
                        : `Last updated ${new Date(note.updated_at).toLocaleString()}`
                    }
                </div>
            </div>

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                </div>
            )}
            {error && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-red-600 text-white rounded-xl shadow-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onConfirm={handleSubmitForReview}
                title="Sign & Send for Review"
                message="This will sign the note and send it to an auditor for review. You won't be able to edit the note until the auditor responds. Make sure all CPT and ICD-10 codes are correct before continuing."
                confirmText="Sign & Send for Review"
                variant="primary"
                icon="sign"
                asyncConfirm
                isLoading={signing}
                loadingText="Sending…"
            />
            <ConfirmModal
                isOpen={showClaimModal}
                onClose={() => setShowClaimModal(false)}
                onConfirm={handleSubmitClaim}
                title="Submit Claim"
                message="This will generate a claim and submit it for billing. The note will be signed and locked permanently."
                confirmText="Submit Claim"
                variant="primary"
                icon="sign"
            />
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteNote}
                title="Delete Note"
                message="Are you sure you want to delete this note? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
                icon="delete"
            />
        </div>
    );
}
