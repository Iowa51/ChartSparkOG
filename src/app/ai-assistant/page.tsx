"use client";

import { useState } from 'react';
import { Brain, Loader2, AlertCircle, TrendingUp, TrendingDown, ChevronDown, Check, X, Edit, ChevronUp, Activity, AlertTriangle } from "lucide-react";

// Local Component Definitions (simulating UI library for consistency, since src/components/ui/ is missing)

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pb-2 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`font-semibold leading-none tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-2 ${className}`}>{children}</p>
);
const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const Button = ({ children, className, variant = "default", size = "default", onClick, disabled }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
        default: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
        outline: "bg-transparent border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        link: "bg-transparent underline-offset-4 hover:underline text-primary",
        destructive: "bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600"
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
        default: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        secondary: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        outline: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    return (
        <span className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </span>
    );
};

const Alert = ({ children, variant = "default", className }: any) => {
    const variants = {
        default: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900",
        destructive: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900"
    };
    return (
        <div className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </div>
    );
};
const AlertTitle = ({ children, className }: any) => (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>{children}</h5>
);
const AlertDescription = ({ children, className }: any) => (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>{children}</div>
);

const Textarea = ({ className, ...props }: any) => (
    <textarea
        className={`flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 ${className}`}
        {...props}
    />
);

