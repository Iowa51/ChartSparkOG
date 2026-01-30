"use client";

import {
    Fingerprint,
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
    Link as LinkIcon,
    ShieldAlert,
    Trash2,
    CheckCircle
} from "lucide-react";
import { useState } from "react";

const matchedTransactions = [
    {
        id: "MATCH-102",
        eraId: "ERA-9921",
        claimId: "CLM-88F1",
        amount: 14500,
        matchedBy: "Admin Sarah",
        method: "Manual Match",
        confidence: "High",
        date: "2026-01-29"
    },
    {
        id: "MATCH-103",
        eraId: "ERA-9922",
        claimId: "CLM-992G",
        amount: 8500,
        matchedBy: "Admin Sarah",
        method: "Manual Write-off",
        confidence: "Audit Required",
        date: "2026-01-29"
    },
    {
        id: "MATCH-104",
        eraId: "ERA-9923",
        claimId: "CLM-112H",
        amount: 21000,
        matchedBy: "System Auto",
        method: "Auto Match",
        confidence: "Verified",
        date: "2026-01-28"
    }
];

export default function MatchingOversightPage() {
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const handleFlagMatch = () => {
        alert(`⚠️ FLAG MATCH FOR REVIEW\n\nThis would:\n1. Mark selected matches as requiring manual review\n2. Escalate to compliance team\n3. Lock from auto-processing\n\nSelect matches to flag.`);
    };

    const handleBulkCertify = () => {
        alert(`✅ BULK CERTIFICATION\n\nReady to certify 31 verified matches totaling $337,500.\n\nThis action will:\n1. Lock the match assignments\n2. Update financial reporting\n3. Clear from pending queue\n\nProceed with bulk certification?`);
    };

    const handleMetricClick = (metric: string) => {
        alert(`📊 ${metric} Details\n\nDetailed breakdown with drill-down capabilities.`);
    };

    const handleCertify = (matchId: string) => {
        alert(`✅ CERTIFY MATCH ${matchId}\n\nConfirming this payment assignment as auditor-verified.\n\nThis action is permanent and will update the financial ledger.`);
    };

    const handleReviewWriteoffs = () => {
        alert(`🗑️ REVIEW WRITE-OFFS\n\nShowing 8 manual write-offs requiring audit:\n\n• WRITEOFF-1: $1,240 - No denial code\n• WRITEOFF-2: $850 - Patient responsibility mismatch\n• WRITEOFF-3: $2,100 - Undocumented adjustment\n\nClick any to see full details and approve/reject.`);
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Fingerprint className="h-8 w-8 text-primary" />
                        Matching & ERA Oversight
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Auditor verification for manual payment assignments and administrative write-offs.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleFlagMatch} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 hover:border-primary transition-all">
                        <ShieldAlert className="h-4 w-4" />
                        Flag Match For Review
                    </button>
                    <button onClick={handleBulkCertify} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                        <CheckCircle className="h-4 w-4" />
                        Bulk Certify Matches
                    </button>
                </div>
            </div>

            {/* Oversight Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button onClick={() => handleMetricClick('Total Manual Matches')} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 hover:shadow-lg transition-all text-left cursor pointer">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Manual Matches</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">42</p>
                </button>
                <button onClick={() => handleMetricClick('Manual Write-offs')} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-amber-500/30 hover:border-amber-500/70 hover:shadow-lg transition-all text-left cursor-pointer">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manual Write-offs</p>
                    <p className="text-2xl font-bold text-amber-600">8</p>
                </button>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Auto-Match Rate</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">92%</p>
                </div>
                <button onClick={() => handleMetricClick('Auditor Certified')} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-emerald-500/30 hover:border-emerald-500/70 hover:shadow-lg transition-all text-left cursor-pointer">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Auditor Certified</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-emerald-600">31</p>
                        <span className="text-[10px] text-slate-400 italic">Today</span>
                    </div>
                </button>
            </div>

            {/* Matching Ledger */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Audit Ledger: Payment Matching</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Claim ID or ERA..."
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest w-64 border-indigo-500/20"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Assignment Status</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Processor</th>
                                <th className="px-6 py-4">Audit Confidence</th>
                                <th className="px-6 py-4 text-right">Integrity Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {matchedTransactions.map((match, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <LinkIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{match.claimId} <ArrowRight className="inline h-3 w-3 mx-1 text-slate-300" /> {match.eraId}</p>
                                                <p className="text-[10px] font-black uppercase text-slate-400">{match.method}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(match.amount)}</p>
                                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{match.date}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-3 w-3 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{match.matchedBy}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${match.confidence === "Verified" ? "bg-emerald-500/10 text-emerald-600" :
                                            match.confidence === "High" ? "bg-blue-500/10 text-blue-600" :
                                                "bg-amber-500/10 text-amber-600 animate-pulse"
                                            }`}>
                                            {match.confidence}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleReviewWriteoffs()} title="Review Write-off" className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleCertify(match.id)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 round ed-lg text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all">
                                                Certify
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Warning Panel */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="h-14 w-14 bg-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                    <ShieldAlert className="h-8 w-8 text-amber-600" />
                </div>
                <div className="flex-1 space-y-1 text-center md:text-left">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Matching Integrity Warning</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Our system observed **8 manual write-offs** in the last 24 hours that were not linked to verified insurance denial codes. Please audit these transactions for potential internal leakage.</p>
                </div>
                <button onClick={handleReviewWriteoffs} className="px-6 py-3 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20">
                    Review Write-offs
                </button>
            </div>
        </div>
    );
}
