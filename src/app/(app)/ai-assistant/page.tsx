"use client";

import { useState } from 'react';
import {
    Brain,
    Loader2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    Check,
    X,
    Edit,
    ChevronUp,
    Activity,
    AlertTriangle,
    Sparkles,
    CheckCircle2
} from "lucide-react";
import { patients } from "@/lib/demo-data/patients";

// Local Component Definitions
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-card rounded-xl border border-border shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-foreground ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-sm text-muted-foreground mt-2 ${className}`}>{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const Button = ({ children, className, variant = "default", size = "default", onClick, disabled }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        default: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
        outline: "bg-transparent border border-border hover:bg-accent dark:text-slate-100",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        link: "bg-transparent underline-offset-4 hover:underline text-primary",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        purple: "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20"
    };
    const sizes = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-2 rounded-md",
        lg: "h-11 px-8 rounded-md"
    };
    return (
        <button
            className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const Badge = ({ children, variant = "default", className }: any) => {
    const variants = {
        default: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        secondary: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        outline: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
        purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    };
    return (
        <span className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </span>
    );
};

const Alert = ({ children, variant = "default", className }: any) => {
    const variants = {
        default: "bg-blue-50/50 text-blue-900 border-blue-200 dark:bg-blue-950/20 dark:text-blue-200 dark:border-blue-900",
        destructive: "bg-red-50/50 text-red-900 border-red-200 dark:bg-red-950/20 dark:text-red-200 dark:border-red-900"
    };
    return (
        <div className={`relative w-full rounded-xl border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </div>
    );
};
const AlertTitle = ({ children, className }: any) => (
    <h5 className={`mb-1 font-bold text-sm tracking-tight ${className}`}>{children}</h5>
);
const AlertDescription = ({ children, className }: any) => (
    <div className={`text-xs opacity-80 [&_p]:leading-relaxed ${className}`}>{children}</div>
);

