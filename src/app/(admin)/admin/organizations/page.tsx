"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Search,
    Plus,
    Edit,
    Eye,
    Users,
    FileText,
    DollarSign,
    Building2,
    Settings,
    MoreVertical,
    Check,
    Crown,
    Zap,
    Star,
} from "lucide-react";
import { demoOrganizations } from "@/lib/demo-data/organizations";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const tierConfig = {
    starter: { label: "Starter", icon: Zap, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    pro: { label: "Pro", icon: Star, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    complete: { label: "Complete", icon: Crown, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

const statusConfig = {
    active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    inactive: { label: "Inactive", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    trial: { label: "Trial", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function AdminOrganizationsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredOrgs = demoOrganizations.filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Organizations
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage organizations and their subscription plans
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors">
                        <Plus className="h-5 w-5" />
                        Add Organization
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-primary/10">
                                    <Building2 className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{demoOrganizations.length}</p>
                                    <p className="text-xs text-slate-500">Total Organizations</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                    <Check className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {demoOrganizations.filter((o) => o.subscription_status === "active").length}
                                    </p>
                                    <p className="text-xs text-slate-500">Active</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                    <Crown className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {demoOrganizations.filter((o) => o.subscription_tier === "complete").length}
                                    </p>
                                    <p className="text-xs text-slate-500">Complete Tier</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                    <Star className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {demoOrganizations.filter((o) => o.subscription_status === "trial").length}
                                    </p>
                                    <p className="text-xs text-slate-500">In Trial</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                    </div>

                    {/* Organizations Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Subscription</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Users</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Notes</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Revenue</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Fee %</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredOrgs.map((org) => {
                                    const tier = tierConfig[org.subscription_tier];
                                    const status = statusConfig[org.subscription_status];
                                    const TierIcon = tier.icon;

                                    return (
                                        <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-lg bg-primary/10">
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
                                                        <p className="text-xs text-slate-500">{org.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${tier.color}`}>
                                                        <TierIcon className="h-3 w-3" />
                                                        {tier.label}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <Users className="h-4 w-4" />
                                                    <span className="font-medium">{org.users_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="font-medium">{org.notes_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(org.billing_total)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded font-mono font-bold text-sm">
                                                    {org.platform_fee_percentage}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        <Settings className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
