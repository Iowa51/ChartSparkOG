"use client";

import { useState } from "react";
import {
    DollarSign,
    Search,
    Filter,
    ArrowRight,
    TrendingUp,
    FileText,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Building2,
    ShieldCheck,
    ArrowUpRight,
    MoreHorizontal,
    Download,
    Eye
} from "lucide-react";
import Link from "next/link";

const billingStats = {
    totalBilled: 1450000, // in cents
    totalCollected: 1220000,
    complianceRate: 94,
    pendingManualMatches: 3
};

const auditQueue = [
    { id: "CLAIM-101", patient: "John S.", amount: 18500, status: "Submitted", flag: "None", date: "2026-01-25", org: "Wellness Center" },
    { id: "CLAIM-102", patient: "Sarah K.", amount: 22000, status: "Paid", flag: "High Value", date: "2026-01-24", org: "Main Street Clinic" },
    { id: "CLAIM-103", patient: "Robert D.", amount: 8500, status: "Denied", flag: "Policy Gap", date: "2026-01-23", org: "Wellness Center" },
    { id: "CLAIM-104", patient: "Mary J.", amount: 15500, status: "Submitted", flag: "None", date: "2026-01-22", org: "Wellness Center" },
];

export default function FinancialAuditPage() {
    const [searchQuery, setSearchQuery] = useState("");

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
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Financial Audit Portal
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Oversee billing compliance, verify claim integrity, and identify financial discrepancies.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                        <Download className="h-4 w-4" />
                        Export Audit Log
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                        <ShieldCheck className="h-4 w-4" />
                        Assign Compliance Flag
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">+12.5%</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Gross Billings</p>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(billingStats.totalBilled)}</h4>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">84% Yield</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Collections</p>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(billingStats.totalCollected)}</h4>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">High Integrity</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Compliance Rate</p>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{billingStats.complianceRate}%</h4>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-red-500/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">Requires Triage</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Unmatched Payments</p>
                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{billingStats.pendingManualMatches} Items</h4>
                    </div>
                </div>
            </div>

            {/* Audit Table Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Financial Audit Worklist
                        </h3>
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Claim ID or Organization..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium w-64 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Claim ID</th>
                                        <th className="px-6 py-4">Org / Patient</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {auditQueue.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all font-medium">
                                            <td className="px-6 py-4 text-[11px] font-mono text-slate-500">{item.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{item.patient}</div>
                                                <div className="text-[10px] text-slate-500">{item.org}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.status === "Paid" ? "bg-emerald-500/10 text-emerald-600" :
                                                        item.status === "Denied" ? "bg-red-500/10 text-red-600" :
                                                            "bg-blue-500/10 text-blue-600"
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Audit Tools Sidebar */}
                <aside className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Integrity Alerts
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl space-y-1">
                                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Pricing Mismatch</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Claim <strong>#912-A</strong> billed at $210 vs Fee Schedule rate of $185.</p>
                            </div>
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Missing Justification</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">3 claims from <strong>Wellness Center</strong> are missing required G-codes.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20 text-white space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white/90">
                            <TrendingUp className="h-4 w-4" />
                            Financial Performance
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-white/80">
                                    <span>Reimbursement Yield</span>
                                    <span>84%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full" style={{ width: "84%" }} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-white/80">
                                    <span>Audit Completion</span>
                                    <span>62%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white rounded-full" style={{ width: "62%" }} />
                                </div>
                            </div>
                        </div>
                        <button className="w-full py-3 bg-white text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Generate Compliance Report
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
