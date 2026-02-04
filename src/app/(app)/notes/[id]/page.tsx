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
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
    status: string; // 'draft', 'signed', 'completed', 'amended'
    signed_at?: string;
    signed_by?: string;
    created_at: string;
    updated_at: string;
    patient?: {
        first_name: string;
        last_name: string;
        date_of_birth: string;
    };
}

export default function NotePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSignModal, setShowSignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchNote = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/notes/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch note');
                }
                const data = await response.json();
                setNote(data.note);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load note');
            } finally {
                setLoading(false);
            }
        };

        fetchNote();
    }, [id]);

    const handleSignNote = async () => {
        if (!note || note.status === 'signed') return;

        try {
            setSigning(true);
            const response = await fetch(`/api/notes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_signed: true }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to sign note');
            }

            const data = await response.json();
            setNote(data.note);
            setSuccessMessage('Note signed successfully!');
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
                        {note.status === 'signed' ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                <Lock className="h-4 w-4" />
                                Signed & Locked
                            </div>
                        ) : (
                            <>
                                <Link
                                    href={`/notes/new?edit=${id}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
                                >
                                    <Edit3 className="h-4 w-4" />
                                    Edit Note
                                </Link>
                                <button
                                    onClick={() => setShowSignModal(true)}
                                    disabled={signing}
                                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {signing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Signing...
                                        </>
                                    ) : (
                                        <>
                                            <FileSignature className="h-4 w-4" />
                                            Sign Note
                                        </>
                                    )}
                                </button>
                            </>
                        )}
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
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</p>
                            <p className="text-base font-bold text-foreground">
                                {new Date(note.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${note.status === 'signed'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                            }`}>
                            {note.status === 'signed' ? <Lock className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Status</p>
                            <p className="text-base font-bold text-foreground capitalize">
                                {note.status || 'draft'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {hasSOAPContent ? (
                        <div className="grid grid-cols-1 gap-6">
                            {/* Subjective */}
                            {note.subjective && (
                                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                        <span className="h-6 w-6 rounded bg-primary text-white flex items-center justify-center text-xs font-black">S</span>
                                        <h3 className="font-bold uppercase tracking-widest text-xs">Subjective</h3>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-foreground leading-relaxed italic text-sm">
                                            "{note.subjective}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Objective */}
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

                            {/* Assessment */}
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

                            {/* Plan */}
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
                        /* Narrative/Content Format */
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
                        <Trash2 className="h-5 w-5" />
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={showSignModal}
                onClose={() => setShowSignModal(false)}
                onConfirm={handleSignNote}
                title="Sign Note"
                message="Are you sure you want to sign this note? Once signed, it cannot be edited."
                confirmText="Sign Note"
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
