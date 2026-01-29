"use client";

import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    BarChart3,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Activity,
    Brain,
    Clock,
    User,
    ShieldAlert
} from "lucide-react";
import { useState } from "react";

const analyticsData = {
    yieldTrends: [
        { month: "Sep", yield: 82, billed: 120000, collected: 98400 },
        { month: "Oct", yield: 85, billed: 145000, collected: 123250 },
        { month: "Nov", yield: 81, billed: 130000, collected: 105300 },
        { month: "Dec", yield: 88, billed: 160000, collected: 140800 },
        { month: "Jan", yield: 84, billed: 155000, collected: 130200 },
    ],
    providerPerformance: [
        { name: "Dr. Sarah Smith", specialty: "Psychiatry", yield: 92, status: "Optimal" },
        { name: "Dr. Michael Chen", specialty: "Internal Med", yield: 78, status: "At Risk" },
        { name: "Nurse Practitioner Jane Doe", specialty: "Geriatrics", yield: 85, status: "Stable" },
        { name: "Dr. Robert Wilson", specialty: "Psychiatry", yield: 74, status: "Review Needed" },
    ],
    denialHotspots: [
        { code: "CO-16", description: "Claim/service lacks information", count: 42, impact: "$8,400" },
        { code: "PR-204", description: "This service/equipment is not covered", count: 28, impact: "$5,600" },
        { code: "CO-45", description: "Charge exceeds fee schedule", count: 18, impact: "$3,600" },
    ]
};

export default function RevenueAnalyticsPage() {
    const [timeframe, setTimeframe] = useState("90d");

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PieChart className="h-8 w-8 text-primary" />
                        Revenue Integrity Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Deep-dive intelligence on collection yields, provider efficiency, and financial compliance.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    {["30d", "90d", "6m", "1y"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${timeframe === t
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Metrics Hierarchy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="h-24 w-24 text-emerald-500" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Net Yield</p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">84.2%</h2>
                    <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>+2.4% vs last quarter</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="h-24 w-24 text-blue-500" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Time to Settlement</p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">18d</h2>
                    <div className="flex items-center gap-2 text-blue-500 text-sm font-bold">
                        <Activity className="h-4 w-4" />
                        <span>-3 days improvement</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group border-amber-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Brain className="h-24 w-24 text-amber-500" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Audit Fatigue Level</p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 underline decoration-amber-500/30 decoration-4">Low</h2>
                    <div className="flex items-center gap-2 text-amber-600 text-sm font-bold">
                        <Search className="h-4 w-4" />
                        <span>98% High-Fidelity documentation</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Yield Trend Visualization */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Yield & Collection Efficiency</h3>
                            <p className="text-sm text-slate-500">Trailing 5-month performance</p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="flex items-end gap-2 h-48 mb-6">
                        {analyticsData.yieldTrends.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full relative flex items-end justify-center">
                                    <div
                                        className="w-8/12 bg-slate-100 dark:bg-slate-800 rounded-t-lg absolute bottom-0"
                                        style={{ height: `${(d.billed / 160000) * 100}%` }}
                                    />
                                    <div
                                        className="w-8/12 bg-primary rounded-t-lg relative z-10 transition-all group-hover:brightness-110"
                                        style={{ height: `${(d.collected / 160000) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase">{d.month}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <span className="text-xs font-bold text-slate-500">Gross Billed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-primary" />
                            <span className="text-xs font-bold text-slate-500">Net Collected</span>
                        </div>
                    </div>
                </div>

                {/* Denial Hotspots Forensic */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Denial Forensic Hotspots</h3>
                            <p className="text-sm text-slate-500">Top rejection causes by financial impact</p>
                        </div>
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                    </div>

                    <div className="space-y-4">
                        {analyticsData.denialHotspots.map((item, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-red-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="text-xs font-black p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg w-14 text-center">
                                        {item.code}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.description}</p>
                                        <p className="text-xs text-slate-500">{item.count} occurrences detected</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-red-600">{item.impact}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leakage</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-6 py-3 bg-red-500/10 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all">
                        Launch Forensic Drilldown
                    </button>
                </div>
            </div>

            {/* Provider Compliance Matrix */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Provider Compliance Matrix</h3>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                            <Search className="h-4 w-4" />
                        </button>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                            <Filter className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Clinician</th>
                                <th className="px-6 py-4">Performance Index</th>
                                <th className="px-6 py-4">Yield %</th>
                                <th className="px-6 py-4">Compliance Status</th>
                                <th className="px-6 py-4 text-right">Review</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {analyticsData.providerPerformance.map((p, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                {p.name.split(" ").map(n => n[0]).join("")}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.specialty}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${p.yield >= 90 ? 'bg-emerald-500' : p.yield >= 80 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                style={{ width: `${p.yield}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{p.yield}%</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${p.status === "Optimal" ? "bg-emerald-500/10 text-emerald-600" :
                                            p.status === "Stable" ? "bg-blue-500/10 text-blue-600" :
                                                "bg-amber-500/10 text-amber-600"
                                            }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                                            Audit Docs
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