const Progress = ({ value, className }: { value: number, className?: string }) => (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
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

    const loadSampleNotes = () => {
        setSessionNotes(SAMPLE_NOTES);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.7) return "default"; // Green
        if (confidence >= 0.5) return "secondary"; // Yellow
        return "outline"; // Orange/Red
    };

    const getSeverityColor = (severity: string) => {
        if (severity === "severe") return "text-red-600 dark:text-red-400";
        if (severity === "moderate") return "text-orange-600 dark:text-orange-400";
        return "text-yellow-600 dark:text-yellow-400";
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Brain className="h-8 w-8 text-primary" />
                        AI Diagnostic Assistant
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        Clinical decision support powered by AI - <span className="font-semibold text-amber-600 dark:text-amber-400">Requires clinician review</span>
                    </p>
                </div>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full flex items-center font-medium text-sm">
                    <Brain className="mr-2 h-3 w-3" />
                    AI-Powered
                </div>
            </div>

            {/* Safety Banner */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Clinical Decision Support Tool</AlertTitle>
                <AlertDescription>
                    AI suggestions require clinician approval and review. Not for autonomous diagnosis.
                    Always verify findings with clinical judgment and patient assessment.
                </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-6 pb-12">
                {/* Input Section */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Session Notes</CardTitle>
                        <CardDescription>
                            Enter patient session notes for AI analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Patient (Optional)</label>
                            <div className="relative">
                                <select
                                    value={selectedPatient}
                                    onChange={(e) => setSelectedPatient(e.target.value)}
                                    className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                >
                                    <option value="" disabled>Select patient for context</option>
                                    <option value="sarah-johnson">Dr. Sarah Johnson</option>
                                    <option value="michael-chen">Dr. Michael Chen</option>
                                    <option value="emily-rodriguez">Dr. Emily Rodriguez</option>
                                    <option value="james-wilson">Dr. James Wilson</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block text-slate-700 dark:text-slate-300">Clinical Notes</label>
                            <Textarea
                                placeholder="Enter session notes, patient symptoms, observations..."
                                value={sessionNotes}
                                onChange={(e: any) => setSessionNotes(e.target.value)}
                                className="min-h-[300px] font-mono text-sm dark:bg-slate-950 dark:text-slate-200"
                            />
                            <Button
                                variant="link"
                                size="sm"
                                onClick={loadSampleNotes}
                                className="mt-2 pl-0 h-auto"
                            >
                                Load sample notes
                            </Button>
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
                            className="w-full"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Brain className="mr-2 h-4 w-4" />
                                    Analyze Symptoms
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Column */}
                <div className="space-y-6">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Detected Symptoms</CardTitle>
                            <CardDescription>
                                AI-identified symptoms with confidence levels
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysis ? (
                                <div className="space-y-3">
                                    {analysis.symptoms?.map((symptom: any, i: number) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-slate-50/50 dark:bg-slate-900/50"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{symptom.text}</p>
                                                {symptom.severity && (
                                                    <p className={`text-xs ${getSeverityColor(symptom.severity)} font-medium mt-0.5 uppercase tracking-wide`}>
                                                        {symptom.severity}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge variant={getConfidenceColor(symptom.confidence)}>
                                                {(symptom.confidence * 100).toFixed(0)}%
                                            </Badge>
                                        </div>
                                    ))}

                                    {(!analysis.symptoms || analysis.symptoms.length === 0) && (
                                        <p className="text-muted-foreground text-center py-10">
                                            No symptoms detected in the notes
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <Brain className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        Enter notes and click analyze<br />to detect symptoms
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {analysis && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {analysis.diagnoses && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Differential Diagnosis</CardTitle>
                                        <CardDescription>
                                            AI-suggested diagnoses ranked by confidence
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {analysis.diagnoses.map((diagnosis: any, i: number) => (
                                                <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                                                    {/* Main Diagnosis Card */}
                                                    <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{diagnosis.condition}</h3>
                                                                    {diagnosis.icdCode && (
                                                                        <Badge variant="outline" className="text-xs font-mono">
                                                                            {diagnosis.icdCode}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-3">
                                                                    <div className="flex items-center gap-2 flex-1">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confidence</span>
                                                                        <Progress
                                                                            value={diagnosis.confidence * 100}
                                                                            className="flex-1 h-2 max-w-[120px]"
                                                                        />
                                                                        <span className={`text-sm font-black ${diagnosis.confidence >= 0.7 ? "text-emerald-600 dark:text-emerald-400" :
                                                                                diagnosis.confidence >= 0.5 ? "text-amber-600 dark:text-amber-400" : "text-slate-500"
                                                                            }`}>
                                                                            {(diagnosis.confidence * 100).toFixed(0)}%
                                                                        </span>
                                                                    </div>
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        className="h-7 text-xs"
                                                                        onClick={() => setExpandedDiagnosis(expandedDiagnosis === i ? null : i)}
                                                                    >
                                                                        {expandedDiagnosis === i ? (
                                                                            <>
                                                                                Less <ChevronUp className="h-3 w-3 ml-1" />
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                More <ChevronDown className="h-3 w-3 ml-1" />
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Quick Info */}
                                                        <div className="space-y-1 mb-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                                                            <p className="text-xs font-bold text-slate-500 uppercase">DSM-5 Criteria Match</p>
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">{diagnosis.dsm5Criteria}</p>
                                                        </div>

                                                        {/* Expanded Details */}
                                                        {expandedDiagnosis === i && (
                                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Supporting Evidence</p>
                                                                    <p className="text-sm text-slate-600 dark:text-slate-300">{diagnosis.evidence}</p>
                                                                </div>

                                                                {diagnosis.supportingSymptoms && diagnosis.supportingSymptoms.length > 0 && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Supporting Symptoms</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {diagnosis.supportingSymptoms.map((symptom: string, idx: number) => (
                                                                                <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5">
                                                                                    {symptom}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {diagnosis.treatmentConsiderations && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Treatment Considerations</p>
                                                                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                                                            {diagnosis.treatmentConsiderations}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Action Buttons */}
                                                        <div className="flex gap-2 mt-4 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                                            <Button size="sm" variant="default" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs font-bold shadow-sm">
                                                                <Check className="mr-1.5 h-3 w-3" />
                                                                Accept
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-bold border-slate-200 dark:border-slate-700">
                                                                <Edit className="mr-1.5 h-3 w-3" />
                                                                Modify
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50">
                                                                <X className="mr-1.5 h-3 w-3" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recommendations */}
                                        {analysis.recommendations && analysis.recommendations.length > 0 && (
                                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                                <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Clinical Recommendations
                                                </h4>
                                                <ul className="space-y-2">
                                                    {analysis.recommendations.map((rec: string, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-900 dark:text-blue-100">
                                                            <span className="text-blue-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                                                            <span className="leading-snug">{rec}</span>
                                                            <Button size="sm" variant="link" className="h-auto p-0 text-xs ml-auto text-blue-600 underline whitespace-nowrap">Apply</Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Risk Assessment Scores */}
                            {analysis.riskScores && (
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        Risk Assessment Scores
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* PHQ-9 Depression Score */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center justify-between text-slate-500 uppercase tracking-wider">
                                                    PHQ-9 Depression
                                                    <Activity className="h-4 w-4 text-slate-400" />
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex items-baseline gap-2">
                                                        <div className={`text-4xl font-black ${analysis.riskScores.phq9.score >= 20 ? 'text-red-600 dark:text-red-400' :
                                                                analysis.riskScores.phq9.score >= 15 ? 'text-orange-600 dark:text-orange-400' :
                                                                    analysis.riskScores.phq9.score >= 10 ? 'text-amber-600 dark:text-amber-400' :
                                                                        'text-emerald-600 dark:text-emerald-400'
                                                            }`}>
                                                            {analysis.riskScores.phq9.score}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-bold">/ 27</div>
                                                    </div>
                                                    <div>
                                                        <Badge variant={
                                                            analysis.riskScores.phq9.score >= 20 ? "destructive" :
                                                                analysis.riskScores.phq9.score >= 15 ? "outline" :
                                                                    "secondary"
                                                        }>
                                                            {analysis.riskScores.phq9.severity}
                                                        </Badge>
                                                    </div>
                                                    {analysis.riskScores.phq9.changeFromPrevious && (
                                                        <div className="flex items-center gap-1 text-xs">
                                                            {analysis.riskScores.phq9.changeFromPrevious.startsWith('+') ? (
                                                                <TrendingUp className="h-3 w-3 text-red-500" />
                                                            ) : (
                                                                <TrendingDown className="h-3 w-3 text-emerald-500" />
                                                            )}
                                                            <span className="text-slate-500">
                                                                {analysis.riskScores.phq9.changeFromPrevious} from previous
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                                        {analysis.riskScores.phq9.interpretation}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* GAD-7 Anxiety Score */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center justify-between text-slate-500 uppercase tracking-wider">
                                                    GAD-7 Anxiety
                                                    <Activity className="h-4 w-4 text-slate-400" />
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex items-baseline gap-2">
                                                        <div className={`text-4xl font-black ${analysis.riskScores.gad7.score >= 15 ? 'text-red-600 dark:text-red-400' :
                                                                analysis.riskScores.gad7.score >= 10 ? 'text-orange-600 dark:text-orange-400' :
                                                                    analysis.riskScores.gad7.score >= 5 ? 'text-amber-600 dark:text-amber-400' :
                                                                        'text-emerald-600 dark:text-emerald-400'
                                                            }`}>
                                                            {analysis.riskScores.gad7.score}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-bold">/ 21</div>
                                                    </div>
                                                    <div>
                                                        <Badge variant={
                                                            analysis.riskScores.gad7.score >= 15 ? "destructive" :
                                                                analysis.riskScores.gad7.score >= 10 ? "outline" :
                                                                    "secondary"
                                                        }>
                                                            {analysis.riskScores.gad7.severity}
                                                        </Badge>
                                                    </div>
                                                    {analysis.riskScores.gad7.changeFromPrevious && (
                                                        <div className="flex items-center gap-1 text-xs">
                                                            {analysis.riskScores.gad7.changeFromPrevious.startsWith('+') ? (
                                                                <TrendingUp className="h-3 w-3 text-red-500" />
                                                            ) : (
                                                                <TrendingDown className="h-3 w-3 text-emerald-500" />
                                                            )}
                                                            <span className="text-slate-500">
                                                                {analysis.riskScores.gad7.changeFromPrevious} from previous
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                                        {analysis.riskScores.gad7.interpretation}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Suicide Risk */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center justify-between text-slate-500 uppercase tracking-wider">
                                                    Suicide Risk
                                                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex items-baseline gap-2">
                                                        <Badge
                                                            variant={
                                                                analysis.riskScores.suicideRisk.level === 'high' ? 'destructive' :
                                                                    analysis.riskScores.suicideRisk.level === 'moderate' ? 'secondary' :
                                                                        'default'
                                                            }
                                                            className="text-lg px-3 py-1 uppercase"
                                                        >
                                                            {analysis.riskScores.suicideRisk.level}
                                                        </Badge>
                                                    </div>
                                                    {analysis.riskScores.suicideRisk.factors && (
                                                        <div className="mt-3">
                                                            <p className="text-xs font-bold text-slate-500 mb-1">RISK FACTORS</p>
                                                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                                                {analysis.riskScores.suicideRisk.factors.map((factor: string, idx: number) => (
                                                                    <li key={idx}>• {factor}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {analysis.riskScores.suicideRisk.recommendations && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded font-medium">
                                                            {analysis.riskScores.suicideRisk.recommendations}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Substance Use Risk */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-sm flex items-center justify-between text-slate-500 uppercase tracking-wider">
                                                    Substance Use Risk
                                                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <div className="flex items-baseline gap-2">
                                                        <Badge
                                                            variant={
                                                                analysis.riskScores.substanceRisk.level === 'high' ? 'destructive' :
                                                                    analysis.riskScores.substanceRisk.level === 'moderate' ? 'secondary' :
                                                                        'default'
                                                            }
                                                            className="text-lg px-3 py-1 uppercase"
                                                        >
                                                            {analysis.riskScores.substanceRisk.level}
                                                        </Badge>
                                                    </div>
                                                    {analysis.riskScores.substanceRisk.factors && (
                                                        <div className="mt-3">
                                                            <p className="text-xs font-bold text-slate-500 mb-1">ASSESSMENT</p>
                                                            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                                                {analysis.riskScores.substanceRisk.factors.map((factor: string, idx: number) => (
                                                                    <li key={idx}>• {factor}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {analysis.riskScores.substanceRisk.recommendations && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                                            {analysis.riskScores.substanceRisk.recommendations}
                                                        </p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
