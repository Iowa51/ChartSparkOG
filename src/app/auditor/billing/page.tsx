"use client";

import {
    DollarSign,
    TrendingUp,
    ShieldCheck,
    AlertTriangle,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Database,
    Fingerprint,
    Layers,
    SearchCode,
    Activity,
    Search,
    Filter,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const billingStats = {
    totalBilled: 1450000, // in cents
    totalCollected: 1220000,
    complianceRate: 94,
    pendingManualMatches: 3
};

const auditWorklist = [
    { id: "CLM-912A", patient: "Sarah Connor", org: "Wellness Center", amount: 21500, status: "Paid", flagging: "low" },
    { id: "CLM-883B", patient: "John McClane", org: "Main Street Clinic", amount: 18500, status: "Denied", flagging: "high" },
    { id: "CLM-442C", patient: "Ellen Ripley", org: "Wellness Center", amount: 32000, status: "Submitted", flagging: "medium" },
];

const oversightTools = [
    { label: "Integrity Analytics", href: "/auditor/billing/analytics", icon: PieChart, color: "text-blue-500", bg: "bg-blue-500/10", desc: "Yield & Efficiency Trends" },
    { label: "Denial Forensics", href: "/auditor/billing/denials", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", desc: "Root Cause Investigation" },
    { label: "Fee Schedule Audit", href: "/auditor/billing/schedules", icon: Database, color: "text-indigo-500", bg: "bg-indigo-500/10", desc: "Cross-Org Parity Check" },
    { label: "Matching Oversight", href: "/auditor/billing/era-audit", icon: Fingerprint, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Payment Integrity Audit" },
    { label: "Benchmarking", href: "/auditor/billing/organizations", icon: Layers, color: "text-primary", bg: "bg-primary/10", desc: "Org Performance Matrix" },
    { label: "Compliance Reports", href: "/auditor/reports", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", desc: "Regulatory Audit Proofs" },
];

export default function FinancialAuditOverview() {
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Command Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        Financial Oversight Suite
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Consolidated compliance hub for claims, remittances, and revenue integrity.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-3 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                        <ShieldCheck className="h-4 w-4" />
                        Assign Global Flag
                    </button>
                </div>
            </div>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Gross Billed</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(billingStats.totalBilled)}</h2>
                    <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                        <TrendingUp className="h-3 w-3" />
                        <span>+12.5% this month</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Collected Yield</p>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(billingStats.totalCollected)}</h2>
                    <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
                        <TrendingUp className="h-3 w-3" />
                        <span>84.1% Yield Rate</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group border-primary/20">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compliance Score</p>
                    <h2 className="text-3xl font-bold text-primary">{billingStats.complianceRate}%</h2>
                    <div className="flex items-center gap-1 text-primary text-xs font-bold mt-2 animate-pulse">
                        <Activity className="h-3 w-3" />
                        <span>Elite Audit Accuracy</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group border-amber-500/20">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertTriangle className="h-16 w-16" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unmatched Remittances</p>
                    <h2 className="text-3xl font-bold text-amber-600">{billingStats.pendingManualMatches} Items</h2>
                    <div className="flex items-center gap-1 text-amber-600 text-xs font-bold mt-2">
                        <ArrowRight className="h-3 w-3" />
                        <span>Requires Manual Match</span>
                    </div>
                </div>
            </div>

            {/* Specialized Toolset Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {oversightTools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <tool.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{tool.label}</h3>
                                <p className="text-xs text-slate-500">{tool.desc}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Audit Worklist Ledger */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Claims Audit Ledger</h3>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter by ID, Patient, or Org..."
                                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium w-64 focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Claim ID</th>
                                    <th className="px-6 py-4">Patient / Org</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Lifecycle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {auditWorklist.map((item) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-slate-500 group-hover:text-primary transition-colors cursor-pointer">{item.id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{item.patient}</p>
                                            <p className="text-xs text-slate-500">{item.org}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.status === "Paid" ? "bg-emerald-500/10 text-emerald-600" :
                                                    item.status === "Denied" ? "bg-red-500/10 text-red-600" :
                                                        "bg-blue-500/10 text-blue-600"
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/auditor/billing/claims/${item.id}`}
                                                className="p-2 hover:bg-primary/10 text-slate-400 hover:text-primary rounded-lg transition-colors inline-block"
                                            >
                                                <SearchCode className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Integrity Alerts Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-500 animate-bounce" />
                            Integrity Alerts
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40 relative group overflow-hidden">
                                <SearchCode className="h-12 w-12 text-red-500 absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-black text-red-600 uppercase tracking-widest">Pricing Mismatch</p>
                                    <span className="text-[10px] text-red-400 font-bold uppercase">Critical</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">BCBS Claim #91128</p>
                                <p className="text-xs text-slate-500 mt-1">Billed at $210 vs Schedule $185</p>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 relative group overflow-hidden">
                                <Database className="h-12 w-12 text-amber-500 absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Missing Justification</p>
                                    <span className="text-[10px] text-amber-400 font-bold uppercase">Warning</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">CPT 99214 Patterns</p>
                                <p className="text-xs text-slate-500 mt-1">8 Claims missing regulatory G-codes</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary to-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-primary/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Audit Performance</p>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1 font-bold">
                                    <span>Reimbursement Yield</span>
                                    <span>84%</span>
                                </div>
                                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-[84%] relative">
                                        <div className="absolute top-0 right-0 h-full w-4 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-1 font-bold">
                                    <span>Audit Velocity</span>
                                    <span>62%</span>
                                </div>
                                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 w-[62%] relative shadow-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
