"use client";

import {
    Layers,
    TrendingUp,
    TrendingDown,
    Building2,
    Users,
    ShieldCheck,
    AlertCircle,
    Activity,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    SearchCode,
    ChevronRight,
    BarChart3
} from "lucide-react";
import { useState } from "react";
import DetailModal from "@/components/ui/DetailModal";

const benchmarkData = [
    {
        id: "ORG-001",
        name: "Wellness Center",
        compliance: 94,
        yield: 88,
        billed: 450000,
        collected: 396000,
        trend: "up",
        status: "Elite"
    },
    {
        id: "ORG-002",
        name: "Main Street Clinic",
        compliance: 82,
        yield: 74,
        billed: 320000,
        collected: 236800,
        trend: "down",
        status: "Review Required"
    },
    {
        id: "ORG-003",
        name: "Valley Psychiatric",
        compliance: 89,
        yield: 82,
        billed: 280000,
        collected: 229600,
        trend: "stable",
        status: "Stable"
    }
];

export default function BenchmarkingPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; content: React.ReactNode }>({ title: "", content: null });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const handleExportLeaderboard = () => {
        setModalContent({
            title: "Export Leaderboard",
            content: (
                <div className="space-y-4">
                    <p className="text-sm">Downloading comprehensive performance report</p>
                    <div className="space-y-2">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <p className="text-xs font-bold text-slate-400 uppercase">Includes</p>
                            <ul className="text-sm mt-1 space-y-1 list-disc list-inside">
                                <li>Full performance rankings</li>
                                <li>Compliance scores</li>
                                <li>Yield percentages</li>
                                <li>Revenue totals</li>
                            </ul>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">File: organization_leaderboard_2026_01_29.xlsx</p>
                        </div>
                    </div>
                    <button className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm">Download Excel</button>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleCrossOrgAudit = () => {
        setModalContent({
            title: "Cross-Organization Audit",
            content: (
                <div className="space-y-4">
                    <p className="text-sm">Launch comparative audit planning tool</p>
                    <div className="space-y-2 text-sm">
                        <p><strong>This tool will:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                            <li>Select organizations to compare</li>
                            <li>Define audit criteria</li>
                            <li>Generate cross-org compliance report</li>
                            <li>Flag variance patterns</li>
                        </ol>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm">Cancel</button>
                        <button className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-bold text-sm">Launch Audit</button>
                    </div>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleMetricClick = (metric: string, orgName?: string) => {
        setModalContent({
            title: orgName ? `${metric} - ${orgName}` : metric,
            content: (
                <div className="text-center p-6">
                    <p className="text-4xl font-bold text-primary mb-2">
                        {metric.includes("Compliance") ? "92%" : metric.includes("Yield") ? "81%" : "$3.5M"}
                    </p>
                    <p className="text-sm text-slate-500">{orgName ? `Organization: ${orgName}` : "Detailed performance metrics available"}</p>
                </div>
            )
        });
        setModalOpen(true);
    };

    const handleOrgDrilldown = (orgName: string) => {
        setModalContent({
            title: `Organization Dashboard - ${orgName}`,
            content: (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Navigate to comprehensive financial dashboard</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <p className="text-xs font-bold text-slate-400 uppercase">Revenue Analytics</p>
                            <p className="text-sm mt-1">View trends</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <p className="text-xs font-bold text-slate-400 uppercase">Claim History</p>
                            <p className="text-sm mt-1">All claims</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <p className="text-xs font-bold text-slate-400 uppercase">Provider Performance</p>
                            <p className="text-sm mt-1">Staff stats</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <p className="text-xs font-bold text-slate-400 uppercase">Denial Patterns</p>
                            <p className="text-sm mt-1">Analysis</p>
                        </div>
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
                            <Layers className="h-8 w-8 text-cyan-500" />
                            Organization Benchmarking
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Cross-organizational performance comparison and leaderboard analytics
                        </p>
                    </div>
                </div>
            </div>

            {/* Aggregated Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                <div onClick={() => handleMetricClick("Avg Compliance")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Avg Compliance</p>
                            <p className="text-3xl font-bold mt-2 text-emerald-600">92%</p>
                        </div>
                        <ShieldCheck className="h-10 w-10 text-emerald-500 opacity-50" />
                    </div>
                </div>

                <div onClick={() => handleMetricClick("Avg Yield")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Avg Yield</p>
                            <p className="text-3xl font-bold mt-2 text-cyan-600">81%</p>
                        </div>
                        <Activity className="h-10 w-10 text-cyan-500 opacity-50" />
                    </div>
                </div>

                <div onClick={() => handleMetricClick("Total Collected")} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Collected</p>
                            <p className="text-3xl font-bold mt-2">$3.5M</p>
                        </div>
                        <BarChart3 className="h-10 w-10 text-indigo-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 pb-4 flex flex-wrap gap-3">
                <button onClick={handleExportLeaderboard} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all flex items-center gap-2">
                    <SearchCode className="h-4 w-4" />
                    Export Leaderboard
                </button>
                <button onClick={handleCrossOrgAudit} className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-cyan-500 hover:text-white hover:border-cyan-500 transition-all flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Cross-Org Audit
                </button>
            </div>

            {/* Organizations Leaderboard */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className="space-y-4">
                    {benchmarkData.map((org, index) => (
                        <div key={index} onClick={() => handleOrgDrilldown(org.name)} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500 hover:shadow-xl transition-all cursor-pointer">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${index === 0 ? "bg-amber-500/20 text-amber-600" :
                                            index === 1 ? "bg-slate-400/20 text-slate-600" :
                                                "bg-orange-500/20 text-orange-600"
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold">{org.name}</h3>
                                            {org.trend === "up" && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                                            {org.trend === "down" && <TrendingDown className="h-5 w-5 text-red-500" />}
                                        </div>
                                        <p className="text-sm text-slate-500">{org.id}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${org.status === "Elite"
                                        ? "bg-emerald-500/10 text-emerald-600"
                                        : org.status === "Stable"
                                            ? "bg-blue-500/10 text-blue-600"
                                            : "bg-amber-500/10 text-amber-600"
                                    }`}>
                                    {org.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div onClick={(e) => { e.stopPropagation(); handleMetricClick("Compliance Score", org.name); }} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer transition-all">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Compliance</p>
                                    <p className="text-2xl font-bold text-emerald-600">{org.compliance}%</p>
                                </div>

                                <div onClick={(e) => { e.stopPropagation(); handleMetricClick("Net Yield", org.name); }} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 cursor-pointer transition-all">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Net Yield</p>
                                    <p className="text-2xl font-bold text-cyan-600">{org.yield}%</p>
                                </div>

                                <div onClick={(e) => { e.stopPropagation(); handleMetricClick("Billed", org.name); }} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-all">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Billed</p>
                                    <p className="text-2xl font-bold">{formatCurrency(org.billed)}</p>
                                </div>

                                <div onClick={(e) => { e.stopPropagation(); handleMetricClick("Collected", org.name); }} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-all">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Collected</p>
                                    <p className="text-2xl font-bold text-violet-600">{formatCurrency(org.collected)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
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
