"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import {
    getPatientById
} from "@/lib/demo-data/patients";
import {
    getEncountersByPatientId
} from "@/lib/demo-data/encounters";
import {
    Activity,
    Calendar,
    FileText,
    Pill,
    AlertCircle,
    Phone,
    Mail,
    MapPin,
    Plus,
    History,
    ArrowLeft,
    ChevronRight,
    Clipboard,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;
    const patient = getPatientById(patientId);
    const encounters = getEncountersByPatientId(patientId);
    const [activeTab, setActiveTab] = useState("overview");

    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold">Patient Not Found</h2>
                <p className="text-muted-foreground mt-2">The patient record you are looking for does not exist.</p>
                <button
                    onClick={() => router.push("/patients")}
                    className="mt-6 px-4 py-2 bg-primary text-white rounded-xl"
                >
                    Back to Patients
                </button>
            </div>
        );
    }

    const tabs = [
        { id: "overview", label: "Overview", icon: Activity },
        { id: "encounters", label: "Encounters", icon: Calendar },
        { id: "medications", label: "Medications", icon: Pill },
        { id: "history", label: "History", icon: History },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title={patient.name}
                description={`MRN: ${patient.mrn} • DOB: ${patient.dob} • ${patient.gender}`}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Patients", href: "/patients" },
                    { label: patient.name },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Patient Banner / Vital Info */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-3 bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col md:flex-row">
                        <div className="p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border bg-gradient-to-b from-primary/5 to-transparent min-w-[200px]">
                            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-inner ${patient.avatarColor}`}>
                                {patient.initials}
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                {patient.status}
                            </span>
                        </div>
                        <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact Information</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                                        <Phone className="h-4 w-4 text-primary" />
                                        <span>{patient.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-foreground/80">
                                        <Mail className="h-4 w-4 text-primary" />
                                        <span>{patient.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-foreground/80 leading-relaxed">
                                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                                        <span>{patient.address}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Insurance Details</h3>
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                                    <p className="text-sm font-bold text-foreground mb-1">{patient.insurance.provider}</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div>
                                            <p>Policy</p>
                                            <p className="font-mono text-foreground">{patient.insurance.policyNumber}</p>
                                        </div>
                                        <div>
                                            <p>Group</p>
                                            <p className="font-mono text-foreground">{patient.insurance.groupNumber}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/95 text-primary-foreground rounded-2xl p-6 shadow-lg shadow-primary/20 flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold opacity-80 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <Link
                                    href={`/encounters/new?patientId=${patient.id}`}
                                    className="flex items-center justify-between w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors group"
                                >
                                    <span className="text-sm font-bold">New Encounter</span>
                                    <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                                </Link>
                                <button className="flex items-center justify-between w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors group text-left">
                                    <span className="text-sm font-bold">Refill Meds</span>
                                    <Pill className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </button>
                                <button className="flex items-center justify-between w-full p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors group text-left">
                                    <span className="text-sm font-bold">Print Summary</span>
                                    <Clipboard className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-[10px] opacity-60 leading-tight">Last accessed Oct 28, 2023 by Dr. Sarah K.</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 mb-6 p-1 bg-muted/50 rounded-2xl border border-border w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === "overview" && (
                            <>
                                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <AlertCircle className="h-5 w-5 text-red-500" />
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Allergies</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {patient.allergies.map((allergy) => (
                                                <span key={allergy} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-800">
                                                    {allergy}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Clipboard className="h-5 w-5 text-primary" />
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Problems</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {patient.problems.map((problem) => (
                                                <span key={problem} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800">
                                                    {problem}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent Encounters</h3>
                                        <button
                                            onClick={() => setActiveTab("encounters")}
                                            className="text-primary text-xs font-bold hover:underline"
                                        >
                                            View All
                                        </button>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {encounters.slice(0, 3).map((encounter) => (
                                            <div key={encounter.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-[10px] font-bold text-muted-foreground border border-border/50">
                                                        <span>{encounter.date.split(",")[0].split(" ")[0]}</span>
                                                        <span className="text-foreground">{encounter.date.split(",")[0].split(" ")[1]}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{encounter.type}</p>
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{encounter.chiefComplaint}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${encounter.status === "Completed"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            : "bg-blue-50 text-blue-700 border-blue-100"
                                                        }`}>
                                                        {encounter.status}
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}

                        {activeTab === "encounters" && (
                            <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/20">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">All Encounters</h3>
                                </div>
                                <div className="divide-y divide-border">
                                    {encounters.map((encounter) => (
                                        <div key={encounter.id} className="p-6 hover:bg-muted/30 transition-colors group">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center font-bold text-muted-foreground border border-border">
                                                        <span className="text-[10px] uppercase">{encounter.date.split(",")[0].split(" ")[0]}</span>
                                                        <span className="text-lg text-foreground leading-none">{encounter.date.split(",")[0].split(" ")[1]}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-foreground">{encounter.type}</h4>
                                                            <span className="text-xs text-muted-foreground">• {encounter.time}</span>
                                                        </div>
                                                        <p className="text-sm text-foreground/80 mb-2">{encounter.chiefComplaint}</p>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                                                                <FileText className="h-3 w-3" />
                                                                Provider: {encounter.provider}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 self-end md:self-center">
                                                    {encounter.noteId && (
                                                        <Link
                                                            href={`/notes/${encounter.noteId}`}
                                                            className="text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                                        >
                                                            View Note
                                                        </Link>
                                                    )}
                                                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {activeTab === "medications" && (
                            <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Current Medications</h3>
                                    <button className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                                        <Plus className="h-3 w-3" />
                                        Add Med
                                    </button>
                                </div>
                                <div className="divide-y divide-border">
                                    {patient.medications.length > 0 ? (
                                        patient.medications.map((med) => (
                                            <div key={med} className="p-6 flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                                        <Pill className="h-5 w-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">{med}</p>
                                                        <p className="text-xs text-muted-foreground">Take daily in the morning</p>
                                                    </div>
                                                </div>
                                                <button className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Discontinue
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 text-center">
                                            <p className="text-sm text-muted-foreground">No active medications recorded.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Sidebar Widget: Vital Summary */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6 flex items-center justify-between">
                                Latest Vitals
                                <span className="text-[10px] text-muted-foreground normal-case font-normal">Oct 28</span>
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                    <span className="text-xs text-muted-foreground">BP</span>
                                    <span className="text-sm font-bold text-foreground">135/85</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                    <span className="text-xs text-muted-foreground">Heart Rate</span>
                                    <span className="text-sm font-bold text-foreground">72 <span className="text-[10px] font-normal opacity-60">bpm</span></span>
                                </div>
                                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                    <span className="text-xs text-muted-foreground">SpO2</span>
                                    <span className="text-sm font-bold text-foreground">98 <span className="text-[10px] font-normal opacity-60">%</span></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Temp</span>
                                    <span className="text-sm font-bold text-foreground">98.6 <span className="text-[10px] font-normal opacity-60">°F</span></span>
                                </div>
                            </div>
                            <button className="w-full mt-6 py-2.5 bg-muted/50 hover:bg-muted text-foreground text-xs font-bold rounded-xl transition-colors border border-border">
                                Add Vitals
                            </button>
                        </div>

                        {/* Sidebar Widget: Notes Preview */}
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Patient Notes</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
                                    <p className="text-xs font-bold text-foreground mb-1">Clinical Note - Dr. Sarah K.</p>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed">"Patient reports improvement in symptoms since last medication adjustment..."</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Edit(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-pencil"
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    );
}
