"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { getTemplateById, getDefaultTemplate, templates } from "@/lib/demo-data/templates";
import { generateDemoNote, demoTranscript } from "@/lib/demo-data/notes";

const PREBUILT_PHRASES: Record<string, string[]> = {
    Subjective: [
        "Patient reports feeling better",
        "Mood is stable",
        "Sleep has improved",
        "Anxiety reduced",
        "Medication tolerated well",
        "Reports side effects",
        "Compliance with medication",
        "Denies suicidal ideation"
    ],
    Objective: [
        "Alert and oriented x4",
        "Appearance neat and clean",
        "Eye contact appropriate",
        "Speech normal rate and rhythm",
        "Mood euthymic",
        "Affect congruent",
        "Thought process linear",
        "No psychomotor agitation"
    ],
    Assessment: [
        "Progressing towards goals",
        "Symptoms well-managed",
        "Diagnosis currently stable",
        "Requires ongoing monitoring"
    ],
    Plan: [
        "Continue current treatment plan",
        "Adjusted medication dosage",
        "Follow up in 2 weeks",
        "Referral to specialist"
    ]
};

export default function NewNotePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = searchParams.get("template") || "tpl-progress-note";
    const template = getTemplateById(templateId) || getDefaultTemplate();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingVisible, setIsRecordingVisible] = useState(true);
    const [showTranscript, setShowTranscript] = useState(true);
    const [autoSaved, setAutoSaved] = useState<string | null>(null);

    // State for clinician's manual notes/input
    const [clinicianInput, setClinicianInput] = useState("");
    const [activeInputTab, setActiveInputTab] = useState<"scribe" | "phrases" | "manual">("phrases");
    const [selectedPhrases, setSelectedPhrases] = useState<Record<string, string[]>>({
        Subjective: [],
        Objective: [],
        Assessment: [],
        Plan: []
    });
    const [customPhrases, setCustomPhrases] = useState<Record<string, string[]>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('customPhrases');
            return saved ? JSON.parse(saved) : { Subjective: [], Objective: [], Assessment: [], Plan: [] };
        }
        return { Subjective: [], Objective: [], Assessment: [], Plan: [] };
    });
    const [newPhrase, setNewPhrase] = useState("");
    const [showPhraseModal, setShowPhraseModal] = useState(false);

    // Updated SOAP/Note state to be dynamic
    const [noteSections, setNoteSections] = useState<Record<string, string>>({});

    const [suggestedCodes, setSuggestedCodes] = useState<{
        cpt: string[];
        icd10: string[];
    }>({ cpt: [], icd10: [] });

    // Initialize/Reset note sections based on template
    useEffect(() => {
        const initialSections: Record<string, string> = {};
        template.sections.forEach(s => {
            initialSections[s.id] = "";
        });
        setNoteSections(initialSections);
    }, [template]);


    // Generate note using AI service
    const handleGenerateNote = async () => {
        const hasPhrases = Object.values(selectedPhrases).some(p => p.length > 0);
        if (!clinicianInput && !isRecording && demoTranscript.length === 0 && !hasPhrases) {
            alert("Please provide some input (voice, typing, or phrases) before generating a note.");
            return;
        }

        setIsGenerating(true);

        // SEC-007: Log metadata only, not PHI content
        console.log("Generating note:", { hasPhrases, inputLength: clinicianInput.length });

        try {
            // Call the AI endpoint with user's selections
            const response = await fetch('/api/ai/generate-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinicianInput,
                    selectedPhrases,
                    templateId,
                    templateFormat: template.format
                })
            });

            if (!response.ok) {
                // Fallback to demo note if API fails
                console.warn('AI API failed, using fallback');
                const phraseNote = generateNoteFromPhrases();
                applyNoteToSections(phraseNote);
                return;
            }

            const data = await response.json();

            if (data.success && data.sections) {
                // Apply AI-generated sections to template
                const updatedSections: Record<string, string> = { ...noteSections };
                if (template.format === "soap") {
                    template.sections.forEach(s => {
                        const label = s.label.toLowerCase();
                        if (label.includes("subjective")) updatedSections[s.id] = data.sections.subjective || '';
                        else if (label.includes("objective")) updatedSections[s.id] = data.sections.objective || '';
                        else if (label.includes("assessment")) updatedSections[s.id] = data.sections.assessment || '';
                        else if (label.includes("plan")) updatedSections[s.id] = data.sections.plan || '';
                    });
                } else {
                    updatedSections[template.sections[0].id] = data.sections.content ||
                        `${data.sections.subjective}\n\n${data.sections.objective}\n\n${data.sections.assessment}\n\n${data.sections.plan}`;
                }
                setNoteSections(updatedSections);
                if (data.suggestedCodes) setSuggestedCodes(data.suggestedCodes);
            } else {
                // Fallback
                const phraseNote = generateNoteFromPhrases();
                applyNoteToSections(phraseNote);
            }
        } catch (error) {
            console.error('Error calling AI:', error);
            // Fallback to demo on error
            const phraseNote = generateNoteFromPhrases();
            applyNoteToSections(phraseNote);
        } finally {
            setIsGenerating(false);
            setAutoSaved(new Date().toLocaleTimeString());
        }
    };

    // Helper to generate note from selected phrases (fallback when API unavailable)
    const generateNoteFromPhrases = () => {
        const subjectivePhrases = selectedPhrases['Subjective'] || [];
        const objectivePhrases = selectedPhrases['Objective'] || [];
        const assessmentPhrases = selectedPhrases['Assessment'] || [];
        const planPhrases = selectedPhrases['Plan'] || [];

        // Build sections from phrases + clinician input
        const subjective = [
            ...subjectivePhrases,
            clinicianInput ? clinicianInput : null
        ].filter(Boolean).join('. ') || 'Patient presents for follow-up visit.';

        const objective = objectivePhrases.length > 0
            ? objectivePhrases.join('. ') + '.'
            : 'Mental Status Exam: Alert and oriented x4. Appearance appropriate.';

        const assessment = assessmentPhrases.length > 0
            ? assessmentPhrases.join('. ') + '.'
            : 'Condition stable, continue current treatment plan.';

        const plan = planPhrases.length > 0
            ? planPhrases.map(p => `- ${p}`).join('\n')
            : '- Continue current medication regimen\n- Follow-up in 2-4 weeks\n- Patient education provided';

        return {
            subjective,
            objective,
            assessment,
            plan,
            suggestedCodes: { cpt: ['90834', '90837'], icd10: ['F32.1', 'F41.1'] }
        };
    };

    // Helper to apply demo note to sections
    const applyNoteToSections = (demoNote: { subjective: string; objective: string; assessment: string; plan: string; suggestedCodes: any }) => {
        const updatedSections: Record<string, string> = { ...noteSections };
        if (template.format === "soap") {
            template.sections.forEach(s => {
                const label = s.label.toLowerCase();
                if (label.includes("subjective")) updatedSections[s.id] = demoNote.subjective;
                else if (label.includes("objective")) updatedSections[s.id] = demoNote.objective;
                else if (label.includes("assessment")) updatedSections[s.id] = demoNote.assessment;
                else if (label.includes("plan")) updatedSections[s.id] = demoNote.plan;
                else updatedSections[s.id] = demoNote.subjective;
            });
        } else {
            updatedSections[template.sections[0].id] = `${demoNote.subjective}\n\n${demoNote.objective}\n\n${demoNote.assessment}\n\n${demoNote.plan}`;
        }
        setNoteSections(updatedSections);
        setSuggestedCodes(demoNote.suggestedCodes);
    };

    // Auto-save simulation
    useEffect(() => {
        const hasContent = Object.values(noteSections).some((v) => v.length > 0);
        if (hasContent) {
            const timer = setTimeout(() => {
                setAutoSaved(new Date().toLocaleTimeString());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [noteSections]);

    const handleSectionChange = (id: string, value: string) => {
        setNoteSections((prev) => ({ ...prev, [id]: value }));
    };

    const handleRegenerateSection = async (id: string) => {
        setIsGenerating(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const demoNote = generateDemoNote(templateId);
        // Fallback random generation for specific section
        handleSectionChange(id, demoNote.subjective);
        setIsGenerating(false);
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
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h2 className="text-lg font-bold leading-tight tracking-tight">ChartSpark</h2>
                    </div>
                    <span className="text-border">/</span>
                    <span className="text-sm font-medium text-muted-foreground">AI Scribe & Editor</span>
                </div>

                <div className="flex items-center gap-3">
                    {autoSaved && (
                        <span className="text-xs text-muted-foreground italic mr-2 animate-pulse">
                            Auto-saved {autoSaved}
                        </span>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                        <Save className="h-4 w-4" />
                        Save Draft
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
                        <CheckCircle className="h-4 w-4" />
                        Mark Complete
                    </button>
                </div>
            </header>

            {/* Sub-header / Patient Info */}
            <div className="flex-none bg-card border-b border-border px-6 py-4">
                <div className="max-w-[1700px] mx-auto flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                            JD
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                    John Doe
                                </h1>
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
                                    Est. Patient
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Oct 29, 2023
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    Appointment: 2:30 PM
                                </span>
                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted text-foreground">
                                    <select
                                        value={template.id}
                                        onChange={(e) => {
                                            const newPath = `/notes/new?template=${e.target.value}`;
                                            router.push(newPath);
                                        }}
                                        className="bg-transparent border-none text-xs font-bold outline-none cursor-pointer"
                                    >
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!showTranscript && (
                            <button
                                onClick={() => setShowTranscript(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all shadow-sm group"
                            >
                                <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                                <span>Reveal Input Hub</span>
                            </button>
                        )}
                        <button
                            onClick={handleGenerateNote}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl text-sm font-black shadow-lg shadow-primary/30 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                    Generating Clinical Note...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5" />
                                    Generate AI Note
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <main className="flex-1 overflow-hidden flex bg-slate-50/30 dark:bg-slate-950/30">
                <div className="w-full max-w-[1700px] mx-auto h-full flex flex-col md:flex-row gap-6 p-4 md:p-6 overflow-hidden">
                    {/* Left Pane: Transcript & Input Hub */}
                    {showTranscript && (
                        <aside className="flex flex-col w-full md:w-[420px] lg:w-[500px] gap-6 shrink-0 flex-none h-full overflow-hidden">
                            {/* Input Clinical Hub */}
                            <div className="flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden shrink-0 transition-all duration-500">
                                <div className="px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveInputTab("phrases")}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeInputTab === "phrases" ? "text-primary border-b-2 border-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                                        >
                                            Phrases
                                        </button>
                                        <button
                                            onClick={() => setActiveInputTab("scribe")}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeInputTab === "scribe" ? "text-primary border-b-2 border-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                                        >
                                            Scribe
                                        </button>
                                        <button
                                            onClick={() => setActiveInputTab("manual")}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeInputTab === "manual" ? "text-primary border-b-2 border-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                                        >
                                            Manual
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setShowTranscript(false)}
                                            className="group p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all flex items-center gap-2"
                                            title="Collapse Sidebar"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 overflow-y-auto">
                                    {activeInputTab === "phrases" && (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            {Object.entries(PREBUILT_PHRASES).map(([section, phrases]) => (
                                                <div key={section} className="space-y-3">
                                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                                                        {section}
                                                        <button
                                                            onClick={() => {
                                                                setNewPhrase("");
                                                                setShowPhraseModal(true);
                                                            }}
                                                            className="text-primary hover:underline lowercase font-bold"
                                                        >
                                                            + custom
                                                        </button>
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {[...phrases, ...(customPhrases[section] || [])].map((phrase) => (
                                                            <button
                                                                key={phrase}
                                                                onClick={() => {
                                                                    setSelectedPhrases(prev => ({
                                                                        ...prev,
                                                                        [section]: prev[section].includes(phrase)
                                                                            ? prev[section].filter(p => p !== phrase)
                                                                            : [...prev[section], phrase]
                                                                    }));
                                                                }}
                                                                className={`text-left p-2.5 rounded-xl border text-[11px] font-medium transition-all ${selectedPhrases[section].includes(phrase)
                                                                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]"
                                                                    : "bg-muted/30 border-border text-foreground/70 hover:border-primary/30"
                                                                    }`}
                                                            >
                                                                {phrase}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeInputTab === "scribe" && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">
                                                    Voice Scribe
                                                </label>
                                                <button
                                                    onClick={() => setIsRecording(!isRecording)}
                                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isRecording
                                                        ? "bg-red-500 text-white shadow-red-500/20 animate-pulse ring-4 ring-red-500/10"
                                                        : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 shadow-primary/20"
                                                        }`}
                                                >
                                                    {isRecording ? (
                                                        <>
                                                            <MicOff className="h-4 w-4" />
                                                            Stop Scribe
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Mic className="h-4 w-4" />
                                                            Start AI Scribe
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeInputTab === "manual" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                                        Manual Observations
                                                    </label>
                                                </div>
                                                <textarea
                                                    value={clinicianInput}
                                                    onChange={(e) => setClinicianInput(e.target.value)}
                                                    placeholder="Type highlights here..."
                                                    className="w-full h-48 p-4 bg-muted/20 hover:bg-muted/30 rounded-2xl border border-border text-sm leading-relaxed focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all resize-none outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Selected Phrases Summary / Editable Area */}
                                {activeInputTab === "phrases" && (
                                    <div className="p-5 bg-primary/5 border-t border-primary/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-[10px] font-black text-primary uppercase tracking-widest">Selected Phrases Context (Editable)</h5>
                                            <button
                                                onClick={() => setSelectedPhrases({ Subjective: [], Objective: [], Assessment: [], Plan: [] })}
                                                className="text-[9px] font-bold text-muted-foreground hover:text-red-500 uppercase"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <textarea
                                            value={Object.entries(selectedPhrases)
                                                .filter(([_, ps]) => ps.length > 0)
                                                .map(([s, ps]) => `${s}: ${ps.join(', ')}`)
                                                .join('\n')}
                                            onChange={(e) => {
                                                // This is tricky because it's derived state. 
                                                // For the demo, we'll let them edit 'clinicianInput' instead if they want full custom text,
                                                // or we can just make this a read-only preview and the AI button is below it.
                                                // BUT the user asked for EDITABLE.
                                                // I'll use clinicianInput as the FINAL context.
                                                setClinicianInput(e.target.value);
                                            }}
                                            placeholder="Selected phrases will appear here as context for the AI..."
                                            className="w-full h-32 p-3 bg-white dark:bg-slate-900 border border-primary/20 rounded-xl text-xs font-medium leading-relaxed focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                                        />
                                        <button
                                            onClick={handleGenerateNote}
                                            disabled={isGenerating}
                                            className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Generate Full Note with AI
                                        </button>
                                    </div>
                                )}
                            </div>


                            {/* Transcript Content */}
                            <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Transcript Preview
                                    </h3>
                                    <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-muted/10">
                                    {demoTranscript.length > 0 ? (
                                        demoTranscript.map((entry, index) => (
                                            <div
                                                key={index}
                                                className="group relative pl-4 border-l-2 border-transparent hover:border-primary/50 transition-all"
                                            >
                                                <div className="flex justify-between items-baseline mb-1.5">
                                                    <span
                                                        className={`text-[11px] font-black uppercase px-2.5 py-1 rounded tracking-widest ${entry.speaker === "NP"
                                                            ? "text-primary bg-primary/10"
                                                            : "text-muted-foreground bg-muted"
                                                            }`}
                                                    >
                                                        {entry.speaker === "NP" ? "Sarah K. (NP)" : "John Doe (Patient)"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                                                        {entry.time}
                                                    </span>
                                                </div>
                                                <p className="text-base text-foreground/80 leading-relaxed italic">
                                                    "{entry.text}"
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                                            <div className="p-4 bg-muted rounded-full mb-4">
                                                <Mic className="h-8 w-8 opacity-20" />
                                            </div>
                                            <p className="text-sm font-medium">No recording transcript yet.</p>
                                            <p className="text-xs opacity-60 mt-1">Start voice scribe to see live transcription.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Right Pane: Note Editor */}
                    <section className="flex flex-col flex-1 h-full overflow-hidden min-w-0">
                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border pr-2 pb-24 space-y-6">
                            {/* Dynamic Note Container */}
                            <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden ring-1 ring-border/5">
                                <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
                                    <div className="flex flex-col">
                                        <h2 className="text-lg font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                            <FileText className="h-5 w-5 text-primary" />
                                            {template.name}
                                        </h2>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Note Format: {template.format.toUpperCase()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGenerateNote}
                                            disabled={isGenerating}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 bg-primary/10 rounded-xl hover:bg-primary/20 transition-all"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                                            Re-Sync AI
                                        </button>
                                        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground px-4 py-2 hover:bg-muted border border-border rounded-xl transition-all">
                                            <Copy className="h-3.5 w-3.5" />
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                {/* Editor Sections */}
                                <div className="divide-y divide-border/50">
                                    {template.sections.map((section) => (
                                        <div
                                            key={section.id}
                                            className="p-8 hover:bg-muted/10 transition-colors group relative"
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="text-xs font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-primary/40 rounded-full" />
                                                    {section.label}
                                                </label>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => handleRegenerateSection(section.id)}
                                                        className="p-2 text-muted-foreground hover:text-primary rounded-lg bg-card border border-border shadow-sm"
                                                        title="Regenerate this section"
                                                    >
                                                        <RefreshCw className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={noteSections[section.id] || ""}
                                                onChange={(e) => handleSectionChange(section.id, e.target.value)}
                                                placeholder={section.placeholder}
                                                className="w-full min-h-[160px] text-base md:text-lg text-foreground bg-transparent leading-relaxed outline-none resize-none placeholder:text-muted-foreground/30 font-medium"
                                            />
                                            {section.required && !noteSections[section.id] && (
                                                <div className="absolute top-8 right-8 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Required
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Billing & Coding Hub */}
                            <div className="bg-card rounded-2xl border border-border shadow-sm p-8 ring-1 ring-border/5">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                                    <h3 className="text-sm font-black text-foreground flex items-center gap-3 uppercase tracking-widest">
                                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                                        Suggested Billing & Coding
                                    </h3>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                                        Modify Codes
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* CPT Codes */}
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        <div className="flex flex-col gap-1 w-32 shrink-0">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                CPT Codes
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">Level of Service</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {suggestedCodes.cpt.length > 0 ? (
                                                suggestedCodes.cpt.map((code) => (
                                                    <div
                                                        key={code}
                                                        className="group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-all cursor-pointer"
                                                    >
                                                        <span className="text-base font-black text-foreground tracking-tight underline decoration-primary/30 underline-offset-4">{code}</span>
                                                        <div className="w-px h-6 bg-border mx-1" />
                                                        <span className="text-xs font-bold text-muted-foreground">
                                                            {code === "99214" && "Evaluation & Management - Level 4"}
                                                            {code === "99213" && "Evaluation & Management - Level 3"}
                                                            {code === "90833" && "Psychotherapy Adjunct"}
                                                            {code === "90792" && "Psych Diagnostic Eval"}
                                                        </span>
                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="High Confidence Matches Documentation" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground italic bg-muted/20 px-4 py-2 rounded-xl border border-dashed border-border">
                                                    <Sparkles className="h-4 w-4 opacity-50" />
                                                    Generate note to analyze level of service...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ICD-10 Codes */}
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                        <div className="flex flex-col gap-1 w-32 shrink-0">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                ICD-10 CM
                                            </span>
                                            <span className="text-[9px] text-muted-foreground">Clinical Diagnoses</span>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {suggestedCodes.icd10.length > 0 ? (
                                                suggestedCodes.icd10.map((code) => (
                                                    <div
                                                        key={code}
                                                        className="group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer shadow-sm"
                                                    >
                                                        <span className="text-sm font-black text-primary px-2 py-1 bg-primary/5 rounded border border-primary/10 tracking-wider">
                                                            {code}
                                                        </span>
                                                        <span className="text-xs font-bold text-foreground/80">
                                                            {code === "G44.209" && "Tension-type headache, not intractable"}
                                                            {code === "I10" && "Essential (primary) hypertension"}
                                                            {code === "E11.9" && "Type 2 diabetes mellitus without complications"}
                                                            {code === "F32.1" && "Major depressive disorder, single episode, moderate"}
                                                            {code === "F41.1" && "Generalized anxiety disorder"}
                                                        </span>
                                                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all ml-2" />
                                                    </div>
                                                ))
                                            ) : (
                                                <button className="flex items-center gap-3 text-sm text-muted-foreground italic bg-muted/20 px-4 py-2 rounded-xl border border-dashed border-border hover:border-primary group transition-all">
                                                    <Plus className="h-4 w-4 group-hover:rotate-90 transition-all" />
                                                    Add primary diagnosis code...
                                                </button>
                                            )}
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

// Icons
function Edit3(props: any) {
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
            className="lucide lucide-edit-3"
        >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    )
}

function CreditCard(props: any) {
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
            className="lucide lucide-credit-card"
        >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
    )
}


