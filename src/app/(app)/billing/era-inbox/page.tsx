"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import {
    FileCheck,
    Search,
    UserPlus,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Calendar,
    DollarSign,
    Filter,
    MoreHorizontal,
    User,
    Building2,
    History,
    Link as LinkIcon
} from "lucide-react";

interface UnmatchedERA {
    id: string;
    payer: string;
    checkNumber: string;
    checkDate: string;
    amount: number;
    patientName: string; // Name from the ERA
    patientDob?: string;
    reason: string;
    suggestedMatches: {
        patientId: string;
        name: string;
        dob: string;
        score: number;
    }[];
}

const demoUnmatched: UnmatchedERA[] = [
    {
        id: "ERA-9912",
        payer: "UnitedHealth Group",
        checkNumber: "CHK-441029",
        checkDate: "2026-01-25",
        amount: 14500,
        patientName: "Jonathon S.",
        patientDob: "1985-05-12",
        reason: "Patient ID mismatch (Sub-ID 441 vs 442)",
        suggestedMatches: [
            { patientId: "P-101", name: "Jonathan Smith", dob: "1985-05-12", score: 0.95 },
            { patientId: "P-202", name: "John Simpson", dob: "1988-11-02", score: 0.45 }
        ]
    },
    {
        id: "ERA-9915",
        payer: "Aetna Life Insurance",
        checkNumber: "CHK-881223",
        checkDate: "2026-01-24",
        amount: 22000,
        patientName: "Sarah K.",
        reason: "Payer ID not recognized (808 vs AET01)",
        suggestedMatches: [
            { patientId: "P-303", name: "Sarah Kline", dob: "1992-03-15", score: 0.88 }
        ]
    },
    {
        id: "ERA-9918",
        payer: "BCBS of Texas",
        checkNumber: "CHK-112233",
        checkDate: "2026-01-22",
        amount: 8500,
        patientName: "Robert D.",
        patientDob: "1975-01-30",
        reason: "Ambiguous match Found (Multiple DOB matches)",
        suggestedMatches: [
            { patientId: "P-404", name: "Robert Davis", dob: "1975-01-30", score: 0.90 },
            { patientId: "P-505", name: "Robert Dawson", dob: "1975-01-30", score: 0.90 }
        ]
    }
];

export default function ERAInboxPage() {
    const [filter, setFilter] = useState("");
    const [selectedERA, setSelectedERA] = useState<UnmatchedERA | null>(null);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="ERA Triage Inbox"
                description="Manually match electronic remittances (835) that could not be automatically linked to a patient."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing", href: "/billing" },
                    { label: "ERA Inbox" },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Unmatched List */}
                    <section className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <History className="h-4 w-4 text-primary" />
                                Unmatched Remittances ({demoUnmatched.length})
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search Payer or Patient..."
                                    className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all w-64"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {demoUnmatched.map((era) => (
                                <div
                                    key={era.id}
                                    onClick={() => setSelectedERA(era)}
                                    className={`bg-card rounded-2xl border transition-all cursor-pointer group ${selectedERA?.id === era.id ? 'border-primary ring-1 ring-primary/20 shadow-lg' : 'border-border hover:border-primary/50 shadow-sm'}`}
                                >
                                    <div className="p-5 flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 group-hover:text-primary transition-colors">
                                                <DollarSign className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-foreground">{era.patientName}</h4>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1.5 py-0.5 bg-muted/50 rounded">{era.id}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {era.payer}</span>
                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {era.checkDate}</span>
                                                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg font-black tracking-tight">${(era.amount / 100).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-widest">
                                                <AlertCircle className="h-3 w-3" />
                                                Match Error
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1 font-medium">{era.reason}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Matching Console */}
                    <aside className="lg:col-span-1">
                        <div className="bg-card rounded-3xl border border-border shadow-2xl p-6 sticky top-8 space-y-6">
                            {selectedERA ? (
                                <>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Matching Console</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">System found <strong>{selectedERA.suggestedMatches.length}</strong> possible matches for this remittance.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedERA.suggestedMatches.map((match) => (
                                            <div key={match.patientId} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-border hover:border-primary/30 transition-all group">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                            {match.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-foreground">{match.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-medium">DOB: {match.dob}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{Math.round(match.score * 100)}% Match</p>
                                                    </div>
                                                </div>
                                                <button className="w-full py-2 bg-white dark:bg-slate-800 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center gap-2">
                                                    <LinkIcon className="h-3 w-3" />
                                                    Link Payment
                                                </button>
                                            </div>
                                        ))}

                                        <div className="pt-4 border-t border-border mt-4">
                                            <button className="w-full py-3 bg-muted/30 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                                                <UserPlus className="h-3.5 w-3.5" />
                                                Search All Patients
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                                        <div className="flex gap-3">
                                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Manual Override</p>
                                                <p className="text-[10px] text-amber-600/80 font-medium leading-relaxed mt-1">
                                                    If the patient is not in the system, you may need to register them or mark this check as "Payer Adjustment".
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-20 text-center space-y-4">
                                    <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                                        <FileCheck className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select an ERA</p>
                                        <p className="text-[10px] text-slate-500 font-medium mt-1">Review unmatched transactions on the left.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
