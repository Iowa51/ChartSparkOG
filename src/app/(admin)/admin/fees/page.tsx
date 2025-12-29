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
} from "lucide-react";
import { feeConfigurations, platformBillingStats } from "@/lib/demo-data/billing";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default function AdminFeesPage() {
    const [editingOrg, setEditingOrg] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredConfigs = feeConfigurations.filter((c) =>
        c.org_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = platformBillingStats;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Platform Fees
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Configure and track platform fees per organization
                    </p>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Fee Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <DollarSign className="h-6 w-6 opacity-80" />
                                <span className="text-sm font-medium opacity-80">Total Fees Collected</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(stats.total_fees_collected)}</p>
                            <p className="text-sm opacity-80 mt-1">All time</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Percent className="h-6 w-6 text-primary" />
                                <span className="text-sm font-medium text-slate-500">Avg Fee Rate</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">1.0%</p>
                            <p className="text-sm text-slate-500 mt-1">Default platform rate</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Building2 className="h-6 w-6 text-blue-500" />
                                <span className="text-sm font-medium text-slate-500">Orgs Configured</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {feeConfigurations.length}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">With custom fees</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="h-6 w-6 text-purple-500" />
                                <span className="text-sm font-medium text-slate-500">This Month</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(stats.total_fees_collected * 0.12)}
                            </p>
                            <p className="text-sm text-emerald-500 mt-1">+8% vs last month</p>
                        </div>
                    </div>

                    {/* Default Fee Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                        <h2 className="font-bold text-slate-900 dark:text-white mb-4">
                            Default Platform Settings
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-2">
                                    Default Fee Percentage
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        defaultValue="1.0"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-lg font-bold"
                                    />
                                    <span className="text-2xl font-bold text-slate-400">%</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Applied to all new organizations</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-2">
                                    Default Collection Method
                                </label>
                                <select className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
                                    <option value="charge_separately">Charge Separately (Invoice)</option>
                                    <option value="deduct_from_billing">Deduct from Billing</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Organizations Fee Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                Organization Fee Configuration
                            </h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search organizations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white w-64"
                                />
                            </div>
                        </div>
                        <table className="min-w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fee %</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Collection Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fees Collected</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredConfigs.map((config) => {
                                    const orgStats = stats.organizations.find((o) => o.organization_id === config.org_id);
                                    const isEditing = editingOrg === config.org_id;

                                    return (
                                        <tr key={config.org_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {config.org_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={config.fee_percentage}
                                                        step="0.1"
                                                        min="0"
                                                        max="10"
                                                        className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-primary rounded text-sm font-bold"
                                                    />
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 bg-primary/10 text-primary font-mono font-bold rounded-lg">
                                                        {config.fee_percentage}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <select className="px-2 py-1 bg-white dark:bg-slate-800 border border-primary rounded text-sm">
                                                        <option value="charge_separately">Charge Separately</option>
                                                        <option value="deduct_from_billing">Deduct from Billing</option>
                                                    </select>
                                                ) : (
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.method === "deduct_from_billing"
                                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                            }`}
                                                    >
                                                        {config.method === "deduct_from_billing" ? "Deduct" : "Invoice"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-emerald-600">
                                                {formatCurrency(orgStats?.total_fees || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingOrg(null)}
                                                            className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingOrg(null)}
                                                            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingOrg(config.org_id)}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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

                    {/* Alert */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800 dark:text-amber-300">Demo Mode</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                Fee changes in demo mode are not persisted. Connect to Supabase for live data.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
