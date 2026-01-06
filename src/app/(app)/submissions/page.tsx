"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import { submissions, Submission } from "@/lib/demo-data/submissions";
import {
    Search,
    Filter,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    Sparkles,
    Download,
    Eye,
    Check,
    X,
    Loader2
} from "lucide-react";

export default function SubmissionsDashboard() {
    const [activeTab, setActiveTab] = useState<'pending' | 'ready' | 'track'>('pending');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);

    const stats = {
        pending: submissions.filter(s => s.status === 'Pending Approval').length,
        ready: submissions.filter(s => s.status === 'Ready to Submit').length,
        tracked: submissions.filter(s => ['Submitted', 'Paid', 'Rejected'].includes(s.status)).length,
        revenue: submissions.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.billedAmount, 0)
    };

    const filteredSubmissions = submissions.filter(s => {
        const matchesSearch = s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.id.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === 'pending') return s.status === 'Pending Approval' && matchesSearch;
        if (activeTab === 'ready') return s.status === 'Ready to Submit' && matchesSearch;
        if (activeTab === 'track') return ['Submitted', 'Paid', 'Rejected'].includes(s.status) && matchesSearch;
        return matchesSearch;
    });

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-20">
            <Header
                title="Insurance Submissions"
                description="Monitor claim status, review AI-compliant notes, and manage billing workflows."
            />

            <main className="flex-1 p-6 lg:px-10 max-w-[1600px] mx-auto w-full space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Approval</p>
                                <p className="text-2xl font-black text-foreground">{stats.pending}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ready to Submit</p>
                                <p className="text-2xl font-black text-foreground">{stats.ready}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid this Month</p>
                                <p className="text-2xl font-black text-foreground">32</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimated Revenue</p>
                                <p className="text-2xl font-black text-foreground">${stats.revenue.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Controls */}
                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                    <div className="p-6 border-b border-border flex flex-wrap items-center justify-between gap-6 bg-muted/20">
                        {/* Tabs */}
                        <div className="flex items-center p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Pending Approval
                            </button>
                            <button
                                onClick={() => setActiveTab('ready')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ready' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Ready to Submit
                            </button>
                            <button
                                onClick={() => setActiveTab('track')}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'track' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                Track Submissions
                            </button>
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search claims..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs font-medium focus:ring-4 focus:ring-primary/5 transition-all outline-none w-64"
                                />
                            </div>
                            <button className="p-2 bg-background border border-border rounded-xl text-muted-foreground hover:text-primary transition-all">
                                <Filter className="h-4 w-4" />
                            </button>
                            <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:opacity-90">
                                <Download className="h-4 w-4" />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/5">
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Patient</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rendering</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">DOS</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">CPT/ICD</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredSubmissions.map((s) => (
                                    <tr key={s.id} className="hover:bg-muted/10 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground">{s.patientName}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{s.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-foreground/80">{s.providerName}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-medium text-muted-foreground">{s.dateOfService}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {s.cptCodes.map(c => (
                                                    <span key={c} className="px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-black rounded border border-primary/10">{c}</span>
                                                ))}
                                                {s.icd10Codes.map(c => (
                                                    <span key={c} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[9px] font-bold rounded border border-border">{c}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-foreground">${s.billedAmount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${s.status === 'Paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    s.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                                                        s.status === 'Pending Approval' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                            "bg-blue-50 text-blue-600 border-blue-100"
                                                }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${s.status === 'Paid' ? "bg-emerald-500" :
                                                        s.status === 'Rejected' ? "bg-red-500" :
                                                            s.status === 'Pending Approval' ? "bg-amber-500" :
                                                                "bg-blue-500"
                                                    }`} />
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedSubmission(s);
                                                    setIsReviewing(true);
                                                }}
                                                className="p-2 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSubmissions.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-50">
                                                <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                                <p className="text-sm font-bold text-muted-foreground">No claims found in this category.</p>
                                                <p className="text-xs text-muted-foreground mt-1">Adjust filters or search to broaden results.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Review Modal */}
            {isReviewing && selectedSubmission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card w-full max-w-5xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {selectedSubmission.patientName[0]}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-foreground uppercase tracking-widest">Claim Review: {selectedSubmission.patientName}</h2>
                                    <p className="text-xs text-muted-foreground font-medium">DOS: {selectedSubmission.dateOfService} • Claim ID: {selectedSubmission.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsReviewing(false)}
                                className="p-2 hover:bg-muted rounded-xl transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-x divide-border">
                            {/* Clinical Note Preview */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Primary Clinical Documentation
                                    </h3>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        AI Transcribed
                                    </span>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border italic text-sm leading-relaxed text-foreground/80 font-medium whitespace-pre-wrap">
                                    {selectedSubmission.notePreview}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Billing Codes (CPT)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSubmission.cptCodes.map(c => (
                                                <span key={c} className="px-2 py-1 bg-primary/10 text-primary text-xs font-black rounded border border-primary/20">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-2xl border border-border">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Diagnoses (ICD-10)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedSubmission.icd10Codes.map(c => (
                                                <span key={c} className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-foreground text-xs font-bold rounded border border-border">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Compliance Checklist */}
                            <div className="w-full lg:w-[350px] bg-muted/10 p-8 space-y-6 overflow-y-auto">
                                <div className="flex items-center gap-2 text-primary">
                                    <Sparkles className="h-5 w-5" />
                                    <h3 className="text-xs font-black uppercase tracking-widest">AI Compliance Audit</h3>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: "Signed by Provider", passed: true },
                                        { label: "Medical Necessity documented", passed: true },
                                        { label: "Duration matching CPT", passed: true },
                                        { label: "ICD-10 specificity (Max)", passed: false, msg: "Consider R73.09 for pre-diabetes" },
                                        { label: "Plan of care included", passed: true }
                                    ].map((item, i) => (
                                        <div key={i} className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground/80">{item.label}</span>
                                                {item.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                                            </div>
                                            {item.msg && <p className="text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-100 font-medium italic">{item.msg}</p>}
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8 border-t border-border space-y-3">
                                    <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all">
                                        <Check className="h-4 w-4" />
                                        Approve & Finalize
                                    </button>
                                    <button className="w-full py-4 bg-red-600/10 hover:bg-red-600/20 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-200/50 flex items-center justify-center gap-2 transition-all">
                                        <X className="h-4 w-4" />
                                        Reject / Request Revision
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
