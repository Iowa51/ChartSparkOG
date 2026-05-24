"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CSCard, CSPageHeader, CSBadge, CSButton } from "@/components/cs";
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

const statusBadgeVariant = (status?: string): 'success' | 'warning' | 'info' | 'default' => {
    switch (status) {
        case 'signed': return 'success';
        case 'completed': return 'info';
        case 'draft': return 'warning';
        default: return 'default';
    }
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
                    // In demo mode, API returns 403 — use demo data
                    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
                    if (isDemoMode) {
                        setNotes(getDemoNotes());
                        return;
                    }
                    throw new Error('Failed to fetch notes');
                }
                const data = await response.json();
                setNotes(data.notes || []);
            } catch (err) {
                // Fallback to demo data if demo mode
                const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
                if (isDemoMode) {
                    setNotes(getDemoNotes());
                    return;
                }
                setError(err instanceof Error ? err.message : 'Failed to load notes');
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, [statusFilter]);

    function getDemoNotes(): Note[] {
        const now = new Date();
        return [
            {
                id: 'demo-note-1',
                patient_id: 'demo-p1',
                content: 'Patient presents for follow-up of Major Depressive Disorder. Reports improvement in mood with current medication regimen. Sleep quality has improved to 7 hours nightly...',
                status: 'signed',
                created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
                updated_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
                patient: { id: 'demo-p1', first_name: 'Maria', last_name: 'Gonzalez' },
            },
            {
                id: 'demo-note-2',
                patient_id: 'demo-p2',
                content: 'CBT session focused on cognitive restructuring techniques for generalized anxiety. Patient engaged well. Identified 3 automatic negative thoughts and developed rational alternatives...',
                status: 'draft',
                created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
                updated_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
                patient: { id: 'demo-p2', first_name: 'James', last_name: 'Thompson' },
            },
            {
                id: 'demo-note-3',
                patient_id: 'demo-p3',
                content: 'Initial psychiatric evaluation. Patient referred by PCP for persistent anxiety and insomnia. Comprehensive history obtained including family, social, and substance use history...',
                status: 'completed',
                created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
                updated_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
                patient: { id: 'demo-p3', first_name: 'Demo', last_name: 'Patient C' },
            },
            {
                id: 'demo-note-4',
                patient_id: 'demo-p4',
                content: 'Medication management visit. Reviewed current medications including sertraline 100mg daily. Patient reports decreased anxiety but ongoing sleep difficulties. Discussed adding trazodone PRN...',
                status: 'signed',
                created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
                updated_at: new Date(now.getTime() - 4 * 86400000).toISOString(),
                patient: { id: 'demo-p4', first_name: 'Robert', last_name: 'Williams' },
            },
            {
                id: 'demo-note-5',
                patient_id: 'demo-p5',
                content: 'Geriatric assessment for cognitive decline screening. MMSE score 24/30. Recommendation for neuropsych testing. Family meeting scheduled to discuss care planning...',
                status: 'draft',
                created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
                updated_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
                patient: { id: 'demo-p5', first_name: 'Eleanor', last_name: 'Park' },
            },
        ];
    }

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
        <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
            <CSPageHeader
                title="Clinical Notes"
                subtitle="View and manage your clinical documentation history"
                actions={
                    <Link href="/notes/new">
                        <CSButton variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                            New Note
                        </CSButton>
                    </Link>
                }
            />

            <div className="space-y-4">
                {/* Filters Row */}
                <CSCard>
                    <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--cs-text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search patients or content..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--cs-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--cs-teal)] text-sm transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full md:w-auto">
                            {[
                                { href: '/notes', label: 'All Notes', match: !statusFilter },
                                { href: '/notes?status=signed', label: 'Signed', match: statusFilter === 'signed' },
                                { href: '/notes?status=draft', label: 'Drafts', match: statusFilter === 'draft' },
                            ].map(tab => (
                                <Link
                                    key={tab.label}
                                    href={tab.href}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab.match
                                        ? 'bg-[var(--cs-teal)] text-white'
                                        : 'bg-white border border-[var(--cs-border)] text-[var(--cs-text-secondary)] hover:bg-[var(--cs-teal-xlight)] hover:text-[var(--cs-teal)]'
                                        }`}
                                >
                                    {tab.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </CSCard>

                {/* Notes List */}
                <CSCard padding="none">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-[var(--cs-teal)]" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 text-[var(--cs-danger)]">
                            <AlertCircle className="h-7 w-7 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--cs-teal-xlight)] border-b border-[var(--cs-card-border)]">
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Patient</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Content Preview</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Last Updated</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-2.5 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--cs-card-border)]">
                                    {filteredNotes.length > 0 ? (
                                        filteredNotes.map((note) => (
                                            <tr key={note.id} className="hover:bg-[var(--cs-teal-xlight)] transition-colors group">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-[var(--cs-teal-light)] flex items-center justify-center text-[var(--cs-teal)] font-semibold text-xs">
                                                            {note.patient?.first_name?.[0]}{note.patient?.last_name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-[var(--cs-text-primary)]">
                                                                {note.patient ? `${note.patient.first_name} ${note.patient.last_name}` : 'Unknown Patient'}
                                                            </div>
                                                            <div className="text-xs text-[var(--cs-text-muted)] flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                Clinical Note
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="text-sm text-[var(--cs-text-muted)] max-w-xs truncate">
                                                        {note.content?.substring(0, 80) || 'No content'}
                                                        {(note.content?.length || 0) > 80 ? '...' : ''}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="text-sm text-[var(--cs-text-primary)] flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5 text-[var(--cs-text-muted)]" />
                                                        {new Date(note.updated_at || note.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <CSBadge variant={statusBadgeVariant(note.status)}>
                                                        {note.status || 'draft'}
                                                    </CSBadge>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <Link
                                                        href={`/notes/${note.id}`}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--cs-teal-light)] text-[var(--cs-teal)] hover:bg-[var(--cs-teal)] hover:text-white rounded-md text-sm font-medium transition-colors"
                                                    >
                                                        {note.status === "signed" ? "View" : "Edit"}
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-12 text-center text-[var(--cs-text-muted)]">
                                                <div className="flex flex-col items-center gap-3">
                                                    <AlertCircle className="h-7 w-7 opacity-30" />
                                                    <p>No notes found.</p>
                                                    <Link href="/notes/new">
                                                        <CSButton variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                                                            Create First Note
                                                        </CSButton>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CSCard>
            </div>
        </div>
    );
}
