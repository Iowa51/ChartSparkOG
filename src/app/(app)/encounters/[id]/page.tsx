"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import {
    Calendar,
    User,
    Clock,
    MapPin,
    Clipboard,
    FileText,
    Stethoscope,
    Activity,
    Edit3,
    Plus,
    Eye
} from "lucide-react";
import Link from "next/link";

// Mock data fetcher
const getEncounterById = (id: string) => {
    return {
        id,
        patientName: "Maria Rodriguez",
        patientInitials: "MR",
        date: "Oct 27, 2023",
        time: "2:15 PM",
        type: "Follow-up Medication Visit",
        status: "Completed",
        provider: "Dr. Sarah K.",
        location: "Virtual Visit",
        chiefComplaint: "Anxiety symptoms improving, but reporting occasional insomnia.",
        vitals: {
            bp: "128/82",
            hr: "74 bpm",
            temp: "98.4 °F",
            spo2: "99%"
        },
        diagnoses: [
            { code: "F41.1", name: "Generalized Anxiety Disorder" },
            { code: "G47.00", name: "Insomnia, unspecified" }
        ],
        noteId: "note-123"
    };
};

export default function EncounterViewPage() {
    const params = useParams();
    const encounterId = params.id as string;
    const encounter = getEncounterById(encounterId);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header
                title="Encounter Details"
                description={`${encounter.type} • ${encounter.date}`}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Encounters", href: "/encounters" },
                    { label: "View Encounter" },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/notes/new?encounterId=${encounterId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            <span>View Note</span>
                        </Link>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg">
                            <Edit3 className="h-4 w-4" />
                            <span>Edit Encounter</span>
                        </button>
                    </div>
                }
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="lg:col-span-2 space-y-8">
                    {/* Summary Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                                    {encounter.patientInitials}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">{encounter.patientName}</h2>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            {encounter.date}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4" />
                                            {encounter.time}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4" />
                                            {encounter.location}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                                {encounter.status}
                            </span>
                        </div>

                        <div className="pt-6 border-t border-border">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Chief Complaint</h3>
                            <p className="text-lg text-foreground font-medium leading-relaxed">
                                "{encounter.chiefComplaint}"
                            </p>
                        </div>
                    </div>

                    {/* Vitals & Diagnoses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Vitals
                            </h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                {Object.entries(encounter.vitals).map(([label, value]) => (
                                    <div key={label} className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
                                        <p className="text-base font-bold text-foreground">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Clipboard className="h-4 w-4 text-primary" />
                                Diagnoses
                            </h3>
                            <div className="space-y-3">
                                {encounter.diagnoses.map((diag) => (
                                    <div key={diag.code} className="flex gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                                        <div className="h-8 w-16 bg-card border border-border flex items-center justify-center rounded text-xs font-mono font-bold">
                                            {diag.code}
                                        </div>
                                        <div className="text-xs font-bold text-foreground leading-tight py-1">
                                            {diag.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Context */}
                <div className="space-y-6">
                    <div className="bg-primary shadow-xl shadow-primary/20 rounded-2xl p-6 text-primary-foreground">
                        <h4 className="font-bold text-sm mb-4">Patient EHR Context</h4>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                                <span className="text-xs font-bold">View Medication List</span>
                                <Plus className="h-4 w-4" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                                <span className="text-xs font-bold">View Allergy List</span>
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <h4 className="font-bold text-sm text-foreground mb-4">Encounter Timeline</h4>
                        <div className="relative pl-4 border-l-2 border-border space-y-6">
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">2:15 PM</p>
                                <p className="text-xs font-bold text-foreground">Encounter Started</p>
                            </div>
                            <div className="relative opacity-60">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-border border-2 border-card" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">2:22 PM</p>
                                <p className="text-xs font-bold text-foreground">AI Scribe recording began</p>
                            </div>
                            <div className="relative opacity-60">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-border border-2 border-card" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">2:45 PM</p>
                                <p className="text-xs font-bold text-foreground">Encounter Marked Complete</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
