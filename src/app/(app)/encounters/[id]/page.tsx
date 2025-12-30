"use client";

import { Header } from "@/components/layout";
import {
    Calendar,
    User,
    Clock,
    MapPin,
    Stethoscope,
    Activity,
    Thermometer,
    Heart,
    ArrowLeft,
    Edit3,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function EncounterDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const mockEncounter = {
        id: id,
        patientName: "Michael Chen",
        date: "2024-01-15",
        type: "Follow-up",
        provider: "Dr. Smith",
        chiefComplaint: "Follow-up on anxiety management strategies and medication effectiveness",
        vitals: {
            bp: "120/80",
            hr: "72",
            temp: "98.6"
        },
        assessment: "Patient showing improvement in anxiety symptoms. Reports fewer panic attacks. Sleep quality has improved. Medication well-tolerated.",
        plan: "Continue current medication (Sertraline 50mg daily). Practice breathing exercises. Schedule follow-up in 4 weeks. Monitor for any side effects.",
        status: "in-progress"
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title={`Encounter: ${mockEncounter.type}`}
                description={`Clinical session for ${mockEncounter.patientName}`}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Encounters", href: "/encounters" },
                    { label: `Encounter Details` },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Actions Toolbar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/encounters"
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Encounters
                    </Link>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm">
                            <Edit3 className="h-4 w-4" />
                            Edit
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <CheckCircle2 className="h-4 w-4" />
                            Complete Encounter
                        </button>
                    </div>
                </div>

                {/* Patient / Encounter Info Card */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <User className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Patient</p>
                                <p className="text-base font-bold text-foreground">{mockEncounter.patientName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</p>
                                <p className="text-base font-bold text-foreground">{mockEncounter.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Stethoscope className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Provider</p>
                                <p className="text-base font-bold text-foreground">{mockEncounter.provider}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Location</p>
                                <p className="text-base font-bold text-foreground">Main Clinic</p>
                            </div>
                        </div>
                    </div>
                    {/* Status Badge */}
                    <div className="absolute top-0 right-0">
                        <span className="px-4 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border-l border-b border-amber-500/20 rounded-bl-xl">
                            {mockEncounter.status.replace('-', ' ')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Contents */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Chief Complaint */}
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Chief Complaint</h3>
                            <p className="text-lg font-medium text-foreground leading-relaxed">
                                "{mockEncounter.chiefComplaint}"
                            </p>
                        </div>

                        {/* Assessment */}
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Clinical Assessment</h3>
                            <p className="text-foreground leading-relaxed">
                                {mockEncounter.assessment}
                            </p>
                        </div>

                        {/* Treatment Plan */}
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 text-primary">Treatment Plan</h3>
                            <div className="prose prose-sm dark:prose-invert">
                                <p className="text-foreground leading-relaxed">
                                    {mockEncounter.plan}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vitals Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <Activity className="h-5 w-5 text-primary" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Vitals</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                            <Heart className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">Blood Pressure</span>
                                    </div>
                                    <span className="text-base font-bold text-foreground">{mockEncounter.vitals.bp}</span>
                                </div>

                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">Heart Rate</span>
                                    </div>
                                    <span className="text-base font-bold text-foreground">{mockEncounter.vitals.hr} bpm</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                                            <Thermometer className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">Temperature</span>
                                    </div>
                                    <span className="text-base font-bold text-foreground">{mockEncounter.vitals.temp} °F</span>
                                </div>
                            </div>
                        </div>

                        {/* Follow up reminder */}
                        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6">
                            <div className="flex items-center gap-2 text-primary mb-2">
                                <Clock className="h-4 w-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Next Action</span>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                Schedule follow-up appointment in 4 weeks.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
