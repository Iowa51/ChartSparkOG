"use client";

import { useState } from "react";
import {
    FileText,
    Search,
    Eye,
    AlertTriangle,
    Calendar,
    User,
    Clock,
    ChevronRight
} from "lucide-react";

// Demo notes for auditor review
const demoNotes = [
    {
        id: "NOTE-001",
        patientName: "Sarah Connor",
        provider: "Dr. Sarah K.",
        noteType: "Progress Note",
        createdAt: "2026-01-11T10:30:00",
        status: "complete",
        soapPreview: "Patient presents for follow-up of anxiety and depression management...",
        diagnosis: ["F41.1 - Generalized anxiety disorder", "F32.1 - Major depressive disorder, single episode, moderate"]
    },
    {
        id: "NOTE-002",
        patientName: "John Martinez",
        provider: "Dr. Sarah K.",
        noteType: "Initial Assessment",
        createdAt: "2026-01-11T09:15:00",
        status: "complete",
        soapPreview: "New patient evaluation for reported symptoms of persistent worry and sleep difficulties...",
        diagnosis: ["F41.9 - Anxiety disorder, unspecified"]
    },
    {
        id: "NOTE-003",
        patientName: "Emily Chen",
        provider: "Dr. Michael R.",
        noteType: "Therapy Session",
        createdAt: "2026-01-10T16:45:00",
        status: "flagged",
        soapPreview: "Individual psychotherapy session focusing on cognitive behavioral techniques...",
        diagnosis: ["F33.1 - Major depressive disorder, recurrent, moderate"],
        flagReason: "Session duration documentation unclear"
    },
    {
        id: "NOTE-004",
        patientName: "Victor Jones",
        provider: "Dr. Sarah K.",
        noteType: "Medication Management",
        createdAt: "2026-01-10T14:20:00",
        status: "complete",
        soapPreview: "Routine medication review. Patient reports good compliance with current regimen...",
        diagnosis: ["F31.9 - Bipolar disorder, unspecified"]
    },
];

export default function AuditorNotesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedNote, setSelectedNote] = useState<typeof demoNotes[0] | null>(null);

    const filteredNotes = demoNotes.filter(note =>
        note.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Read-Only Access:</strong> You can review clinical notes but cannot edit or modify any records.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Notes Review</h1>
                        <p className="text-slate-500">Review clinical documentation for compliance</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search notes by patient, provider, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>

                {/* Notes List */}
                <div className="space-y-4">
                    {filteredNotes.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-slate-500">No notes found</p>
                        </div>
                    ) : (
                        filteredNotes.map((note) => (
                            <div
                                key={note.id}
                                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-amber-300 transition-colors cursor-pointer"
                                onClick={() => setSelectedNote(note)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-mono text-slate-400">{note.id}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${note.status === "flagged"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-green-100 text-green-700"
                                                }`}>
                                                {note.status === "flagged" ? "Flagged" : "Complete"}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                                                {note.noteType}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-slate-900 mb-1">{note.patientName}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-2">{note.soapPreview}</p>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {note.provider}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(note.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300" />
                                </div>
                                {note.flagReason && (
                                    <div className="mt-3 p-2 bg-red-50 rounded-lg text-red-700 text-xs flex items-center gap-2">
                                        <AlertTriangle className="h-3 w-3" />
                                        {note.flagReason}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Review Modal */}
                {selectedNote && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNote(null)}>
                        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Note Review - {selectedNote.id}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedNote.status === "flagged"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    }`}>
                                    {selectedNote.status === "flagged" ? "Flagged" : "Complete"}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500">Patient:</span> <span className="font-medium">{selectedNote.patientName}</span></div>
                                    <div><span className="text-slate-500">Provider:</span> <span className="font-medium">{selectedNote.provider}</span></div>
                                    <div><span className="text-slate-500">Note Type:</span> <span className="font-medium">{selectedNote.noteType}</span></div>
                                    <div><span className="text-slate-500">Date:</span> <span className="font-medium">{new Date(selectedNote.createdAt).toLocaleString()}</span></div>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-slate-900 mb-2">Documentation Preview</h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedNote.soapPreview}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-slate-900 mb-2">Diagnosis Codes</h4>
                                    <div className="space-y-1">
                                        {selectedNote.diagnosis.map((dx, i) => (
                                            <div key={i} className="text-sm font-mono text-slate-600 bg-slate-50 px-3 py-1 rounded">{dx}</div>
                                        ))}
                                    </div>
                                </div>

                                {selectedNote.flagReason && (
                                    <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                                        <strong>Flag Reason:</strong> {selectedNote.flagReason}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setSelectedNote(null)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    Close
                                </button>
                                <button
                                    className="flex-1 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center justify-center gap-2"
                                    onClick={() => alert("Flag functionality - Read-only mode")}
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    Flag for Review
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
