"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import {
    Search,
    User,
    ChevronRight,
    FileText,
    ArrowRight,
    Sparkles,
    Check,
    Loader2,
} from "lucide-react";

const visitTypes = [
    { id: "eval", name: "Initial Evaluation", duration: "60 min", template: "tpl-progress-note" },
    { id: "follow", name: "Follow-up Visit", duration: "30 min", template: "tpl-progress-note" },
    { id: "med", name: "Medication Management", duration: "15 min", template: "tpl-progress-note" },
    { id: "crisis", name: "Crisis Intervention", duration: "45 min", template: "tpl-progress-note" },
];

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    mrn?: string;
    date_of_birth?: string;
    avatar_color?: string;
}

export default function NewEncounterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedPatientId = searchParams.get("patientId");

    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [selectedType, setSelectedType] = useState(visitTypes[1]); // Default to follow-up
    const [searchQuery, setSearchQuery] = useState("");
    const [step, setStep] = useState(preselectedPatientId ? 2 : 1);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/patients?limit=100');
                if (response.ok) {
                    const data = await response.json();
                    setPatients(data.patients || []);

                    // If there's a preselected patient, find and set it
                    if (preselectedPatientId) {
                        const preselected = (data.patients || []).find(
                            (p: Patient) => p.id === preselectedPatientId
                        );
                        if (preselected) {
                            setSelectedPatient(preselected);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch patients:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, [preselectedPatientId]);

    const filteredPatients = patients.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.mrn && p.mrn.includes(searchQuery))
    );

    const getPatientInitials = (patient: Patient) => {
        const first = patient.first_name?.[0] || '?';
        const last = patient.last_name?.[0] || '?';
        return `${first}${last}`.toUpperCase();
    };

    const getAvatarColor = (patient: Patient) => {
        return patient.avatar_color || 'bg-primary/10 text-primary';
    };

    const handleStartEncounter = () => {
        if (selectedPatient && selectedType) {
            router.push(`/notes/new?template=${selectedType.template}&patientId=${selectedPatient.id}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="New Encounter"
                description="Start a new clinical session with a patient."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Encounters", href: "/encounters" },
                    { label: "New Encounter" },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Stepper Header */}
                <div className="flex items-center justify-between mb-12 px-6">
                    <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 1 ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
                            1
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold leading-tight">Select Patient</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Step 1</p>
                        </div>
                    </div>
                    <div className={`h-[2px] flex-1 mx-4 bg-muted overflow-hidden`}>
                        <div className={`h-full bg-primary transition-all duration-500`} style={{ width: step === 2 ? "100%" : "0%" }} />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 2 ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
                            2
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold leading-tight">Visit Details</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Step 2</p>
                        </div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or MRN..."
                                className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none text-lg transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
                            {loading ? (
                                <div className="p-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                    <p className="text-sm text-muted-foreground">Loading patients...</p>
                                </div>
                            ) : filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <button
                                        key={patient.id}
                                        onClick={() => {
                                            setSelectedPatient(patient);
                                            setStep(2);
                                        }}
                                        className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors group text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarColor(patient)}`}>
                                                {getPatientInitials(patient)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {patient.first_name} {patient.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {patient.mrn && `MRN: ${patient.mrn}`}
                                                    {patient.mrn && patient.date_of_birth && ' • '}
                                                    {patient.date_of_birth && `DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                    </button>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-sm text-muted-foreground">No patients found matching your search.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && selectedPatient && (
                    <div className="space-y-8">
                        {/* Selected Patient Mini Card */}
                        <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 flex items-center justify-between animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarColor(selectedPatient)}`}>
                                    {getPatientInitials(selectedPatient)}
                                </div>
                                <div>
                                    <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Session for:</p>
                                    <p className="text-xl font-bold text-foreground leading-none">
                                        {selectedPatient.first_name} {selectedPatient.last_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Change Patient
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visitTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type)}
                                    className={`relative p-5 rounded-2xl border text-left transition-all ${selectedType.id === type.id
                                        ? "bg-card border-primary ring-1 ring-primary shadow-md"
                                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/30"
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className={`font-bold transition-colors ${selectedType.id === type.id ? "text-primary" : "text-foreground"}`}>
                                                {type.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">{type.duration} duration</p>
                                        </div>
                                        {selectedType.id === type.id && (
                                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="h-4 w-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                        <FileText className="h-3 w-3" />
                                        Template: {type.template}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="pt-6">
                            <button
                                onClick={handleStartEncounter}
                                className="w-full flex items-center justify-center gap-3 py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] group"
                            >
                                <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                                Start Clinical Session
                                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
                                This will launch the clinical workspace and initialize the AI transcription service.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
