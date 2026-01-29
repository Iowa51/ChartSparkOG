"use client";

import { Header } from "@/components/layout";
import { ClaimsManagerTable } from "@/components/billing/ClaimsManagerTable";
import { DenialWorklist } from "@/components/billing/DenialWorklist";
import { ConnectivityDashboard } from "@/components/billing/ConnectivityDashboard";
import { useState } from "react";
import {
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    History,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle
} from "lucide-react";

export default function ClaimsPage() {
    const [activeTab, setActiveTab] = useState<'worklist' | 'denials'>('worklist');

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Claims Manager"
                description="Monitor electronic claim transmission status and manage administrative worklists."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing", href: "/billing" },
                    { label: "Claims Manager" },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Triage Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-500 rounded-xl text-white">
                                <Activity className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                                +12% <ArrowUpRight className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">In-Flight Claims</p>
                            <h4 className="text-3xl font-black text-foreground">342</h4>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-emerald-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-500 rounded-xl text-white">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                98.2% <Activity className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-emerald-500 transition-colors">Clean Claim Rate</p>
                            <h4 className="text-3xl font-black text-foreground">A+</h4>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-red-500/50 transition-colors text-red-500">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-red-500 rounded-xl text-white">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black flex items-center gap-1">
                                -4% <ArrowDownRight className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-red-500 transition-colors">Pending Rejections</p>
                            <h4 className="text-3xl font-black text-foreground">18</h4>
                        </div>
                    </div>

                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between group hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-500 rounded-xl text-white">
                                <History className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black text-amber-600 flex items-center gap-1">
                                14 Days <Clock className="h-3 w-3" />
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-amber-500 transition-colors">Avg. Cycle Time</p>
                            <h4 className="text-3xl font-black text-foreground">Standard</h4>
                        </div>
                    </div>
                </div>

                {/* Claims Manager Table */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Processing Worklist
                        </h3>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-[10px] font-black text-muted-foreground uppercase border border-border">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Office Ally API Linked
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 mb-6 w-fit">
                        <button
                            onClick={() => setActiveTab('worklist')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'worklist' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Standard Worklist
                        </button>
                        <button
                            onClick={() => setActiveTab('denials')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'denials' ? "bg-white dark:bg-slate-800 text-red-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Denial Recovery
                        </button>
                    </div>

                    {activeTab === 'worklist' ? <ClaimsManagerTable /> : <DenialWorklist />}
                </section>

                {/* Tech Dashboard (Bottom Rail) */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {/* Placeholder for future expansion or help content */}
                        <div className="h-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center p-12 text-center group">
                            <div className="max-w-sm space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full w-fit mx-auto group-hover:scale-110 transition-transform">
                                    <FileText className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Electronic Compliance</h3>
                                <p className="text-xs text-slate-500 font-medium">Detailed 837P transmission logs and technical loop validation summaries will appear here during live batches.</p>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <ConnectivityDashboard />
                    </div>
                </section>
            </main>
        </div>
    );
}
