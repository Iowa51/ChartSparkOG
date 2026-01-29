"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    ArrowLeft,
    Calendar,
    BarChart3,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    ShieldCheck,
    Briefcase,
    History
} from 'lucide-react';
import { Header } from "@/components/layout";

const demoStats = {
    mtdCollected: 1245000, // in cents
    mtdSubmitted: 1580000,
    ytdCollected: 14250000,
    ytdSubmitted: 16800000,
    avgDaysToPayment: 23,
    collectionRate: 85,
};

const demoClaims = [
    { id: '1', patient: 'John Smith', date: '2026-01-20', amount: 18500, status: 'paid', payer: 'BlueCross' },
    { id: '2', patient: 'Mary Johnson', date: '2026-01-19', amount: 13500, status: 'submitted', payer: 'Aetna' },
    { id: '3', patient: 'Robert Davis', date: '2026-01-18', amount: 9500, status: 'pending', payer: 'Medicare' },
    { id: '4', patient: 'Lisa Wilson', date: '2026-01-17', amount: 21000, status: 'paid', payer: 'UnitedHealth' },
    { id: '5', patient: 'James Brown', date: '2026-01-16', amount: 11000, status: 'denied', payer: 'Cigna' },
];

const demoMonthlyData = [
    { month: 'Aug', submitted: 1420000, collected: 1210000 },
    { month: 'Sep', submitted: 1580000, collected: 1340000 },
    { month: 'Oct', submitted: 1650000, collected: 1420000 },
    { month: 'Nov', submitted: 1490000, collected: 1280000 },
    { month: 'Dec', submitted: 1720000, collected: 1490000 },
    { month: 'Jan', submitted: 1580000, collected: 1245000 },
];

export default function RevenueDashboardPage() {
    const [timeRange, setTimeRange] = useState<'mtd' | 'ytd'>('mtd');

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Revenue Dashboard"
                description="Track collection rates, reimbursement trends, and financial performance across the practice."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing", href: "/billing" },
                    { label: "Revenue" },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Triage Dashboard Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-emerald-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-500 rounded-xl text-white">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                +14% <ArrowUpRight className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-emerald-500 transition-colors">MTD Reimbursed</p>
                            <h4 className="text-3xl font-black text-foreground">{formatCurrency(demoStats.mtdCollected)}</h4>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-500 rounded-xl text-white">
                                <FileText className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                                92 Claims <ChevronRight className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-blue-500 transition-colors">In-Flight Revenue</p>
                            <h4 className="text-3xl font-black text-foreground">{formatCurrency(demoStats.mtdSubmitted - demoStats.mtdCollected)}</h4>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-500 rounded-xl text-white">
                                <Clock className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-amber-600 flex items-center gap-1">
                                -2 Days <ArrowDownRight className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-amber-500 transition-colors">Avg Payment Cycle</p>
                            <h4 className="text-3xl font-black text-foreground">{demoStats.avgDaysToPayment} Days</h4>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary rounded-xl text-white">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-primary flex items-center gap-1">
                                Top Dist. <ShieldCheck className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Collection Rate</p>
                            <h4 className="text-3xl font-black text-foreground">{demoStats.collectionRate}%</h4>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Primary Chart Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-card rounded-3xl border border-border shadow-sm p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Revenue Collection Matrix</h3>
                                    <p className="text-xs text-muted-foreground">Rolling 6-month comparison of billed vs. collected revenue.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-[10px] font-black text-muted-foreground uppercase">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" /> Billed
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-[10px] font-black text-muted-foreground uppercase">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Collected
                                    </div>
                                </div>
                            </div>

                            <div className="h-64 flex items-end gap-6 pb-2">
                                {demoMonthlyData.map((data, idx) => {
                                    const maxVal = Math.max(...demoMonthlyData.map(d => d.submitted));
                                    const billedHeight = (data.submitted / maxVal) * 100;
                                    const collHeight = (data.collected / maxVal) * 100;

                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center gap-3">
                                            <div className="w-full flex gap-1.5 items-end justify-center h-48">
                                                <div
                                                    className="w-4 bg-blue-500/20 dark:bg-blue-500/10 rounded-t-lg transition-all hover:bg-blue-500/30"
                                                    style={{ height: `${billedHeight}%` }}
                                                />
                                                <div
                                                    className="w-4 bg-emerald-500 rounded-t-lg transition-all hover:scale-x-110"
                                                    style={{ height: `${collHeight}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{data.month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <History className="h-4 w-4 text-primary" />
                                Recent High-Value Adjustments
                            </h3>
                            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            <th className="px-6 py-4">Patient</th>
                                            <th className="px-6 py-4">Payer</th>
                                            <th className="px-6 py-4">Service Date</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {demoClaims.map((claim) => (
                                            <tr key={claim.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all font-medium">
                                                <td className="px-6 py-4 text-sm font-black text-foreground">{claim.patient}</td>
                                                <td className="px-6 py-4 text-xs text-muted-foreground uppercase italic">{claim.payer}</td>
                                                <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(claim.date)}</td>
                                                <td className="px-6 py-4 text-sm font-black text-foreground">{formatCurrency(claim.amount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${claim.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                        claim.status === 'denied' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                            'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                                        }`}>
                                                        {claim.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Revenue AI Sidebar */}
                    <aside className="space-y-8">
                        <section className="bg-slate-900 dark:bg-white rounded-3xl p-8 text-white dark:text-slate-900 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                                <Sparkles className="h-24 w-24" />
                            </div>
                            <div className="relative space-y-6">
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 dark:bg-slate-900/10 rounded-full w-fit">
                                    <Sparkles className="h-3 w-3 text-amber-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Revenue AI Preview</span>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black leading-tight italic">Maximize Your Reimbursements.</h3>
                                    <p className="text-xs text-white/70 dark:text-slate-900/70 leading-relaxed">
                                        Our upcoming AI layer analyzes clinical documentation to auto-suggest optimized CPT codes.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <div className="p-3 bg-white/5 dark:bg-slate-900/5 rounded-xl border border-white/10 dark:border-slate-900/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Medical Necessity Guard</p>
                                        <p className="text-[10px] opacity-70">Flags claims missing key clinical justification before submission.</p>
                                    </div>
                                    <div className="p-3 bg-white/5 dark:bg-slate-900/5 rounded-xl border border-white/10 dark:border-slate-900/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Payer Pattern Analysis</p>
                                        <p className="text-[10px] opacity-70">Predicts denial risk based on real-time payer behavior data.</p>
                                    </div>
                                </div>
                                <button className="w-full py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95">
                                    Join the Beta
                                </button>
                            </div>
                        </section>

                        <section className="bg-card rounded-3xl border border-border shadow-sm p-8 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-primary" />
                                Operational Shortcuts
                            </h3>
                            <div className="grid gap-3">
                                <Link href="/billing/fee-schedule" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border hover:border-primary/30 transition-all group">
                                    <span className="text-xs font-bold text-foreground">Manage Fee Schedule</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </Link>
                                <Link href="/billing/era-inbox" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border hover:border-primary/30 transition-all group">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">ERA Matcher</span>
                                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full">3</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </Link>
                                <button className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border hover:border-primary/30 transition-all group">
                                    <span className="text-xs font-bold text-foreground">Financial Audit Trail</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                            </div>
                        </section>
                    </aside>
                </div>
            </main>
        </div>
    );
}
