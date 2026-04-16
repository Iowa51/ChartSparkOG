"use client";

import {
    ShieldAlert,
    Search,
    Filter,
    ArrowRight,
    SearchCode,
    FileSearch,
    AlertCircle,
    CheckCircle2,
    XCircle,
    User,
    Building2,
    Database,
    History,
    ChevronRight,
    GraduationCap
} from "lucide-react";
import { useState } from "react";
import DetailModal from "@/components/ui/DetailModal";

const denialQueue = [
    {
        id: "DNL-7721",
        code: "CO-16",
        description: "Lacks information",
        claimId: "CLM-912A",
        patient: "Demo Patient A",
        org: "Wellness Center",
        amount: 21500,
        date: "2026-01-27",
        traceStatus: "Tracing Required"
    },
    {
        id: "DNL-7722",
        code: "PR-204",
        description: "Service not covered",
        claimId: "CLM-883B",
        patient: "John McClane",
        org: "Main Street Clinic",
        amount: 18500,
        date: "2026-01-26",
        traceStatus: "Trace Complete"
    },
    {
        id: "DNL-7723",
        code: "CO-45",
        description: "Exceeds fee schedule",
        claimId: "CLM-442C",
        patient: "Ellen Ripley",
        org: "Wellness Center",
        amount: 32000,
        date: "2026-01-25",
        traceStatus: "Tracing Required"
    }
];

