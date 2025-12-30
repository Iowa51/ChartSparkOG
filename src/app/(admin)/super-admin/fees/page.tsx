"use client";

import { useState } from "react";
import {
    Search,
    Edit,
    Save,
    X,
    Percent,
    DollarSign,
    Building2,
    TrendingUp,
    AlertTriangle,
    ArrowLeft,
} from "lucide-react";
import { feeConfigurations, platformBillingStats } from "@/lib/demo-data/billing";
import Link from "next/link";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default function SuperAdminFeesPage() {
    const [editingOrg, setEditingOrg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredConfigs = feeConfigurations.filter((c) =>
        c.org_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = platformBillingStats;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Platform Revenue
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Global Fee Configuration & Yield Management
                        </p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Fee Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-2xl shadow-primary/10">
                            <div className="flex items-center gap-3 mb-4">
                                <DollarSign className="h-6 w-6 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Cumulative Fees</span>
                            </div>
                            <p className="text-3xl font-black tracking-tighter">{formatCurrency(stats.total_fees_collected)}</p>
                            <p className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                +12% Growth
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <Percent className="h-6 w-6 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Benchmark Rate</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">1.0%</p>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Global Default</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <Building2 className="h-6 w-6 text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Managed Entities</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {feeConfigurations.length}
                            </p>
                            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Active Revenue Streams</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp className="h-6 w-6 text-purple-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Yield Forecast</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {formatCurrency(stats.total_fees_collected * 0.12)}
                            </p>
                            <p className="text-xs font-bold text-emerald-500 mt-2 uppercase tracking-widest">Projected (MTD)</p>
                        </div>
                    </div>

                    {/* Default Fee Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">
                            Global Revenue Policy
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    Default Service Fee
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            defaultValue="1.0"
                                            step="0.1"
                                            min="0"
                                            max="10"
                                            className="w-32 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-2xl font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">%</span>
                                    </div>
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" />
                                        MAXIMIZING YIELD
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">This rate is automatically inherited by all clinical organizations upon registration.</p>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                    Default Collection Protocol
                                </label>
                                <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                                    <option value="charge_separately">Invoice-based (Monthly Cycle)</option>
                                    <option value="deduct_from_billing">Direct Ledger Deduction (Real-time)</option>
                                </select>
                                <p className="text-xs text-slate-400 font-medium">Determines how the platform captures its share of clinical revenue.</p>
                            </div>
                        </div>
                    </div>

                    {/* Organizations Fee Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Entity Overrides
                            </h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Find organization..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white w-full md:w-64 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Organization</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Fee %</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Protocol</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Gross Yield</th>
                                        <th className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredConfigs.map((config) => {
                                        const orgStats = stats.organizations.find((o) => o.organization_id === config.org_id);
                                        const isEditing = editingOrg === config.org_id;

                                        return (
                                            <tr key={config.org_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group transition-colors">
                                                <td className="px-8 py-5 font-black text-slate-900 dark:text-white text-sm">
                                                    {config.org_name}
                                                </td>
                                                <td className="px-8 py-5">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            defaultValue={config.fee_percentage}
                                                            step="0.1"
                                                            min="0"
                                                            max="10"
                                                            className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border-2 border-primary rounded-lg text-sm font-black outline-none"
                                                        />
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1 bg-primary/5 text-primary font-mono font-black rounded-lg border border-primary/10">
                                                            {config.fee_percentage.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5">
                                                    {isEditing ? (
                                                        <select className="px-3 py-1 bg-white dark:bg-slate-800 border-2 border-primary rounded-lg text-sm font-bold outline-none">
                                                            <option value="charge_separately">Invoice</option>
                                                            <option value="deduct_from_billing">Deduction</option>
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.method === "deduct_from_billing"
                                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                                }`}
                                                        >
                                                            {config.method === "deduct_from_billing" ? "Deduction" : "Invoice"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 font-black text-emerald-600 text-sm">
                                                    {formatCurrency(orgStats?.total_fees || 0)}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingOrg(null)}
                                                                className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingOrg(null)}
                                                                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEditingOrg(config.org_id)}
                                                            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Alert */}
                    <div className="bg-slate-900 rounded-2xl p-6 flex items-start gap-4 border border-slate-800 shadow-xl">
                        <AlertTriangle className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-black text-white uppercase tracking-widest text-xs">Governance Notice</p>
                            <p className="text-sm text-slate-400 mt-1 font-medium leading-relaxed">
                                Fee adjustments are globally applied to the next billing cycle. Existing invoices are not affected by protocol changes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
