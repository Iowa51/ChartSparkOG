"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { getPatientById } from "@/lib/demo-data/patients";
import { useState, useEffect } from "react";
import {
    Shield,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    Brain,
    Activity,
    Thermometer,
    Save,
    Loader2
} from "lucide-react";
import Link from "next/link";
import {
    FALL_RISK_FACTORS,
    calculateFallRisk,
    MMSE_SECTIONS,
    interpretMMSE,
    GDS_15_QUESTIONS,
    interpretGDS15
} from "@/lib/geriatric-tools";

export default function NewRiskAssessmentPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;
    const patient = getPatientById(patientId);

    const [activeSection, setActiveSection] = useState<"fall" | "cognitive" | "depression">("fall");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fall Risk State
    const [selectedFallFactors, setSelectedFallFactors] = useState<string[]>([]);

    // MMSE State
    const [mmseScores, setMmseScores] = useState<Record<string, number>>({});

    // GDS-15 State
    const [gdsAnswers, setGdsAnswers] = useState<Record<number, string>>({});

    if (!patient) return null;

    const sections = [
        { id: "fall", label: "Fall Risk", icon: Activity },
        { id: "cognitive", label: "Cognitive (MMSE)", icon: Brain },
        { id: "depression", label: "Depression (GDS-15)", icon: Thermometer },
    ];

    const fallRiskResult = calculateFallRisk(selectedFallFactors);
    const mmseTotalScore = Object.values(mmseScores).reduce((sum, score) => sum + score, 0);
    const mmseResult = interpretMMSE(mmseTotalScore);

    const gdsScore = GDS_15_QUESTIONS.reduce((score, q, idx) => {
        const answer = gdsAnswers[idx];
        if (!answer) return score;
        if (q.scoring === 'yes_is_1' && answer === 'yes') return score + 1;
        if (q.scoring === 'no_is_1' && answer === 'no') return score + 1;
        return score;
    }, 0);
    const gdsResult = interpretGDS15(gdsScore);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Mocking API call for now to ensure stability
        const assessmentData = {
            patient_id: patientId,
            fall_risk_score: fallRiskResult.score,
            mmse_score: mmseTotalScore,
            gds_score: gdsScore,
            assessment_date: new Date().toISOString(),
            data: {
                fallFactors: selectedFallFactors,
                mmseBreakdown: mmseScores,
                gdsAnswers: gdsAnswers
            }
        };

        try {
            const response = await fetch('/api/risk-assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assessmentData)
            });

            // In demo mode or if API fails, we still want to redirect back
            setTimeout(() => {
                router.push(`/patients/${patientId}?tab=risk`);
            }, 1000);
        } catch (err) {
            console.error("Failed to save assessment:", err);
            router.push(`/patients/${patientId}?tab=risk`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="New Risk Assessment"
                description={`Conducting comprehensive clinical screening for ${patient.name}`}
                breadcrumbs={[
                    { label: "Patients", href: "/patients" },
                    { label: patient.name, href: `/patients/${patient.id}` },
                    { label: "New Risk Assessment" },
                ]}
            />

            <main className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Nav */}
                    <div className="lg:col-span-1 space-y-2">
                        {sections.map(section => {
                            const Icon = section.icon;
                            let status = "pending";
                            if (section.id === "fall" && selectedFallFactors.length > 0) status = "active";
                            if (section.id === "cognitive" && Object.keys(mmseScores).length > 0) status = "active";
                            if (section.id === "depression" && Object.keys(gdsAnswers).length > 0) status = "active";

                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${activeSection === section.id
                                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {section.label}
                                    {status === "active" && <CheckCircle2 className={`ml-auto h-4 w-4 ${activeSection === section.id ? "text-white/70" : "text-emerald-500"}`} />}
                                </button>
                            );
                        })}

                        <div className="pt-6">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Finalize & Save All
                            </button>
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {activeSection === "fall" && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
                                <div className="p-6 border-b border-border bg-muted/20">
                                    <h3 className="font-bold text-foreground">Fall Risk Assessment</h3>
                                    <p className="text-xs text-muted-foreground">Select all contributing factors observed or reported</p>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FALL_RISK_FACTORS.map(factor => (
                                        <button
                                            key={factor.factor}
                                            onClick={() => {
                                                if (selectedFallFactors.includes(factor.factor)) {
                                                    setSelectedFallFactors(selectedFallFactors.filter(f => f !== factor.factor));
                                                } else {
                                                    setSelectedFallFactors([...selectedFallFactors, factor.factor]);
                                                }
                                            }}
                                            className={`text-left p-3 rounded-xl border text-xs font-medium transition-all ${selectedFallFactors.includes(factor.factor)
                                                    ? "bg-primary/10 border-primary/50 text-primary font-bold"
                                                    : "bg-muted/30 border-border text-foreground/70 hover:border-primary/30"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{factor.factor}</span>
                                                <span className="opacity-50">{factor.points}pt</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className={`p-6 border-t border-border ${fallRiskResult.level === 'high' ? "bg-red-50/50" : "bg-emerald-50/50"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${fallRiskResult.level === 'high' ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider">Estimated Risk Level</p>
                                            <p className={`text-lg font-black ${fallRiskResult.level === 'high' ? "text-red-600" : "text-emerald-600"}`}>
                                                {fallRiskResult.interpretation} ({fallRiskResult.score} Points)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "cognitive" && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
                                <div className="p-6 border-b border-border bg-muted/20">
                                    <h3 className="font-bold text-foreground">Mini-Mental State Exam (MMSE)</h3>
                                    <p className="text-xs text-muted-foreground">Enter scores for each cognitive domain</p>
                                </div>
                                <div className="p-6 space-y-6">
                                    {MMSE_SECTIONS.map(section => (
                                        <div key={section.category} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-primary">{section.category}</h4>
                                                <span className="text-[10px] font-bold text-muted-foreground">Max: {section.maxScore}</span>
                                            </div>
                                            {(section.questions || section.tasks || [section.instruction]).map((q, idx) => (
                                                <p key={idx} className="text-xs text-foreground/80 pl-2 border-l-2 border-slate-100 italic">{q}</p>
                                            ))}
                                            <input
                                                type="range"
                                                min="0"
                                                max={section.maxScore}
                                                value={mmseScores[section.category] || 0}
                                                onChange={(e) => setMmseScores({ ...mmseScores, [section.category]: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-1">
                                                <span>0</span>
                                                <span>Current: {mmseScores[section.category] || 0}</span>
                                                <span>{section.maxScore}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className={`p-6 border-t border-border ${mmseTotalScore < 24 ? "bg-amber-50/50" : "bg-emerald-50/50"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${mmseTotalScore < 24 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                                            <Brain className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider">Cognitive Status</p>
                                            <p className={`text-lg font-black ${mmseTotalScore < 24 ? "text-amber-600" : "text-emerald-600"}`}>
                                                {mmseResult.category} ({mmseTotalScore}/30)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "depression" && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
                                <div className="p-6 border-b border-border bg-muted/20">
                                    <h3 className="font-bold text-foreground">Geriatric Depression Scale (GDS-15)</h3>
                                    <p className="text-xs text-muted-foreground">Screening for late-life depression</p>
                                </div>
                                <div className="divide-y divide-border">
                                    {GDS_15_QUESTIONS.map((q, idx) => (
                                        <div key={idx} className="p-4 flex items-center justify-between gap-4">
                                            <p className="text-sm font-medium text-foreground/80">{idx + 1}. {q.question}</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setGdsAnswers({ ...gdsAnswers, [idx]: 'yes' })}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${gdsAnswers[idx] === 'yes' ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground"
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => setGdsAnswers({ ...gdsAnswers, [idx]: 'no' })}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${gdsAnswers[idx] === 'no' ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground"
                                                        }`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className={`p-6 border-t border-border ${gdsScore > 4 ? "bg-red-50/50" : "bg-emerald-50/50"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${gdsScore > 4 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                                            <Thermometer className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider">Depression Screening Result</p>
                                            <p className={`text-lg font-black ${gdsScore > 4 ? "text-red-600" : "text-emerald-600"}`}>
                                                {gdsResult.category} (Score: {gdsScore})
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={() => {
                                    const currentIdx = sections.findIndex(s => s.id === activeSection);
                                    if (currentIdx > 0) setActiveSection(sections[currentIdx - 1].id as any);
                                }}
                                disabled={activeSection === "fall"}
                                className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-xl font-bold text-xs disabled:opacity-0 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous Section
                            </button>

                            {activeSection !== "depression" && (
                                <button
                                    onClick={() => {
                                        const currentIdx = sections.findIndex(s => s.id === activeSection);
                                        if (currentIdx < sections.length - 1) setActiveSection(sections[currentIdx + 1].id as any);
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95"
                                >
                                    Next Section
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
