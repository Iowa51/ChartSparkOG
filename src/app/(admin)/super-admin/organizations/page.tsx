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
    ArrowLeft,
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

export default function SuperAdminOrganizationsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<any>(null);
    const [orgs, setOrgs] = useState(demoOrganizations);

    const filteredOrgs = orgs.filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddOrg = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newOrg = {
            id: `org-${Date.now()}`,
            name: formData.get("name") as string,
            slug: (formData.get("name") as string).toLowerCase().replace(/\s+/g, "-"),
            subscription_tier: formData.get("tier") as any,
            subscription_status: "active",
            users_count: 0,
            notes_count: 0,
            billing_total: 0,
            fees_total: 0,
            platform_fee_percentage: Number(formData.get("fee")),
            fee_collection_method: "automatic" as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as any;
        setOrgs([newOrg, ...orgs]);
        setIsAddModalOpen(false);
    };

    const handleUpdateOrg = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setOrgs(orgs.map(o => o.id === editingOrg.id ? {
            ...o,
            name: formData.get("name") as string,
            subscription_tier: formData.get("tier") as any,
            platform_fee_percentage: Number(formData.get("fee")),
        } : o));
        setEditingOrg(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/super-admin" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Organizations
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Platform Entity Management
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors"
                    >
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
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{orgs.length}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Total Entities</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                    <Check className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                        {orgs.filter((o) => o.subscription_status === "active").length}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Active</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                    <Crown className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                        {orgs.filter((o) => o.subscription_tier === "complete").length}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Enterprise</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                    <Star className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                                        {orgs.filter((o) => o.subscription_status === "trial").length}
                                    </p>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Trials</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by client or domain..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    {/* Organizations Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Users</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fee %</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredOrgs.map((org) => {
                                    const tier = tierConfig[org.subscription_tier as keyof typeof tierConfig];
                                    const status = statusConfig[org.subscription_status as keyof typeof statusConfig];
                                    const TierIcon = tier.icon;

                                    return (
                                        <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{org.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono tracking-tight">{org.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 ">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black w-fit uppercase tracking-wider ${tier.color}`}>
                                                        <TierIcon className="h-3 w-3" />
                                                        {tier.label}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black w-fit uppercase tracking-wider ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <Users className="h-4 w-4" />
                                                    <span className="font-bold text-sm">{org.users_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="font-bold text-sm">{org.notes_count}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-slate-900 dark:text-white text-sm">
                                                    {formatCurrency(org.billing_total)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-mono font-black text-xs border border-emerald-100 dark:border-emerald-800/50">
                                                    {org.platform_fee_percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingOrg(org)}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                    >
                                                        <Edit className="h-4 w-4" />
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

            {/* Add/Edit Modal Overlay */}
            {(isAddModalOpen || editingOrg) && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight">
                                {isAddModalOpen ? "New Organization" : "Edit Config"}
                            </h2>
                            <form
                                onSubmit={isAddModalOpen ? handleAddOrg : handleUpdateOrg}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Official Name</label>
                                    <input
                                        name="name"
                                        required
                                        defaultValue={editingOrg?.name || ""}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                        placeholder="Clinic Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tier</label>
                                        <select
                                            name="tier"
                                            defaultValue={editingOrg?.subscription_tier || "starter"}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold appearance-none"
                                        >
                                            <option value="starter">Starter</option>
                                            <option value="pro">Pro</option>
                                            <option value="complete">Complete</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Platform Fee %</label>
                                        <input
                                            name="fee"
                                            type="number"
                                            step="0.1"
                                            required
                                            defaultValue={editingOrg?.platform_fee_percentage || 1.0}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-black"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddModalOpen(false); setEditingOrg(null); }}
                                        className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        {isAddModalOpen ? "Deploy" : "Update"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
