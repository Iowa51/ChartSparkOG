"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    CheckCircle,
    RefreshCw,
    Copy,
    Download,
    Mic,
    MicOff,
    FileText,
    Clock,
    Calendar,
    User,
    Sparkles,
    Plus,
    AlertCircle,
} from "lucide-react";
import { getTemplateById, getDefaultTemplate } from "@/lib/demo-data/templates";
import { generateDemoNote, demoTranscript } from "@/lib/demo-data/notes";

export default function NewNotePage() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get("template") || "tpl-progress-note";
    const template = getTemplateById(templateId) || getDefaultTemplate();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showTranscript, setShowTranscript] = useState(true);
    const [autoSaved, setAutoSaved] = useState<string | null>(null);

    // SOAP note state
    const [soapNote, setSoapNote] = useState({
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
    });

    const [suggestedCodes, setSuggestedCodes] = useState<{
        cpt: string[];
        icd10: string[];
    }>({ cpt: [], icd10: [] });

    // Simulate AI generation
    const handleGenerateNote = async () => {
        setIsGenerating(true);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const demoNote = generateDemoNote(templateId);
        setSoapNote({
            subjective: demoNote.subjective,
            objective: demoNote.objective,
            assessment: demoNote.assessment,
            plan: demoNote.plan,
        });
        setSuggestedCodes(demoNote.suggestedCodes);

        setIsGenerating(false);
        setAutoSaved(new Date().toLocaleTimeString());
    };

    // Auto-save simulation
    useEffect(() => {
        const hasContent = Object.values(soapNote).some((v) => v.length > 0);
        if (hasContent) {
            const timer = setTimeout(() => {
                setAutoSaved(new Date().toLocaleTimeString());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [soapNote]);

    const handleSectionChange = (section: keyof typeof soapNote, value: string) => {
        setSoapNote((prev) => ({ ...prev, [section]: value }));
    };

    const handleRegenerateSection = async (section: keyof typeof soapNote) => {
        const demoNote = generateDemoNote(templateId);
        setSoapNote((prev) => ({ ...prev, [section]: demoNote[section] }));
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Top Navigation */}
            <header className="flex-none flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-sm z-20">
                <div className="flex items-center gap-4">
                    <Link
                        href="/templates"
                        className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex items-center gap-2 text-foreground">
                        <div className="h-6 w-6 text-primary">
                            <FileText className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold leading-tight tracking-tight">ChartSpark</h2>
                    </div>
                    <span className="text-border">/</span>
                    <span className="text-sm font-medium text-muted-foreground">Note Editor</span>
                </div>

                <div className="flex items-center gap-3">
                    {autoSaved && (
                        <span className="text-xs text-muted-foreground">
                            Auto-saved {autoSaved}
                        </span>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                        <Save className="h-4 w-4" />
                        Save Draft
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold transition-colors">
                        <CheckCircle className="h-4 w-4" />
                        Mark Complete
                    </button>
                </div>
            </header>

            {/* Sub-header / Patient Info */}
            <div className="flex-none bg-card border-b border-border px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex flex-wrap justify-between items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                John Doe - Follow Up
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Est. Patient
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {template.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date().toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                14m 30s
                            </span>
                            <span className="flex items-center gap-1">
                                <Mic className="h-4 w-4" />
                                Demo Recording
                            </span>
                        </div>
                    </div>

                    {/* AI Generate Button */}
                    <button
                        onClick={handleGenerateNote}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="h-5 w-5 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-5 w-5" />
                                Generate Note with AI
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Demo Mode Banner */}
            <div className="flex-none bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
                <div className="max-w-[1600px] mx-auto flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-800 dark:text-amber-300 font-medium">Demo Mode:</span>
                    <span className="text-amber-600 dark:text-amber-400">
                        AI generation is simulated with realistic sample responses
                    </span>
                </div>
            </div>

            {/* Main Workspace */}
            <main className="flex-1 overflow-hidden flex">
                <div className="w-full max-w-[1600px] mx-auto h-full flex flex-col md:flex-row gap-6 p-4 md:p-6 overflow-hidden">
                    {/* Left Pane: Transcript */}
                    {showTranscript && (
                        <aside className="flex flex-col w-full md:w-[380px] lg:w-[420px] bg-card rounded-xl border border-border shadow-sm overflow-hidden shrink-0 flex-none h-full">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
                                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Transcript
                                </h3>
                                <div className="flex gap-2">
                                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Download">
                                        <Download className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowTranscript(false)}
                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                        title="Collapse"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Recording Controls */}
                            <div className="px-4 py-3 border-b border-border bg-muted/30">
                                <button
                                    onClick={() => setIsRecording(!isRecording)}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${isRecording
                                            ? "bg-red-500 text-white animate-pulse"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        }`}
                                >
                                    {isRecording ? (
                                        <>
                                            <MicOff className="h-5 w-5" />
                                            Stop Recording
                                        </>
                                    ) : (
                                        <>
                                            <Mic className="h-5 w-5" />
                                            Start Recording
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Transcript Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {demoTranscript.map((entry, index) => (
                                    <div
                                        key={index}
                                        className="group relative pl-4 border-l-2 border-transparent hover:border-primary transition-colors"
                                    >
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span
                                                className={`text-xs font-bold px-2 py-0.5 rounded ${entry.speaker === "NP"
                                                        ? "text-primary bg-primary/10"
                                                        : "text-muted-foreground bg-muted"
                                                    }`}
                                            >
                                                {entry.speaker === "NP" ? "NP (You)" : "John Doe"}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {entry.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {entry.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </aside>
                    )}

                    {/* Right Pane: Note Editor */}
                    <section className="flex flex-col flex-1 h-full overflow-hidden min-w-0">
                        <div className="flex-1 overflow-y-auto pr-1 pb-20 space-y-6">
                            {/* SOAP Note Container */}
                            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gradient-to-r from-card to-muted/30">
                                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        Clinical Note (SOAP)
                                    </h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGenerateNote}
                                            disabled={isGenerating}
                                            className="flex items-center gap-1 text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                                            Regenerate All
                                        </button>
                                        <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground px-3 py-1.5 hover:bg-muted rounded-lg transition-colors">
                                            <Copy className="h-4 w-4" />
                                            Copy Full Note
                                        </button>
                                    </div>
                                </div>

                                {/* Editor Sections */}
                                <div className="divide-y divide-border">
                                    {(["subjective", "objective", "assessment", "plan"] as const).map(
                                        (section) => (
                                            <div
                                                key={section}
                                                className="p-6 hover:bg-muted/30 transition-colors group"
                                            >
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                                        <div className="w-1 h-4 bg-primary rounded-full" />
                                                        {section.charAt(0).toUpperCase() + section.slice(1)}
                                                    </label>
                                                    <button
                                                        onClick={() => handleRegenerateSection(section)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-card shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Regenerate Section"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={soapNote[section]}
                                                    onChange={(e) => handleSectionChange(section, e.target.value)}
                                                    placeholder={template.structure[section].placeholder}
                                                    className="w-full min-h-[120px] text-base text-foreground bg-transparent leading-relaxed outline-none resize-none placeholder:text-muted-foreground/50"
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Billing Card */}
                            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                        Suggested Coding
                                    </h3>
                                    <button className="text-xs font-bold text-primary hover:underline">
                                        Edit Codes
                                    </button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {/* CPT Codes */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase w-16">
                                            CPT
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestedCodes.cpt.length > 0 ? (
                                                suggestedCodes.cpt.map((code) => (
                                                    <div
                                                        key={code}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border"
                                                    >
                                                        <span className="text-sm font-bold text-foreground">{code}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {code === "99214" && "Level 4 Est. Patient"}
                                                            {code === "99213" && "Level 3 Est. Patient"}
                                                            {code === "90833" && "Psychotherapy Add-on"}
                                                        </span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" title="High Confidence" />
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">
                                                    Generate note to see suggestions
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ICD-10 Codes */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase w-16">
                                            ICD-10
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestedCodes.icd10.length > 0 ? (
                                                suggestedCodes.icd10.map((code) => (
                                                    <div
                                                        key={code}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border"
                                                    >
                                                        <span className="text-sm font-bold text-foreground">{code}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {code === "G44.209" && "Tension headache"}
                                                            {code === "I10" && "Hypertension"}
                                                            {code === "E11.9" && "Type 2 DM"}
                                                            {code === "F32.1" && "MDD, moderate"}
                                                            {code === "F41.1" && "GAD"}
                                                        </span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" title="High Confidence" />
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">
                                                    Generate note to see suggestions
                                                </span>
                                            )}
                                            <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors">
                                                <Plus className="h-4 w-4" />
                                                <span className="text-xs font-bold">Add Code</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
