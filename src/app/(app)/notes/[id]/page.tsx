"use client";

import { Header } from "@/components/layout";
import {
    Calendar,
    User,
    FileText,
    Edit3,
    Trash2,
    ArrowLeft,
    CheckCircle2,
    Clock
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function NotePage() {
    const params = useParams();
    const id = params.id as string;

    // Helper to determine mock note based on ID
    const getMockNote = (noteId: string) => {
        if (noteId === "5") {
            return {
                id: noteId,
                patientName: "David Miller",
                date: "2024-01-12",
                type: "Bio-Psychosocial Assessment",
                format: "paragraph" as const,
                content: "Patient is a 55-year-old male presenting for an initial assessment. He reports a history of chronic lower back pain following a work-related injury 10 years ago. He describes his current mood as 'stable but frustrated' due to limited mobility.\n\nClinically, the patient is cooperative and articulate. He has maintained consistent employment in a modified capacity and has strong family support. He denies acute suicidal ideation but expresses concern about long-term physical health trends.\n\nThe primary goals for treatment are pain management, improved sleep hygiene, and cognitive restructuring regarding physical limitations. Referral to physical therapy and a vocational counselor is recommended.",
                status: "completed"
            };
        }

        if (noteId === "3") {
            return {
                id: noteId,
                patientName: "Arthur Smith",
                date: "2024-01-14",
                type: "Discharge Summary",
                format: "paragraph" as const,
                content: "Patient has successfully completed the 12-week intensive outpatient program for T2DM management. He has demonstrated significant improvement in blood glucose monitoring and dietary adherence.\n\nFinal A1c at discharge is 6.8%, down from 8.2% at admission. Patient has been provided with a long-term maintenance plan and primary care follow-up is scheduled for next month.\n\nDischarge Status: Stable, improved. All goals met.",
                status: "completed"
            };
        }

        // Default to Progress Note (SOAP)
        return {
            id: noteId,
            patientName: "Sarah Johnson",
            date: "2024-01-15",
            type: "Progress Note",
            format: "soap" as const,
            content: {
                subjective: "Patient reports improved mood over the past week. Still experiencing some anxiety in social situations.",
                objective: "Patient appears well-groomed and engaged. Eye contact appropriate. No psychomotor agitation noted.",
                assessment: "Improving depression symptoms. Anxiety still present but manageable. Patient responding well to current treatment plan.",
                plan: "Continue current medication regimen. Schedule follow-up in 2 weeks. Encourage continued therapy attendance."
            },
            status: "completed"
        };
    };

    const mockNote = getMockNote(id);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title={`Note: ${mockNote.type}`}
                description={`Viewing record for ${mockNote.patientName}`}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Notes", href: "/notes" },
                    { label: `View Note` },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Actions Toolbar */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/notes"
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Notes
                    </Link>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                            Delete
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <Edit3 className="h-4 w-4" />
                            Edit Note
                        </button>
                    </div>
                </div>

                {/* Note Meta Card */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Patient</p>
                            <p className="text-base font-bold text-foreground">{mockNote.patientName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date</p>
                            <p className="text-base font-bold text-foreground">{mockNote.date}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Status</p>
                            <p className="text-base font-bold text-foreground capitalize">{mockNote.status}</p>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {mockNote.format === "soap" ? (
                        <div className="grid grid-cols-1 gap-6">
                            {/* Subjective */}
                            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                    <span className="h-6 w-6 rounded bg-primary text-white flex items-center justify-center text-xs font-black">S</span>
                                    <h3 className="font-bold uppercase tracking-widest text-xs">Subjective</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-foreground leading-relaxed italic text-sm">
                                        "{(mockNote.content as any).subjective}"
                                    </p>
                                </div>
                            </div>

                            {/* Objective */}
                            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                    <span className="h-6 w-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-black">O</span>
                                    <h3 className="font-bold uppercase tracking-widest text-xs">Objective</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-foreground leading-relaxed text-sm">
                                        {(mockNote.content as any).objective}
                                    </p>
                                </div>
                            </div>

                            {/* Assessment */}
                            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                    <span className="h-6 w-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-black">A</span>
                                    <h3 className="font-bold uppercase tracking-widest text-xs">Assessment</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-foreground leading-relaxed text-sm">
                                        {(mockNote.content as any).assessment}
                                    </p>
                                </div>
                            </div>

                            {/* Plan */}
                            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                    <span className="h-6 w-6 rounded bg-emerald-500 text-white flex items-center justify-center text-xs font-black">P</span>
                                    <h3 className="font-bold uppercase tracking-widest text-xs">Plan</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-foreground leading-relaxed text-sm">
                                        {(mockNote.content as any).plan}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Paragraph Format */
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <h3 className="font-bold uppercase tracking-widest text-xs">Narrative Summary</h3>
                            </div>
                            <div className="p-8">
                                <p className="text-foreground leading-[1.8] text-base whitespace-pre-line">
                                    {mockNote.content as string}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2 p-4 bg-muted/20 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last edited by Dr. Sarah K. on {mockNote.date}
                </div>
            </div>
        </div>
    );
}