const Progress = ({ value, className }: { value: number, className?: string }) => (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
        <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${value}%` }}
        />
    </div>
);

const SAMPLE_NOTES = `Patient presents with persistent low mood for the past 3 weeks. Reports difficulty sleeping (waking at 3 AM most nights), decreased appetite, and feeling constantly tired despite adequate rest. 

Describes feeling worthless and having difficulty concentrating at work. No longer enjoys activities that previously brought pleasure (anhedonia). 

Denies current suicidal ideation but reports passive thoughts about "not wanting to wake up." No specific plan or intent. Has strong support system with spouse and close friends.

Patient started experiencing these symptoms after a work-related setback but symptoms have persisted and worsened. Functional impairment noted in work performance and social relationships.`;

export default function AIAssistantPage() {
    const [sessionNotes, setSessionNotes] = useState("");
    const [selectedPatient, setSelectedPatient] = useState("");
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedDiagnosis, setExpandedDiagnosis] = useState<number | null>(null);
    const [showToast, setShowToast] = useState(false);

    const analyzeSymptoms = async () => {
        if (!sessionNotes.trim()) {
            setError("Please enter session notes to analyze");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch('/api/ai/diagnose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: sessionNotes,
                    patientContext: selectedPatient
                })
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();
            setAnalysis(data);
        } catch (err) {
            setError("Failed to analyze symptoms. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.7) return "default";
        if (confidence >= 0.5) return "secondary";
        return "outline";
    };

    return (
        <div className="flex-1 space-y-8 p-6 lg:p-10 bg-slate-50/30 dark:bg-slate-950/30 h-full overflow-y-auto animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="bg-purple-600/10 p-2.5 rounded-2xl border border-purple-500/20">
                            <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        AI Diagnostic Assistant
                    </h2>
                    <p className="text-muted-foreground mt-2 font-medium">
                        Advanced clinical decision support <span className="text-slate-300 dark:text-slate-700 mx-2">|</span> <span className="text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest text-[10px]">Clinician Verification Required</span>
                    </p>
                </div>
                <div className="px-5 py-2.5 bg-purple-600/10 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
                    <Sparkles className="mr-2.5 h-4 w-4 animate-pulse" />
                    Neural Engine Active
                </div>
            </div>

            {/* Safety Banner */}
            <Alert className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 backdrop-blur-sm">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <AlertTitle className="uppercase tracking-widest text-[10px] font-black mb-2">Safety Policy & Decision Support</AlertTitle>
                <AlertDescription>
                    This AI model is designed for decision support only. All suggestions must be reviewed, verified, and signed by a licensed clinician. Do not use for automated emergency triage.
                </AlertDescription>
            </Alert>

            <div className="grid lg:grid-cols-12 gap-8 pb-20">
                {/* Input Section */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="ring-1 ring-border/5 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest font-black flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Clinical Input Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2.5 block ml-1">Select Patient Content</label>
                                <div className="relative group">
                                    <select
                                        value={selectedPatient}
                                        onChange={(e) => setSelectedPatient(e.target.value)}
                                        className="w-full h-12 px-4 py-3 rounded-xl border border-border bg-card text-sm font-bold focus:ring-4 focus:ring-primary/5 appearance-none transition-all hover:border-primary/30"
                                    >
                                        <option value="" disabled>Search Patient List...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (MRN: {p.mrn})</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-4 h-4 w-4 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2.5 ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Observational Notes</label>
                                    <button
                                        onClick={() => setSessionNotes(SAMPLE_NOTES)}
                                        className="text-[10px] font-black uppercase text-primary hover:underline transition-all"
                                    >
                                        Load Sample Case
                                    </button>
                                </div>
                                <textarea
                                    placeholder="Enter raw session notes, patient symptoms, or transcribed observations for neural analysis..."
                                    value={sessionNotes}
                                    onChange={(e) => setSessionNotes(e.target.value)}
                                    className="w-full h-64 p-5 rounded-2xl border border-border bg-muted/10 font-mono text-sm leading-relaxed focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none placeholder:italic"
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={analyzeSymptoms}
                                disabled={loading}
                                className="w-full h-14 text-sm font-black uppercase tracking-widest"
                                variant="purple"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                        Processing Neuro-Model...
                                    </>
                                ) : (
                                    <>
                                        <Brain className="mr-3 h-5 w-5" />
                                        Analyze Patient Profile
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Column */}
                <div className="lg:col-span-7 space-y-8">
                    {!analysis ? (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-dashed border-border/60">
                            <div className="bg-muted p-8 rounded-full mb-6">
                                <Brain className="h-20 w-20 text-slate-300 dark:text-slate-700" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 italic tracking-tight">System Ready for Analysis</h3>
                            <p className="max-w-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Please enter clinical notes in the neural hub to detect symptoms, suggest differential diagnoses, and calculate risk scores.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-right-10 duration-700">
                            {/* Symmetric Symptoms */}
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-border">
                                    <CardTitle className="text-xs uppercase tracking-widest font-black flex items-center justify-between">
                                        Identified Clinical Indicators
                                        <Badge variant="purple">{analysis.symptoms?.length} Found</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {analysis.symptoms?.map((symptom: any, i: number) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-3.5 border border-border/60 rounded-xl hover:border-primary/30 transition-all bg-card shadow-sm"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-foreground">{symptom.text}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${symptom.severity === 'severe' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                            symptom.severity === 'moderate' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                            }`}>
                                                            {symptom.severity}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-primary">{(symptom.confidence * 100).toFixed(0)}%</p>
                                                    <p className="text-[8px] uppercase tracking-tighter text-muted-foreground font-bold">Confidence</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Differential Diagnosis */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    AI-Suggested Differential Diagnosis
                                </h3>
                                {analysis.diagnoses?.map((diagnosis: any, i: number) => (
                                    <Card key={i} className="group hover:border-primary/50 transition-all shadow-md">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="text-xl font-black text-foreground italic tracking-tight">{diagnosis.condition}</h4>
                                                        <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded border border-border text-muted-foreground font-bold">{diagnosis.icdCode}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary" style={{ width: `${diagnosis.confidence * 100}%` }} />
                                                        </div>
                                                        <span className="text-sm font-black text-primary">{(diagnosis.confidence * 100).toFixed(0)}% Match</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setExpandedDiagnosis(expandedDiagnosis === i ? null : i)}
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    {expandedDiagnosis === i ? "Hide Logic" : "Trace Logic"}
                                                </Button>
                                            </div>

                                            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-500/10 rounded-xl mb-4">
                                                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    DSM-5 Criteria Alignment
                                                </p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic">"{diagnosis.dsm5Criteria}"</p>
                                            </div>

                                            {expandedDiagnosis === i && (
                                                <div className="mt-6 pt-6 border-t border-border space-y-5 animate-in slide-in-from-top-4 duration-500">
                                                    <div>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Neural Evidence Mapping</p>
                                                        <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/50">{diagnosis.evidence}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Evidence-Based Treatment Considerations</p>
                                                        <p className="text-sm text-blue-700 dark:text-blue-300 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-500/10 font-bold">{diagnosis.treatmentConsiderations}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-6">
                                                <Button onClick={handleAccept} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 text-xs font-black uppercase tracking-widest">Accept & Sync to Note</Button>
                                                <Button variant="outline" className="flex-1 h-11 text-xs font-black uppercase tracking-widest">Modify Logic</Button>
                                                <Button variant="outline" className="h-11 px-4 text-red-500 hover:bg-red-50">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Risk Scores Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(analysis.riskScores || {}).map(([key, risk]: any) => (
                                    <Card key={key} className="overflow-hidden">
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                <Activity className="h-4 w-4 text-slate-300" />
                                            </div>
                                            <div className="flex items-baseline gap-3">
                                                <h4 className="text-4xl font-black text-foreground">{risk.score ?? risk.level}</h4>
                                                {risk.score !== undefined && <span className="text-xs text-muted-foreground font-bold">/ {key === 'phq9' ? '27' : '21'}</span>}
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <Badge variant={risk.level === 'high' || risk.score >= 20 ? 'destructive' : 'secondary'}>
                                                    {risk.severity ?? risk.level}
                                                </Badge>
                                                {risk.changeFromPrevious && (
                                                    <span className={`text-[10px] font-bold ${risk.changeFromPrevious.startsWith('+') ? 'text-red-500' : 'text-emerald-500'} flex items-center`}>
                                                        {risk.changeFromPrevious.startsWith('+') ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                        {risk.changeFromPrevious}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-4 text-xs text-muted-foreground leading-relaxed font-medium">{risk.interpretation ?? risk.recommendations}</p>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Toast */}
            {showToast && (
                <div className="fixed bottom-8 right-8 z-[70] animate-in slide-in-from-right-10 fade-in duration-500">
                    <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="font-black uppercase tracking-widest text-[11px]">AI Findings Synced to Patient Record</span>
                    </div>
                </div>
            )}
        </div>
    );
}
