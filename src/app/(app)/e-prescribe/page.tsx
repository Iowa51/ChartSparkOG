"use client";

import { Header } from "@/components/layout";
import { Pill, Search, Plus, AlertCircle, CheckCircle2, FlaskConical, Clipboard, ArrowRight, ShieldCheck } from "lucide-react";

export default function EPrescribePage() {
    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="E-Prescribing"
                description="Secure medication orders and pharmacy coordination."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "E-Prescribe" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Search & New Rx */}
                <div className="flex flex-col md:flex-row gap-6 items-stretch md:items-center justify-between">
                    <div className="relative flex-1 max-w-2xl group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search clinical drug database (DrugBank, FDA)..."
                            className="w-full pl-14 pr-6 py-5 bg-card border-none rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-border focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-lg"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-3 px-8 py-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
                        <Plus className="h-6 w-6" />
                        New Prescription
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Prescriptions / Queue */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card rounded-[2.5rem] border border-border shadow-md overflow-hidden">
                            <div className="px-8 py-6 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                                    <Clipboard className="h-4 w-4 text-primary" />
                                    Active Orders & Renewals
                                </h3>
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg border border-primary/20 uppercase tracking-widest">3 Pending</span>
                            </div>
                            <div className="divide-y divide-border">
                                {[
                                    { drug: "Sertraline HCL", dose: "50mg Oral Tablet", patient: "John Doe", status: "Ready to Sign", color: "text-amber-500 bg-amber-50 border-amber-100" },
                                    { drug: "Lisinopril", dose: "10mg Tablet", patient: "Sarah Miller", status: "Transmitted", color: "text-emerald-500 bg-emerald-50 border-emerald-100" },
                                    { drug: "Metformin", dose: "500mg BID", patient: "Robert Wilson", status: "Draft", color: "text-slate-400 bg-slate-50 border-slate-100" }
                                ].map((rx, idx) => (
                                    <div key={idx} className="p-8 flex items-center justify-between hover:bg-muted/30 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                <Pill className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{rx.drug}</p>
                                                <p className="text-sm font-bold text-muted-foreground mt-1">{rx.dose} • <span className="text-foreground">{rx.patient}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${rx.color}`}>
                                                {rx.status}
                                            </span>
                                            <button className="p-3 hover:bg-primary/10 hover:text-primary rounded-xl transition-all">
                                                <ArrowRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-6 text-xs font-black text-muted-foreground uppercase tracking-[0.3em] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all border-t border-border">
                                View Entire Medication History
                            </button>
                        </div>

                        {/* Drug Intelligence / Interactions */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FlaskConical className="h-24 w-24" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-8 flex items-center gap-3 tracking-tight">
                                    <AlertCircle className="h-7 w-7 text-primary" />
                                    Clinical Decision Support
                                </h3>
                                <div className="space-y-6">
                                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-3">
                                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Drug-Drug interaction Check</span>
                                        </div>
                                        <p className="text-sm text-white/70 font-medium leading-relaxed italic">
                                            "No severe interactions detected for current patient regimen. Monitor for additive sedation if prescribing benzodiazepines."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Pharmacy & Compliance */}
                    <aside className="space-y-8">
                        <div className="bg-card rounded-[2rem] border border-border p-8 shadow-sm">
                            <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em] mb-6">Patient Pharmacy</h4>
                            <div className="p-5 bg-muted/30 rounded-2xl border border-border">
                                <p className="font-black text-foreground">CVS Pharmacy #4829</p>
                                <p className="text-xs text-muted-foreground font-medium mt-1">123 Main St, Anytown, USA</p>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">(555) 123-4567</p>
                                <button className="mt-4 w-full py-2.5 bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">
                                    Change Pharmacy
                                </button>
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">EPCS Certified</span>
                            </div>
                            <p className="text-sm text-emerald-700/80 font-medium leading-relaxed">
                                Controlled substance prescribing is enabled for this clinician account via ID.me verification.
                            </p>
                        </div>

                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-60">Platform Stats</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white/70">Refills Processed</span>
                                    <span className="text-lg font-black tracking-tighter">1,204</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white/70">Avg Precision</span>
                                    <span className="text-lg font-black tracking-tighter text-emerald-400">99.8%</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
