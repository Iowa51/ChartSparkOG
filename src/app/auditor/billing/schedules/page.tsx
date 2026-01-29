"use client";

import {
    Database,
    Search,
    Filter,
    ArrowUpDown,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Building2,
    TrendingUp,
    ShieldCheck,
    Globe,
    ArrowRight
} from "lucide-react";
import { useState } from "react";

const scheduleParityData = [
    {
        code: "99214",
        description: "Office visit, established, 30-39 min",
        wellnessCenter: 18500,
        mainStreet: 21000,
        marketAvg: 19500,
        status: "Variance Detected"
    },
    {
        code: "90837",
        description: "Psychotherapy, 60 min",
        wellnessCenter: 16500,
        mainStreet: 16500,
        marketAvg: 16800,
        status: "Parity Match"
    },
    {
        code: "90791",
        description: "Psychiatric diagnostic evaluation",
        wellnessCenter: 24500,
        mainStreet: 22000,
        marketAvg: 23500,
        status: "Variance Detected"
    },
    {
        code: "99441",
        description: "Telehealth consult, 5-10 min",
        wellnessCenter: 4500,
        mainStreet: 4500,
        marketAvg: 4800,
        status: "Parity Match"
    }
];

export default function FeeScheduleAuditorPage() {
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
                        <Database className="h-8 w-8 text-indigo-500" />
                        Fee Schedule Auditor
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Cross-organization parity check. Ensure billing consistency and identify under-market pricing.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                        <Globe className="h-4 w-4" />
                        Market Benchmark
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all">
                        <ShieldCheck className="h-4 w-4" />
                        Certify Rate Card
                    </button>
                </div>
            </div>

            {/* Parity Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Total Codes Audited</p>
                    <div className="flex items-end justify-between">
                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white">124</h2>
                        <div className="h-10 w-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 group-hover:rotate-12 transition-transform">
                            <Database className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group border-amber-500/30">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Price Variances</p>
                    <div className="flex items-end justify-between">
                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white">18</h2>
                        <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group border-emerald-500/30">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Parity Score</p>
                    <div className="flex items-end justify-between">
                        <h2 className="text-4xl font-bold text-emerald-600">86%</h2>
                        <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-600 group-hover:-rotate-12 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Parity Analysis Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cross-Organization Rate Comparison</h3>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search CPT Code..."
                                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium w-64 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100">
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">CPT Code</th>
                                <th className="px-6 py-4">Wellness Center</th>
                                <th className="px-6 py-4">Main Street Clinic</th>
                                <th className="px-6 py-4">Market Benchmark</th>
                                <th className="px-6 py-4">Parity Audit</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {scheduleParityData.map((item, i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-primary">
                                                {item.code}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{item.code}</p>
                                                <p className="text-[10px] text-slate-500 w-48 truncate">{item.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(item.wellnessCenter)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(item.mainStreet)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-indigo-600">{formatCurrency(item.marketAvg)}</span>
                                            <Globe className="h-3 w-3 text-slate-300" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.status === "Parity Match"
                                                ? "bg-emerald-500/10 text-emerald-600"
                                                : "bg-amber-500/10 text-amber-600"
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span>Variances detected in <strong>2</strong> essential billing codes. Review recommended to prevent lost revenue.</span>
                        </div>
                        <button className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Sync Base Rates
                        </button>
                    </div>
                </div>
            </div>

            {/* Market Opportunity Intelligence */}
            <div className="p-8 bg-gradient-to-br from-indigo-500 to-primary rounded-3xl text-white shadow-xl shadow-indigo-500/20 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                <div className="absolute -top-12 -right-12 h-64 w-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
                <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                    <h3 className="text-2xl font-bold">Revenue Optimization Opportunity</h3>
                    <p className="text-white/80 max-w-2xl text-sm">Our AI benchmarking suggests that current fee schedules for <strong>Mental Health</strong> services are <strong>12% below</strong> regional market rates. Adjusting to market parity could result in an estimated <strong>$42,500/mo</strong> increase in revenue.</p>
                </div>
                <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg flex-shrink-0">
                    Generate Optimization Report
                </button>
            </div>
        </div>
    );
}