export default function DenialForensicsPage() {
    const [selectedDenial, setSelectedDenial] = useState(denialQueue[0]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode }>({ title: "", content: null });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const handleViewFullHeader = () => {
        const content = (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Claim Information</p>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                            <p className="text-sm"><span className="font-bold">Claim ID:</span> {selectedDenial.claimId}</p>
                            <p className="text-sm"><span className="font-bold">Denial Code:</span> {selectedDenial.code}</p>
                            <p className="text-sm"><span className="font-bold">Date:</span> {selectedDenial.date}</p>
                            <p className="text-sm"><span className="font-bold">Amount:</span> {formatCurrency(selectedDenial.amount)}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase">Patient & Provider</p>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                            <p className="text-sm"><span className="font-bold">Patient:</span> {selectedDenial.patient}</p>
                            <p className="text-sm"><span className="font-bold">Organization:</span> {selectedDenial.org}</p>
                            <p className="text-sm"><span className="font-bold">Status:</span> <span className="text-red-600 font-bold">Denied</span></p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">ℹ Full X12 837P header available with complete patient demographics, billing provider NPI, and service line details.</p>
                </div>
            </div>
        );
        setModalContent({ title: "Claim Header Details", content });
        setModalOpen(true);
    };

    const handleRequestTraining = () => {
        const content = (
            <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">✓ Training request will be sent to {selectedDenial.org} clinical director</p>
                </div>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Training Topic</p>
                        <p className="text-sm font-bold">PHQ-9/GAD-7 Integration for Behavioral Health Claims</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Triggered By</p>
                        <p className="text-sm">Denial {selectedDenial.id} ({selectedDenial.code})</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400">This will email recommended training materials and template modifications to prevent future denials.</p>
                    </div>
                </div>
            </div>
        );
        setModalContent({ title: "Clinician Training Request", content });
        setModalOpen(true);
    };

    const handleDeployGuardrail = () => {
        const content = (
            <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">⚠ This will update the encounter note template for {selectedDenial.org}</p>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-bold">Deployment Steps:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>Update the encounter note template</li>
                        <li>Add required fields for symptom severity scales</li>
                        <li>Trigger validation rules</li>
                        <li>Notify providers of template changes</li>
                    </ol>
                </div>
                <div className="flex gap-2 pt-2">
                    <button className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors">Deploy Now</button>
                </div>
            </div>
        );
        setModalContent({ title: "Template Guardrail Deployment", content });
        setModalOpen(true);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="p-6 lg:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldAlert className="h-8 w-8 text-red-500" />
                            Denial Forensic Hub
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Investigate insurance rejections and trace compliance gaps back to clinical documentation.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Denial ID or Code..."
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-64 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                        <button className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500">
                            <Filter className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Denial Queue - Left Sidebar */}
                <div className="w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Queue</h3>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {denialQueue.map((denial) => (
                            <button
                                key={denial.id}
                                onClick={() => setSelectedDenial(denial)}
                                className={`w-full p-6 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedDenial.id === denial.id ? "bg-red-50/50 dark:bg-red-950/20 border-l-4 border-red-500" : "border-l-4 border-transparent"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-black text-red-600 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded uppercase tracking-tighter">
                                        {denial.code}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">{denial.date}</span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{denial.description}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Building2 className="h-3 w-3" />
                                    <span>{denial.org}</span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(denial.amount)}</span>
                                    <span className={`text-[10px] font-black uppercase ${denial.traceStatus === "Trace Complete" ? "text-emerald-500" : "text-amber-500"
                                        }`}>
                                        {denial.traceStatus}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Forensic Trace Workspace - Right Section */}
                <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                <SearchCode className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Forensic Trace Logic</h2>
                                <p className="text-sm text-slate-500">Incident: #{selectedDenial.id} — Claim Reference: {selectedDenial.claimId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleViewFullHeader} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:border-primary transition-all">
                                <FileSearch className="h-4 w-4" />
                                View Full Header
                            </button>
                            <button onClick={handleRequestTraining} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                                <GraduationCap className="h-4 w-4" />
                                Request Clinician Training
                            </button>
                        </div>
                    </div>

                    {/* Trace Timeline */}
                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent dark:before:from-slate-800 dark:before:via-slate-800">
                        {/* Step 1: Documentation */}
                        <div className="relative flex items-center justify-between group">
                            <div className="flex items-center">
                                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 ring-8 ring-slate-50 dark:ring-slate-950 transition-all group-hover:scale-110">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="ml-16">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">1. Clinical Documentation</h4>
                                    <p className="text-xs text-slate-500 mt-1">Provider {selectedDenial.org} signed Note-77x. CPT 99214 selected.</p>
                                    <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs italic text-slate-600 dark:text-slate-400">
                                        "Patient presents with moderate symptom severity. Discussed treatment options..."
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Submission */}
                        <div className="relative flex items-center justify-between group">
                            <div className="flex items-center">
                                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 ring-8 ring-slate-50 dark:ring-slate-950 transition-all group-hover:scale-110">
                                    <Database className="h-5 w-5" />
                                </div>
                                <div className="ml-16">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">2. X12 837P Transmission</h4>
                                    <p className="text-xs text-slate-500 mt-1">Sent to Clearinghouse (Office Ally) via SFTP. Validation successful.</p>
                                    <div className="mt-2 font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 rounded">
                                        ISA*00* *00* *ZZ*CHART <ChevronRight className="inline h-3 w-3" /> GS*HC*CHART*OFFICELLY
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Denial Discovery */}
                        <div className="relative flex items-center justify-between group">
                            <div className="flex items-center">
                                <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 ring-8 ring-slate-50 dark:ring-slate-950 transition-all group-hover:scale-110">
                                    <XCircle className="h-5 w-5" />
                                </div>
                                <div className="ml-16">
                                    <h4 className="text-sm font-black text-red-600 uppercase tracking-widest">3. Insurance Adjudication (835 Remit)</h4>
                                    <p className="text-xs text-slate-500 mt-1">Payer rejected with code <span className="font-bold text-red-600">{selectedDenial.code}</span>.</p>
                                    <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-red-600">Forensic Root Cause Detected</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">The clinical note specifies "moderate symptoms" but is missing the specific symptom scale result (PHQ-9 or GAD-7) required by BCBS for CPT 99214 at this intensity level.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <History className="h-5 w-5 text-slate-400" />
                                Compliance History
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Past {selectedDenial.code} denials (Org)</span>
                                    <span className="font-black text-slate-900 dark:text-white">12 Cases</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500" style={{ width: "65%" }} />
                                </div>
                                <p className="text-[10px] text-slate-400 italic">This organization shows a repeating pattern for this rejection type.</p>
                            </div>
                        </div>

                        <div className="bg-emerald-500 p-6 rounded-2xl shadow-xl shadow-emerald-500/20 text-white space-y-4">
                            <h3 className="font-bold uppercase tracking-widest text-[10px] text-white/80">Auditor Recommendation</h3>
                            <p className="text-sm font-medium">Auto-fix available: Suggest PHQ-9 integration for this organization's note template to prevent future rejections.</p>
                            <button onClick={handleDeployGuardrail} className="w-full py-3 bg-white text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                                Deploy Template Guard-rail
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            <DetailModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalContent.title}
            >
                {modalContent.content}
            </DetailModal>
        </div>
    );
}
