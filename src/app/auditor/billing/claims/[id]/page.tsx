"use client";

import {
    Activity,
    FileText,
    Database,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Building2,
    Calendar,
    ArrowRight,
    ChevronDown,
    Share2,
    Download,
    History,
    SearchCode,
    Clock,
    User
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function ClaimLifecyclePage({ params }: { params: { id: string } }) {
    const claimId = params.id;
    const [activeStage, setActiveStage] = useState(4); // Default to settled for demo

    const stages = [
        {
            id: 1,
            label: "Clinical Documentation",
            icon: FileText,
            status: "Complete",
            date: "2026-01-20 09:15 AM",
            details: "SOAP Note finalized and signed by Dr. Sarah Smith. CPT 99214 attached."
        },
        {
            id: 2,
            label: "X12 837P Generation",
            icon: Database,
            status: "Complete",
            date: "2026-01-20 11:45 PM",
            details: "Batch #7721 created. Claim scrubbed (0 errors). Transmitted to Office Ally via SFTP."
        },
        {
            id: 3,
            label: "Payer Acknowledgement",
            icon: Activity,
            status: "Complete",
            date: "2026-01-22 03:20 AM",
            details: "277CA Acceptance received. Claim assigned Payer Control Number: BCBS-NY-99128."
        },
        {
            id: 4,
            label: "ERA 835 Remittance",
            icon: ShieldCheck,
            status: "Complete",
            date: "2026-01-28 02:10 PM",
            details: "Electronic Remittance Advice received. Full payment verified ($185.00). CO-45 adjustment: $30.00."
        },
        {
            id: 5,
            label: "Financial Settlement",
            icon: CheckCircle2,
            status: "Complete",
            date: "2026-01-29 10:00 AM",
            details: "Payment matched in ChartSpark. Ledger updated. Transaction closed."
        }
    ];

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        <Link href="/auditor/billing" className="hover:text-primary transition-colors">Financial Audit</Link>
                        <ChevronDown className="h-3 w-3 -rotate-90" />
                        <span className="text-slate-900 dark:text-white">Claim Explorer</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <SearchCode className="h-8 w-8 text-indigo-500" />
                        Claim {claimId}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        High-fidelity forensic timeline of the claim lifecycle from clinical entry to bank settlement.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                        <Download className="h-4 w-4" />
                        EDI Raw Data
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all">
                        <Share2 className="h-4 w-4" />
                        Certify Integrity
                    </button>
                </div>
            </div>

            {/* Visual Timeline Explorer */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <History className="h-32 w-32" />
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest mb-12">Transaction Flow</h3>

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4 mb-8">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -z-0" />
                    <div
                        className="hidden md:block absolute top-10 left-0 h-0.5 bg-indigo-500 -z-0 transition-all duration-1000"
                        style={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }}
                    />

                    {stages.map((stage, idx) => (
                        <button
                            key={stage.id}
                            onClick={() => setActiveStage(idx)}
                            className="relative z-10 flex flex-col items-center group flex-1"
                        >
                            <div className={`h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${idx <= activeStage
                                    ? "bg-indigo-500 border-indigo-500 text-white shadow-xl shadow-indigo-500/20 scale-110"
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                                }`}>
                                <stage.icon className="h-8 w-8" />
                            </div>
                            <div className="mt-4 text-center">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx <= activeStage ? "text-indigo-600" : "text-slate-400"
                                    }`}>
                                    Stage {stage.id}
                                </p>
                                <p className={`text-sm font-bold max-w-[120px] ${idx <= activeStage ? "text-slate-900 dark:text-white" : "text-slate-400"
                                    }`}>
                                    {stage.label}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Stage Drill-down Details */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
                                {(() => {
                                    const Icon = stages[activeStage].icon;
                                    return <Icon className="h-5 w-5" />;
                                })()}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">{stages[activeStage].label}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{stages[activeStage].date}</span>
                                    <span className="mx-1">•</span>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    <span className="text-emerald-600 font-bold uppercase tracking-tighter">{stages[activeStage].status}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {stages[activeStage].details}
                            </p>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Evidence</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400">Processor</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">ChartSpark Engine v5.2</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400">Auth Code</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">CS-AA-99120-X</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-400 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 text-[8px] font-black text-slate-700 uppercase">EDI RAW BYTES</div>
                            <pre className="whitespace-pre-wrap">
                                {`NM1*85*2*CHART SPARK BILLING SERVICE*****XX*1234567890~
CLM*${claimId}*185*99214*1*A:1*Y*Y~
REF*D9*91218~
HI*BK:F329~
NM1*82*1*SMITH*SARAH***XX*1992883712~`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            {/* Claim Integrity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 flex items-center gap-8">
                    <div className="h-24 w-24 rounded-full border-8 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">100%</span>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Full Assurance Rating</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">Every stage of this claim has been cryptographically verified against the original clinical note and the insurance remittance.</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clinic Yield</p>
                        <h3 className="text-2xl font-black text-emerald-600">$185.00</h3>
                        <p className="text-xs text-slate-500">100% of Billed charge</p>
                    </div>
                    <Link href="/auditor/billing" className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all mt-4">
                        Back to Ledger <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
