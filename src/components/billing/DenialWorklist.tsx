"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, XCircle, Search, Filter, Hammer, FileEdit } from "lucide-react";

export interface DenialItem {
    id: string;
    claimId: string;
    patientName: string;
    payer: string;
    errorCode: string;
    errorMessage: string;
    category: 'Coding' | 'Eligibility' | 'Documentation' | 'Technical';
    priority: 'High' | 'Medium' | 'Low';
}

const mockDenials: DenialItem[] = [
    { id: "DN-1", claimId: "CLM-00126", patientName: "John Smith", payer: "Cigna", errorCode: "M76", errorMessage: "Missing/incomplete/invalid diagnosis code.", category: "Coding", priority: "High" },
    { id: "DN-2", claimId: "CLM-00128", patientName: "James Cameron", payer: "United", errorCode: "197", errorMessage: "Precertification/authorization/notification absent.", category: "Eligibility", priority: "Medium" },
    { id: "DN-3", claimId: "CLM-00130", patientName: "Demo Patient C", payer: "Aetna", errorCode: "N1", errorMessage: "Missing/incomplete/invalid service location NPI.", category: "Technical", priority: "High" },
];

export function DenialWorklist() {
    const [items, setItems] = useState<DenialItem[]>(mockDenials);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Denial Summary Cards */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Active Denials</span>
                        </div>
                        <p className="text-3xl font-black text-red-700">18</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Appeals</span>
                        </div>
                        <p className="text-3xl font-black text-amber-700">7</p>
                    </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 flex flex-col justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Recovery Rate</p>
                    <p className="text-4xl font-black text-emerald-700">92%</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Hammer className="h-4 w-4 text-primary" /> Triage Queue
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input type="text" placeholder="Filter denials..." className="pl-8 pr-3 py-1.5 text-[10px] bg-white border border-border rounded-lg outline-none w-40" />
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {items.map((denial) => (
                        <div key={denial.id} className="p-6 hover:bg-muted/10 transition-colors flex items-center justify-between group">
                            <div className="flex gap-4">
                                <div className={`mt-1 p-2 rounded-xl border ${denial.priority === 'High' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-amber-50 border-amber-100 text-amber-500'
                                    }`}>
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-foreground">{denial.patientName}</span>
                                        <span className="text-[10px] font-mono font-black text-muted-foreground opacity-50">{denial.claimId}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${denial.category === 'Coding' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {denial.category}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="text-red-500">{denial.errorCode}:</span>
                                        {denial.errorMessage}
                                    </p>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">{denial.payer}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all opacity-0 group-hover:opacity-100">
                                    <FileEdit className="h-3.5 w-3.5" />
                                    Correct Claim
                                </button>
                                <div className="p-2 text-muted-foreground group-hover:text-primary transition-colors">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-center">
                    <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View All 18 Denials</button>
                </div>
            </div>
        </div>
    );
}
