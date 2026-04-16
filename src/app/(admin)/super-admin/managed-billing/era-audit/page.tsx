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
import DetailModal from "@/components/ui/DetailModal";

const matchedTransactions = [
    {
        id: "MATCH-102",
        eraId: "ERA-9921",
        claimId: "CLM-88F1",
        amount: 14500,
        matchedBy: "Admin (System)",
        method: "Manual Match",
        confidence: "High",
        date: "2026-01-29"
    },
    {
        id: "MATCH-103",
        eraId: "ERA-9922",
        claimId: "CLM-992G",
        amount: 8500,
        matchedBy: "Admin (System)",
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
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode }>({ title: "", content: null });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const handleFlagMatch = () => {
        setModalContent({
            title: "Flag Match for Review",
            content: (
                <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">This will mark selected matches for manual review</p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><strong>Actions:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li>Mark matches as requiring manual review</li>
                            <li>Escalate to compliance team</li>
                            <li>Lock from auto-processing</li>
                        </ol>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancel</button>
                        <button className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-sm">Flag Selected</button>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleBulkCertify = () => {
        setModalContent({
            title: "Bulk Certification",
            content: (
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Ready to certify 31 verified matches totaling $337,500</p>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><strong>This action will:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li>Lock the match assignments</li>
                            <li>Update financial reporting</li>
                            <li>Clear from pending queue</li>
                        </ol>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancel</button>
                        <button className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm">Certify All</button>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleMetricClick = (metric: string) => {
        setModalContent({
            title: metric,
            content: (
                <div className="text-center p-6">
                    <p className="text-4xl font-bold text-primary mb-2">
                        {metric === "Total Matches" ? "143" : metric === "Flagged" ? "7" : "31"}
                    </p>
                    <p className="text-sm text-slate-500">Detailed breakdown and historical trends available</p>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleCertify = (matchId: string) => {
        setModalContent({
            title: `Certify Match ${matchId}`,
            content: (
                <div className="space-y-4">
                    <p className="text-sm">Confirming this payment assignment as auditor-verified.</p>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">This action is permanent and will update the financial ledger</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancel</button>
                        <button className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm">Certify</button>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleViewHistory = (matchId: string) => {
        setModalContent({
            title: `Match History - ${matchId}`,
            content: (
                <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase">Created</p>
                        <p className="text-sm mt-1">Jan 29, 2026 at 2:30 PM by Admin (System)</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase">Modified</p>
                        <p className="text-sm mt-1">Jan 29, 2026 at 3:15 PM by Admin (System)</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                        <p className="text-sm mt-1">Pending Review</p>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="p-6 lg:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Fingerprint className="h-8 w-8 text-violet-500" />
                            ERA Matching Oversight
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Forensic review of payment-to-claim matching decisions
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                <div onClick={() => handleMetricClick("Total Matches")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-violet-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Matches</p>
                            <p className="text-3xl font-bold mt-2">143</p>
                        </div>
                        <Database className="h-10 w-10 text-violet-500 opacity-50" />
                    </div>
                </div>

                <div onClick={() => handleMetricClick("Flagged")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Flagged</p>
                            <p className="text-3xl font-bold mt-2 text-amber-600">7</p>
                        </div>
                        <AlertCircle className="h-10 w-10 text-amber-500 opacity-50" />
                    </div>
                </div>

                <div onClick={() => handleMetricClick("Pending Review")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pending Review</p>
                            <p className="text-3xl font-bold mt-2 text-blue-600">31</p>
                        </div>
                        <FileSearch className="h-10 w-10 text-blue-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 pb-4 flex flex-wrap gap-3">
                <button onClick={handleFlagMatch} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Flag Selected
                </button>
                <button onClick={handleBulkCertify} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Bulk Certify
                </button>
            </div>

            {/* Matches Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Match ID</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">ERA / Claim</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Matched By</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Method</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Confidence</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matchedTransactions.map((match, index) => (
                                <tr key={index} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-sm">{match.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-violet-600 font-medium">{match.eraId}</span>
                                            <span className="text-xs text-slate-500">{match.claimId}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(match.amount)}</td>
                                    <td className="px-6 py-4 text-sm">{match.matchedBy}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${match.method === "Auto Match"
                                                ? "bg-blue-500/10 text-blue-600"
                                                : match.method === "Manual Match"
                                                    ? "bg-violet-500/10 text-violet-600"
                                                    : "bg-amber-500/10 text-amber-600"
                                            }`}>
                                            {match.method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${match.confidence === "Verified"
                                                ? "bg-emerald-500/10 text-emerald-600"
                                                : match.confidence === "High"
                                                    ? "bg-blue-500/10 text-blue-600"
                                                    : "bg-amber-500/10 text-amber-600"
                                            }`}>
                                            {match.confidence}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCertify(match.id)} className="p-2 hover:bg-emerald-500/10 rounded-lg transition-all" title="Certify">
                                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                            </button>
                                            <button onClick={() => handleViewHistory(match.id)} className="p-2 hover:bg-violet-500/10 rounded-lg transition-all" title="View History">
                                                <History className="h-4 w-4 text-violet-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
