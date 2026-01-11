"use client";

import { useState } from "react";
import {
    Flag,
    AlertTriangle,
    Calendar,
    User,
    Eye,
    CheckCircle,
    Clock,
    MessageSquare
} from "lucide-react";

// Demo flags data
const demoFlags = [
    {
        id: "FLG-001",
        submissionId: "SUB-003",
        patientName: "Emily Chen",
        provider: "Dr. Michael R.",
        reason: "Missing documentation for medical necessity",
        createdAt: "2026-01-10T17:00:00",
        status: "open",
        notes: "Requested additional documentation from provider"
    },
    {
        id: "FLG-002",
        submissionId: "NOTE-003",
        patientName: "Emily Chen",
        provider: "Dr. Michael R.",
        reason: "Session duration documentation unclear",
        createdAt: "2026-01-10T16:50:00",
        status: "resolved",
        notes: "Provider submitted corrected documentation",
        resolvedAt: "2026-01-11T09:30:00"
    },
    {
        id: "FLG-003",
        submissionId: "SUB-008",
        patientName: "Robert Williams",
        provider: "Dr. Lisa T.",
        reason: "Potential upcoding concern - review needed",
        createdAt: "2026-01-09T14:20:00",
        status: "pending",
        notes: "Escalated for supervisor review"
    },
];

export default function AuditorFlagsPage() {
    const [activeTab, setActiveTab] = useState<"open" | "pending" | "resolved" | "all">("open");
    const [selectedFlag, setSelectedFlag] = useState<typeof demoFlags[0] | null>(null);

    const filteredFlags = demoFlags.filter(flag =>
        activeTab === "all" || flag.status === activeTab
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "open":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><Clock className="h-3 w-3" />Open</span>;
            case "pending":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Pending</span>;
            case "resolved":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Resolved</span>;
            default:
                return null;
        }
    };

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Read-Only Access:</strong> Track flags you've created. Resolution requires admin action.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Flags</h1>
                    <p className="text-slate-500">Track compliance flags you've raised during audits</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {[
                        { key: "open", label: "Open", count: demoFlags.filter(f => f.status === "open").length },
                        { key: "pending", label: "Pending Review", count: demoFlags.filter(f => f.status === "pending").length },
                        { key: "resolved", label: "Resolved", count: demoFlags.filter(f => f.status === "resolved").length },
                        { key: "all", label: "All Flags", count: demoFlags.length },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? "bg-amber-100 text-amber-700"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            {tab.label}
                            <span className="px-2 py-0.5 rounded-full bg-white text-xs">{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* Flags List */}
                <div className="space-y-4">
                    {filteredFlags.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <Flag className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-slate-500">No flags found</p>
                        </div>
                    ) : (
                        filteredFlags.map((flag) => (
                            <div
                                key={flag.id}
                                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-amber-300 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-mono text-slate-400">{flag.id}</span>
                                            {getStatusBadge(flag.status)}
                                        </div>
                                        <h3 className="font-semibold text-slate-900 mb-1">{flag.reason}</h3>
                                        <p className="text-sm text-slate-600 mb-2">
                                            <span className="text-slate-400">Submission:</span> {flag.submissionId} • {flag.patientName}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {flag.provider}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Flagged: {new Date(flag.createdAt).toLocaleDateString()}
                                            </span>
                                            {flag.resolvedAt && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Resolved: {new Date(flag.resolvedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {flag.notes && (
                                            <div className="mt-3 p-2 bg-slate-50 rounded-lg text-slate-600 text-sm flex items-start gap-2">
                                                <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5" />
                                                {flag.notes}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedFlag(flag)}
                                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail Modal */}
                {selectedFlag && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedFlag(null)}>
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4">Flag Details</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Flag ID:</span><span className="font-mono">{selectedFlag.id}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Submission:</span><span>{selectedFlag.submissionId}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Patient:</span><span>{selectedFlag.patientName}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Provider:</span><span>{selectedFlag.provider}</span></div>
                                <div className="flex justify-between items-center"><span className="text-slate-500">Status:</span>{getStatusBadge(selectedFlag.status)}</div>
                                <div className="pt-2 border-t">
                                    <p className="text-slate-500 mb-1">Reason:</p>
                                    <p className="text-slate-900">{selectedFlag.reason}</p>
                                </div>
                                {selectedFlag.notes && (
                                    <div className="pt-2 border-t">
                                        <p className="text-slate-500 mb-1">Notes:</p>
                                        <p className="text-slate-900">{selectedFlag.notes}</p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedFlag(null)}
                                className="mt-6 w-full px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
