"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import {
    Pill,
    Send,
    Clock,
    CheckCircle,
    AlertCircle,
    Search,
    Plus,
    Clipboard,
    ArrowRight,
    ShieldCheck,
    FlaskConical,
    SearchCode
} from "lucide-react";

const recentPrescriptions = [
    {
        id: 1,
        medication: "Sertraline 50mg",
        patient: "Sarah Johnson",
        dosage: "50mg",
        frequency: "Once daily",
        duration: "30 days",
        date: "Jan 10, 2024",
        status: "sent",
        pharmacy: "CVS Pharmacy"
    },
    {
        id: 2,
        medication: "Alprazolam 0.5mg",
        patient: "Michael Chen",
        dosage: "0.5mg",
        frequency: "As needed",
        duration: "14 days",
        date: "Jan 8, 2024",
        status: "filled",
        pharmacy: "Walgreens"
    },
    {
        id: 3,
        medication: "Bupropion XL 150mg",
        patient: "Emily Rodriguez",
        dosage: "150mg",
        frequency: "Once daily",
        duration: "90 days",
        date: "Jan 5, 2024",
        status: "sent",
        pharmacy: "CVS Pharmacy"
    },
    {
        id: 4,
        medication: "Zolpidem 10mg",
        patient: "James Wilson",
        dosage: "10mg",
        frequency: "At bedtime",
        duration: "14 days",
        date: "Jan 3, 2024",
        status: "filled",
        pharmacy: "Walmart Pharmacy"
    }
];

export default function EPrescribePage() {
    const [selectedPatient, setSelectedPatient] = useState("");
    const [medication, setMedication] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Prescription sent successfully! Transmission complete via Surescripts network.");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="E-Prescribing Hub"
                description="Secure medication orders and seamless pharmacy coordination."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "E-Prescribe" },
                ]}
            />

            <div className="flex-1 overflow-y-auto p-6 lg:px-10 lg:py-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Pill className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">MTD Orders</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">127</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Clock className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">In Transit</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">8</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Fulfilled</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">112</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                            <AlertCircle className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Alerts</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">3</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* New Prescription Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Plus className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">New Digital Prescription</h2>
                                </div>
                            </div>
                            <form className="p-8 space-y-6" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Patient Search</label>
                                        <select
                                            value={selectedPatient}
                                            onChange={(e) => setSelectedPatient(e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                        >
                                            <option value="">Select Target Patient</option>
                                            <option value="1">Sarah Johnson (DOB: 05/12/1988)</option>
                                            <option value="2">Michael Chen (DOB: 11/24/1992)</option>
                                            <option value="3">Emily Rodriguez (DOB: 03/15/1975)</option>
                                            <option value="4">James Wilson (DOB: 09/02/1960)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Medication / Formula</label>
                                        <div className="relative">
                                            <SearchCode className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search Drug Database..."
                                                value={medication}
                                                onChange={(e) => setMedication(e.target.value)}
                                                className="w-full pl-11 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dosage</label>
                                        <input placeholder="e.g. 50mg" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Frequency</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none">
                                            <option value="qd">Once daily (QD)</option>
                                            <option value="bid">Twice daily (BID)</option>
                                            <option value="tid">Three times daily (TID)</option>
                                            <option value="prn">As needed (PRN)</option>
                                            <option value="hs">At bedtime (HS)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Duration</label>
                                        <input placeholder="30 days" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sig / Instructions for Pharmacist</label>
                                    <textarea
                                        placeholder="Instructions for pharmacy and patient... (e.g. take with food)"
                                        rows={3}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Pharmacy</label>
                                    <select className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none">
                                        <option value="cvs">CVS Pharmacy - Main Street (Hub)</option>
                                        <option value="walgreens">Walgreens - Oak Avenue</option>
                                        <option value="walmart">Walmart Health & Pharmacy</option>
                                    </select>
                                </div>

                                <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl flex items-start gap-4">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest mb-1">Prescriber Governance</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">By sending this prescription, you confirm clinical necessity and compliance with DEA Title 21 regulations for electronic transmission.</p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-5 bg-primary text-white hover:bg-primary/90 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 transform hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Send className="h-5 w-5" />
                                    Transmit Prescription
                                </button>
                            </form>
                        </div>

                        {/* Intelligence Block */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FlaskConical className="h-24 w-24" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-6 flex items-center gap-3 tracking-tight">
                                    <ShieldCheck className="h-7 w-7 text-primary" />
                                    Clinical Decision Support
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Drug-Drug interactions</p>
                                        <p className="text-sm text-white/70 font-medium leading-relaxed italic">"No severe contradictions detected for patient Sarah Johnson's known allergy profile."</p>
                                    </div>
                                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Formulary Status</p>
                                        <p className="text-sm text-white/70 font-medium leading-relaxed italic">"Tier 1 coverage confirmed via BlueCross Gold HMO. No prior-auth required."</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prescription History Sidebar */}
                    <div className="space-y-8 flex flex-col h-full">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-3">
                                    <Clipboard className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Orders</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto">
                                {recentPrescriptions.map(rx => (
                                    <div key={rx.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-primary transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                <Pill className="h-5 w-5" />
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${rx.status === "filled"
                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                }`}>
                                                {rx.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight">{rx.medication}</h4>
                                            <p className="text-xs font-bold text-slate-500 tracking-tight uppercase">{rx.patient}</p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                                            <div className="text-[10px] font-bold text-slate-400">
                                                {rx.date}
                                            </div>
                                            <button className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                                Full Details
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all border-t border-slate-200 dark:border-slate-800">
                                Archive Ledger
                            </button>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="h-6 w-6 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Surescripts Certified</span>
                            </div>
                            <p className="text-xs text-emerald-700/80 font-medium leading-relaxed">
                                Authorized prescriber credentials active. 2FA required for scheduled narcotics.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
