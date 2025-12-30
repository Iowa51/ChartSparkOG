"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import {
    Search,
    Filter,
    ChevronRight,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    Calendar,
    User
} from "lucide-react";
import Link from "next/link";

// Mock data for notes (expanded from dashboard)
const allNotes = [
    {
        id: "1",
        patient: { name: "John Doe", initials: "JD", dob: "04/12/1985" },
        diagnosis: { name: "Acute Pharyngitis", code: "J02.9" },
        lastEdited: "Oct 29, 2023, 9:41 AM",
        status: "Draft",
        date: "2023-10-29",
    },
    {
        id: "2",
        patient: { name: "Maria Rodriguez", initials: "MR", dob: "11/22/1972" },
        diagnosis: { name: "Hypertension F/U", code: "I10" },
        lastEdited: "Oct 28, 2023, 3:15 PM",
        status: "Signed",
        date: "2023-10-28",
    },
    {
        id: "3",
        patient: { name: "Arthur Smith", initials: "AS", dob: "02/08/1954" },
        diagnosis: { name: "T2DM Management", code: "E11.9" },
        lastEdited: "Oct 24, 2023, 10:30 AM",
        status: "Pending Review",
        date: "2023-10-24",
    },
    {
        id: "4",
        patient: { name: "Sarah Williams", initials: "SW", dob: "06/15/1992" },
        diagnosis: { name: "Anxiety Screening", code: "F41.1" },
        lastEdited: "Oct 22, 2023, 2:15 PM",
        status: "Signed",
        date: "2023-10-22",
    },
    {
        id: "5",
        patient: { name: "David Miller", initials: "DM", dob: "09/30/1968" },
        diagnosis: { name: "Lower Back Pain", code: "M54.5" },
        lastEdited: "Oct 20, 2023, 11:45 AM",
        status: "Signed",
        date: "2023-10-20",
    },
];

const statusStyles = {
    Draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    Signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Pending Review": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function NotesHistoryPage() {
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get("status");
    const [searchQuery, setSearchQuery] = useState("");

    // Filter notes based on status param and search query
    const filteredNotes = allNotes.filter(note => {
        const matchesSearch = note.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.diagnosis.name.toLowerCase().includes(searchQuery.toLowerCase());

        if (statusFilter === "completed" || statusFilter === "Signed") {
            return matchesSearch && note.status === "Signed";
        }

        if (statusFilter) {
            return matchesSearch && note.status.toLowerCase() === statusFilter.toLowerCase();
        }

        return matchesSearch;
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
                            placeholder="Search patients or diagnoses..."
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
                            href="/notes?status=completed"
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "completed" ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            Completed
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Patient</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Clinical Context</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Last Activity</th>
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
                                                        {note.patient.initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-foreground">{note.patient.name}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            DOB: {note.patient.dob}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-foreground">{note.diagnosis.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono bg-muted inline-block px-1.5 py-0.5 rounded mt-1">
                                                    {note.diagnosis.code}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-foreground flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {note.lastEdited}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusStyles[note.status as keyof typeof statusStyles]}`}>
                                                    {note.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/notes/${note.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-primary hover:text-white rounded-xl text-sm font-medium transition-all group-hover:scale-105"
                                                >
                                                    {note.status === "Signed" ? "View" : "Edit"}
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
                                                <p>No notes found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
