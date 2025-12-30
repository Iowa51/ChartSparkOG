"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import {
    FileText,
    Calendar,
    User,
    CheckCircle,
    Clock,
    Copy,
    Download,
    ArrowLeft,
    Edit3
} from "lucide-react";
import Link from "next/link";
import { systemTemplates } from "@/lib/demo-data/templates";

// Mock data fetcher
const getNoteById = (id: string) => {
    // In a real app, this would fetch from an API
    return {
        id,
        patientName: "John Doe",
        patientInitials: "JD",
        date: "Oct 24, 2023",
        time: "10:30 AM",
        templateName: "Progress Note (PRIMARY)",
        status: "Signed",
        content: {
            subjective: "Patient reports significant improvement in mood and energy levels. Sleeps 7-8 hours per night. Appetite is normal.",
            objective: "Patient is alert and oriented x3. Mood is euthymic. Affect is full range. Thought process is linear.",
            assessment: "Major Depressive Disorder, single episode, in partial remission.",
            plan: "Continue Sertraline 50mg daily. Follow up in 4 weeks."
        }
    };
};

export default function NoteViewPage() {
    const params = useParams();
    const router = useRouter();
    const noteId = params.id as string;
    const note = getNoteById(noteId);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header
                title="View Note"
                description={`${note.patientName} • ${note.date}`}
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Notes", href: "/notes" },
                    { label: "View Note" },
                ]}
                actions={
                    <Link
                        href={`/notes/new?id=${noteId}&template=tpl-progress-note`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg"
                    >
                        <Edit3 className="h-4 w-4" />
                        <span>Edit Note</span>
                    </Link>
                }
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {/* Note Meta Header */}
                    <div className="px-8 py-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {note.patientInitials}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{note.patientName}</h2>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {note.date} at {note.time}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle className="h-3.5 w-3.5" />
                                {note.status}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-full">
                                {note.templateName}
                            </span>
                        </div>
                    </div>

                    {/* Note Content */}
                    <div className="p-8 space-y-10">
                        {Object.entries(note.content).map(([section, text]) => (
                            <div key={section} className="space-y-3">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    {section}
                                </h3>
                                <div className="pl-3.5 border-l-2 border-border/50">
                                    <p className="text-base text-foreground/90 leading-relaxed font-medium">
                                        {text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Note Footer / Sign-off */}
                    <div className="px-8 py-6 bg-muted/10 border-t border-border mt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Electronically signed by:</p>
                                <p className="text-sm font-bold text-foreground">Dr. Sarah K., NP</p>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">ID: e5a2b8c9d0f1g2h3</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-card rounded-lg border border-transparent hover:border-border transition-all">
                                    <Copy className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-card rounded-lg border border-transparent hover:border-border transition-all">
                                    <Download className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
