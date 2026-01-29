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
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="h-8 w-8 text-primary" />
                        Executive Benchmarking
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Comparative performance matrix and compliance ranking for all assigned organizations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                        <BarChart3 className="h-4 w-4" />
                        Export Leaderboard
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                        <SearchCode className="h-4 w-4" />
                        Cross-Org Audit
                    </button>
                </div>
            </div>

            {/* High-Level Ranking */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Top Performer</p>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Wellness Center</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">94% Compliance</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-red-500/20">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Least Efficient</p>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="h-10 w-10 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-xl flex items-center justify-center">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Main Street Clinic</p>
                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-tighter">74% Net Yield</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Yield Across Suite</p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mt-4">81.3%</h2>
                    <p className="text-[10px] text-slate-400 mt-1 italic font-medium">Industry Avg: 78.5%</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Coverage</p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mt-4">62.8%</h2>
                    <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: "62.8%" }} />
                    </div>
                </div>
            </div>

            {/* Performance Matrix Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Organization Performance Matrix</h3>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Organization..."
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest w-64 border-primary/20"
                            />
                        </div>
                        <button className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500">
                            <Filter className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Financial Yield</th>
                                <th className="px-6 py-4">Compliance Score</th>
                                <th className="px-6 py-4">Audited Revenue</th>
                                <th className="px-6 py-4">MOM Trend</th>
                                <th className="px-6 py-4 text-right">Drill-down</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {benchmarkData.map((org, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600">
                                                <Building2 className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{org.name}</p>
                                                <p className="text-[10px] text-slate-400 italic">#{org.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-bold">{org.yield}%</span>
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${org.yield >= 85 ? "bg-emerald-500" : org.yield >= 75 ? "bg-blue-500" : "bg-amber-500"}`}
                                                    style={{ width: `${org.yield}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${org.compliance >= 90 ? "bg-emerald-500/10 text-emerald-600" :
                                                org.compliance >= 80 ? "bg-blue-500/10 text-blue-600" :
                                                    "bg-red-500/10 text-red-600"
                                            }`}>
                                            {org.compliance}% Match
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(org.collected)}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">of {formatCurrency(org.billed)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {org.trend === "up" ? (
                                            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-tighter">
                                                <ArrowUpRight className="h-3 w-3" />
                                                Accelerating
                                            </div>
                                        ) : org.trend === "down" ? (
                                            <div className="flex items-center gap-1 text-red-600 text-[10px] font-black uppercase tracking-tighter">
                                                <ArrowDownRight className="h-3 w-3" />
                                                Decelerating
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
                                                <Activity className="h-3 w-3" />
                                                Stable
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-lg transition-colors">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Portfolio Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                        <Users className="h-5 w-5 text-primary" />
                        Auditor Portfolio Overview
                    </h3>
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between border border-primary/10">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Assigned Organizations</p>
                                    <p className="text-xs text-slate-500">Portfolio active & monitored</p>
                                </div>
                            </div>
                            <span className="text-2xl font-black text-primary">3</span>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between border border-emerald-500/10">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Active Clinicians</p>
                                    <p className="text-xs text-slate-500">Under financial oversight</p>
                                </div>
                            </div>
                            <span className="text-2xl font-black text-emerald-600">42</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/20 relative overflow-hidden flex flex-col justify-center gap-4">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <BarChart3 className="h-48 w-48 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Portfolio Health Status</h3>
                    <p className="text-slate-400 text-sm max-w-sm">The overall health of your assigned organizations is <span className="text-emerald-400 font-bold italic tracking-widest uppercase">Excellent</span>. No critical interventions required today.</p>
                    <div className="flex gap-2 pt-4">
                        <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest">
                            32 Flagged
                        </div>
                        <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest">
                            12k Audited
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
