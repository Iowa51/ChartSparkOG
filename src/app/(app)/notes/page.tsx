"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import {
    Search,
    ChevronRight,
    Clock,
    AlertCircle,
    User,
    Loader2,
    Plus
} from "lucide-react";
import Link from "next/link";

interface Note {
    id: string;
    patient_id: string;
    content?: string;
    status: string;
    created_at: string;
    updated_at: string;
    patient?: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

const statusStyles: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function NotesHistoryPage() {
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get("status");
    const [searchQuery, setSearchQuery] = useState("");
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                setLoading(true);
                setError(null);

                // Build query string
                let url = '/api/notes?limit=50';
                if (statusFilter) {
                    url += `&status=${statusFilter}`;
                }

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch notes');
                }
                const data = await response.json();
                setNotes(data.notes || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load notes');
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, [statusFilter]);

    // Filter notes based on search query (client-side filtering for search)
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true;
        const patientName = note.patient
            ? `${note.patient.first_name} ${note.patient.last_name}`.toLowerCase()
            : '';
        const contentPreview = (note.content || '').toLowerCase();
        return patientName.includes(searchQuery.toLowerCase()) ||
            contentPreview.includes(searchQuery.toLowerCase());
    });

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Clinical Notes"
                description="View and manage your clinical documentation history."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Notes" }
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-6">
                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search patients or content..."
                            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full md:w-auto">
                        <Link
                            href="/notes"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${!statusFilter ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            All Notes
                        </Link>
                        <Link
                            href="/notes?status=signed"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "signed" ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            Signed
                        </Link>
                        <Link
                            href="/notes?status=draft"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "draft" ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            Drafts
                        </Link>
                    </div>
                </div>

                {/* Notes List */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Patient</th>
                                        <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Content Preview</th>
                                        <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Last Updated</th>
                                        <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredNotes.length > 0 ? (
                                        filteredNotes.map((note) => (
                                            <tr key={note.id} className="hover:bg-muted/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {note.patient?.first_name?.[0]}{note.patient?.last_name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground">
                                                                {note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : 'Unknown Patient'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                Clinical Note
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                                                        {note.content?.substring(0, 80) || 'No content'}
                                                        {(note.content?.length || 0) > 80 ? '...' : ''}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-foreground flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {new Date(note.updated_at || note.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusStyles[note.status] || statusStyles.draft}`}>
                                                        {note.status || 'draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/notes/${note.id}`}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-primary hover:text-white rounded-xl text-sm font-medium transition-all group-hover:scale-105"
                                                    >
                                                        {note.status === "signed" ? "View" : "Edit"}
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-3">
                                                    <AlertCircle className="h-8 w-8 opacity-20" />
                                                    <p>No notes found.</p>
                                                    <Link
                                                        href="/notes/new"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Create First Note
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
