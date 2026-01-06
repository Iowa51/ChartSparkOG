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
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    TrendingDown,
    TrendingUp,
    Shield,
    CheckCircle2
} from "lucide-react";

// Local Component Definitions for Consistency
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-xs text-muted-foreground mt-1 ${className}`}>{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-6 pb-6 ${className}`}>{children}</div>
);
const Badge = ({ children, variant = "outline", className = "" }: { children: React.ReactNode; variant?: "outline"; className?: string }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${className}`}>
        {children}
    </span>
);

const progressData = [
    { date: '2023-08-01', phq9: 22, gad7: 18, month: 'Aug' },
    { date: '2023-09-01', phq9: 20, gad7: 16, month: 'Sep' },
    { date: '2023-10-01', phq9: 17, gad7: 14, month: 'Oct' },
    { date: '2023-11-01', phq9: 15, gad7: 12, month: 'Nov' },
    { date: '2023-12-01', phq9: 12, gad7: 10, month: 'Dec' },
    { date: '2024-01-01', phq9: 9, gad7: 8, month: 'Jan' },
];

const baselineScores = { phq9: 22, gad7: 18 };
const currentScores = { phq9: 9, gad7: 8 };

const phq9Improvement = {
    change: baselineScores.phq9 - currentScores.phq9,
    percentage: (((baselineScores.phq9 - currentScores.phq9) / baselineScores.phq9) * 100).toFixed(0)
};

const gad7Improvement = {
    change: baselineScores.gad7 - currentScores.gad7,
    percentage: (((baselineScores.gad7 - currentScores.gad7) / baselineScores.gad7) * 100).toFixed(0)
};

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
        { id: "risk", label: "Risk Assessment", icon: Shield },
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
                                {/* Treatment Progress & Outcomes Chart */}
                                <Card className="mb-6">
                                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>
                                                <TrendingDown className="h-4 w-4 text-emerald-500" />
                                                Treatment Progress & Outcomes
                                            </CardTitle>
                                            <CardDescription>
                                                Symptom severity trends over 6 months - Demonstrating treatment efficacy
                                            </CardDescription>
                                        </div>
                                        <Badge className="text-emerald-600 border-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                                            <TrendingDown className="mr-2 h-3 w-3" />
                                            Improving
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-8">
                                        {/* Line Chart */}
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={progressData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                    <XAxis
                                                        dataKey="month"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                                    />
                                                    <YAxis
                                                        domain={[0, 27]}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                                    />
                                                    <RechartsTooltip
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl animation-in fade-in zoom-in duration-200">
                                                                        <p className="font-bold text-xs mb-2 text-slate-500">{payload[0].payload.month} 2023</p>
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                                                                <p className="text-xs font-bold">PHQ-9: <span className="text-red-500">{payload[0].value}</span></p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="h-2 w-2 rounded-full bg-orange-500" />
                                                                                <p className="text-xs font-bold">GAD-7: <span className="text-orange-500">{payload[1].value}</span></p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Legend
                                                        verticalAlign="top"
                                                        align="right"
                                                        iconType="circle"
                                                        wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="phq9"
                                                        stroke="#ef4444"
                                                        strokeWidth={3}
                                                        name="PHQ-9 (Depression)"
                                                        dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="gad7"
                                                        stroke="#f59e0b"
                                                        strokeWidth={3}
                                                        name="GAD-7 (Anxiety)"
                                                        dot={{ fill: '#f59e0b', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Improvement Metrics Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2 text-emerald-600">
                                                    <TrendingDown className="h-4 w-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">PHQ-9 Improvement</span>
                                                </div>
                                                <div className="text-2xl font-black text-emerald-600">-{phq9Improvement.change} <span className="text-xs font-bold opacity-60">pts</span></div>
                                                <p className="text-[10px] font-bold text-emerald-700/70 mt-1">{phq9Improvement.percentage}% reduction from baseline</p>
                                            </div>

                                            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2 text-emerald-600">
                                                    <TrendingDown className="h-4 w-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">GAD-7 Improvement</span>
                                                </div>
                                                <div className="text-2xl font-black text-emerald-600">-{gad7Improvement.change} <span className="text-xs font-bold opacity-60">pts</span></div>
                                                <p className="text-[10px] font-bold text-emerald-700/70 mt-1">{gad7Improvement.percentage}% reduction from baseline</p>
                                            </div>

                                            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2 text-blue-600">
                                                    <Calendar className="h-4 w-4" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Treatment Tenure</span>
                                                </div>
                                                <div className="text-2xl font-black text-blue-600">6 <span className="text-xs font-bold opacity-60">months</span></div>
                                                <p className="text-[10px] font-bold text-blue-700/70 mt-1">24 completed sessions</p>
                                            </div>
                                        </div>

                                        {/* Clinical Insights */}
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                                Clinical Interpretation
                                            </h4>
                                            <div className="space-y-3">
                                                <p className="text-xs text-foreground/80 leading-relaxed">
                                                    <strong>Positive Response:</strong> Patient demonstrated a <span className="text-emerald-600 font-bold">{phq9Improvement.percentage}% reduction</span> in depressive symptoms and <span className="text-emerald-600 font-bold">{gad7Improvement.percentage}% reduction</span> in anxiety. PHQ-9 score transition from 22 (Severe) to 9 (Mild) indicates significant clinical response.
                                                </p>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                    <Shield className="h-3 w-3 text-purple-500" />
                                                    <strong>Value-Based Care:</strong> Data supports treatment efficacy for HEDIS/Quality reporting.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

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
                        {activeTab === "risk" && (
                            <div className="space-y-6">
                                <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Risk Assessments</h3>
                                        <Link
                                            href={`/patients/${patient.id}/risk/new`}
                                            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            New Assessment
                                        </Link>
                                    </div>
                                    <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
                                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                        <p className="text-sm text-muted-foreground">No formal risk assessments on file for this period.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Complete a Fall Risk, MMSE, or GDS-15 assessment to see trends.</p>
                                    </div>
                                </section>
                            </div>
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
