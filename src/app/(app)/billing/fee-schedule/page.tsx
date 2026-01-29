"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Copy,
    DollarSign,
    Tag,
    Globe,
    User,
    ChevronDown,
    Filter,
    CheckCircle2,
    AlertCircle,
    FileText,
    History
} from "lucide-react";

interface FeeScheduleItem {
    id: string;
    code: string;
    description: string;
    standardRate: number; // in cents
    medicaidRate: number;
    medicareRate: number;
    category: 'E/M' | 'Psychotherapy' | 'Testing' | 'Other';
}

const initialFees: FeeScheduleItem[] = [
    { id: '1', code: '99214', description: 'Office visit, established patient, 30-39 min', standardRate: 18500, medicaidRate: 8500, medicareRate: 11200, category: 'E/M' },
    { id: '2', code: '90834', description: 'Psychotherapy, 45 minutes with patient', standardRate: 15500, medicaidRate: 7200, medicareRate: 9800, category: 'Psychotherapy' },
    { id: '3', code: '90837', description: 'Psychotherapy, 60 minutes with patient', standardRate: 21500, medicaidRate: 9500, medicareRate: 14200, category: 'Psychotherapy' },
    { id: '4', code: '96130', description: 'Psychological testing evaluation, first hour', standardRate: 25000, medicaidRate: 12000, medicareRate: 18500, category: 'Testing' },
    { id: '5', code: '90791', description: 'Psychiatric diagnostic evaluation', standardRate: 28500, medicaidRate: 14500, medicareRate: 19800, category: 'Other' },
];

export default function FeeSchedulePage() {
    const [fees, setFees] = useState<FeeScheduleItem[]>(initialFees);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeSchedule, setActiveSchedule] = useState<'global' | 'provider'>('global');

    const filteredFees = fees.filter(f =>
        f.code.includes(searchQuery) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Fee Schedule Manager"
                description="Manage organization-wide service pricing, CPT codes, and payer-specific contract rates."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing", href: "/billing" },
                    { label: "Fee Schedule" },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Control Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                        <button
                            onClick={() => setActiveSchedule('global')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSchedule === 'global' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Globe className="h-3 w-3 inline mr-2" />
                            Global Schedule
                        </button>
                        <button
                            onClick={() => setActiveSchedule('provider')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSchedule === 'provider' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <User className="h-3 w-3 inline mr-2" />
                            Provider Specific
                        </button>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search codes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95">
                            <Plus className="h-4 w-4" />
                            Add Code
                        </button>
                    </div>
                </div>

                {/* Fees Table */}
                <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">CPT Code</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Standard Rate</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Medicare</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Medicaid</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredFees.map((fee) => (
                                    <tr key={fee.id} className="group hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-foreground font-mono">{fee.code}</span>
                                            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 bg-muted rounded uppercase text-muted-foreground">{fee.category}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground max-w-md truncate">
                                            {fee.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-foreground">{formatCurrency(fee.standardRate)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-500">{formatCurrency(fee.medicareRate)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-500">{formatCurrency(fee.medicaidRate)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audit & Settings Bottom Rail */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-card p-6 rounded-3xl border border-border border-l-4 border-l-amber-500 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Regulatory Notice
                            </h4>
                            <span className="text-[9px] font-bold text-muted-foreground">Updated Dec 2025</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Changes to your Fee Schedule will affect all **Unsubmitted Encounters**. Submitted claims will maintain the rate active at the time of claim generation to ensure compliance with payer contracts.
                        </p>
                        <div className="flex items-center gap-4">
                            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                                <History className="h-3 w-3" />
                                View Revision History
                            </button>
                            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Export for Payer Negotiation
                            </button>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Revenue Intelligence
                        </h4>
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-primary/20">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-foreground">Standardized ICD-10 Mapping</p>
                                <p className="text-[10px] text-muted-foreground">Automatically link diagnosis codes to CPT codes.</p>
                            </div>
                            <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer shadow-inner">
                                <div className="h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform translate-x-5 transition-transform" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
