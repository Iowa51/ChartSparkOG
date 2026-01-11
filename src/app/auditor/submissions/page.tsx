"use client";

import { useState } from "react";
import {
    ClipboardCheck,
    Search,
    Eye,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Filter,
    Building2
} from "lucide-react";

// Demo submissions data
const demoSubmissions = [
    {
        id: "SUB-001",
        patientName: "Sarah Connor",
        provider: "Dr. Sarah K.",
        organization: "Mountain View Clinic",
        submittedAt: "2026-01-11T10:30:00",
        type: "Progress Note",
        status: "pending",
        cptCode: "99214",
        amount: 165.00
    },
    {
        id: "SUB-002",
        patientName: "John Martinez",
        provider: "Dr. Sarah K.",
        organization: "Mountain View Clinic",
        submittedAt: "2026-01-11T09:15:00",
        type: "Initial Assessment",
        status: "pending",
        cptCode: "99205",
        amount: 285.00
    },
    {
        id: "SUB-003",
        patientName: "Emily Chen",
        provider: "Dr. Michael R.",
        organization: "Sunrise Health",
        submittedAt: "2026-01-10T16:45:00",
        type: "Follow-up Visit",
        status: "flagged",
        cptCode: "99213",
        amount: 110.00,
        flagReason: "Missing documentation for medical necessity"
    },
    {
        id: "SUB-004",
        patientName: "Victor Jones",
        provider: "Dr. Sarah K.",
        organization: "Mountain View Clinic",
        submittedAt: "2026-01-10T14:20:00",
        type: "Therapy Session",
        status: "approved",
        cptCode: "90837",
        amount: 165.00
    },
];

export default function AuditorSubmissionsPage() {
    const [activeTab, setActiveTab] = useState<"pending" | "flagged" | "approved" | "all">("pending");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubmission, setSelectedSubmission] = useState<typeof demoSubmissions[0] | null>(null);

    const filteredSubmissions = demoSubmissions.filter(sub => {
        const matchesTab = activeTab === "all" || sub.status === activeTab;
        const matchesSearch = sub.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending Review</span>;
            case "flagged":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Flagged</span>;
            case "approved":
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Approved</span>;
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
                    <strong>Read-Only Access:</strong> You can review and flag submissions but cannot approve or modify records.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Submissions Queue</h1>
                        <p className="text-slate-500">Review insurance submissions from assigned organizations</p>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-2">
                        {[
                            { key: "pending", label: "Pending", icon: Clock, count: demoSubmissions.filter(s => s.status === "pending").length },
                            { key: "flagged", label: "Flagged", icon: AlertTriangle, count: demoSubmissions.filter(s => s.status === "flagged").length },
                            { key: "approved", label: "Approved", icon: CheckCircle2, count: demoSubmissions.filter(s => s.status === "approved").length },
                            { key: "all", label: "All", icon: Filter, count: demoSubmissions.length },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                        ? "bg-amber-100 text-amber-700"
                                        : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-white text-xs">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search submissions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-64"
                        />
                    </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Submission ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Organization</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                        <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                        <p>No submissions found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSubmissions.map((submission) => (
                                    <tr key={submission.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{submission.id}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{submission.patientName}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{submission.provider}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />
                                                {submission.organization}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{submission.type}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">${submission.amount.toFixed(2)}</td>
                                        <td className="px-4 py-3">{getStatusBadge(submission.status)}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedSubmission(submission)}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Review submission"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Review Modal */}
                {selectedSubmission && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSubmission(null)}>
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4">Submission Review</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">ID:</span><span className="font-mono">{selectedSubmission.id}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Patient:</span><span>{selectedSubmission.patientName}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Provider:</span><span>{selectedSubmission.provider}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">CPT Code:</span><span className="font-mono">{selectedSubmission.cptCode}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Amount:</span><span className="font-bold">${selectedSubmission.amount.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Status:</span>{getStatusBadge(selectedSubmission.status)}</div>
                                {selectedSubmission.flagReason && (
                                    <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                                        <strong>Flag Reason:</strong> {selectedSubmission.flagReason}
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setSelectedSubmission(null)}
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
