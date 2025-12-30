"use client";

import { useState } from 'react';
import { Loader2, Sparkles, User, Pill, Activity, Brain, ChevronDown, Check, X, TrendingUp, DollarSign, Clock, Heart } from "lucide-react";

// Local Component Definitions
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
        ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
    };
    const sizes = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10"
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
        default: "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
        secondary: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-transparent",
        outline: "text-foreground border-slate-200 dark:border-slate-800",
    };
    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant as keyof typeof variants]} ${className}`}>
            {children}
        </div>
    );
};

const Tabs = ({ defaultValue, className, children }: any) => {
    const [activeTab, setActiveTab] = useState(defaultValue);

    // Clone children to pass activeTab state
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
    });

    return <div className={className}>{childrenWithProps}</div>;
};

const TabsList = ({ className, children, activeTab, setActiveTab }: any) => (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 p-1 text-slate-500 dark:text-slate-400 ${className}`}>
        {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, { activeTab, setActiveTab } as any);
            }
            return child;
        })}
    </div>
);

const TabsTrigger = ({ value, className, children, activeTab, setActiveTab }: any) => (
    <button
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === value
                ? "bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-50 shadow-sm"
                : "hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
            } ${className}`}
        onClick={() => setActiveTab(value)}
    >
        {children}
    </button>
);

const TabsContent = ({ value, className, children, activeTab }: any) => {
    if (activeTab !== value) return null;
    return <div className={`ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>{children}</div>;
};

const Progress = ({ value, className }: { value: number, className?: string }) => (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}>
        <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${value}%` }}
        />
    </div>
);


const mockPatients = {
    'sarah-johnson': {
        name: 'Sarah Johnson',
        age: 34,
        gender: 'Female',
        diagnoses: ['Major Depressive Disorder', 'Generalized Anxiety Disorder'],
        currentMedications: ['None'],
        allergies: ['Penicillin'],
        phq9Score: 18,
        gad7Score: 12,
        lastSession: '2024-01-15',
        socialDeterminants: {
            employment: 'Employed full-time (marketing)',
            housing: 'Stable',
            support: 'Strong (spouse, friends)',
            insurance: 'Private insurance'
        },
        medicalHistory: ['Hypothyroidism (controlled)'],
        substanceUse: 'None reported',
        priorTreatments: ['Brief counseling 2 years ago (6 sessions)']
    },
    'michael-chen': {
        name: 'Michael Chen',
        age: 28,
        gender: 'Male',
        diagnoses: ['Persistent Depressive Disorder'],
        currentMedications: ['Sertraline 50mg'],
        allergies: ['None known'],
        phq9Score: 14,
        gad7Score: 8,
        lastSession: '2024-01-14',
        socialDeterminants: {
            employment: 'Graduate student',
            housing: 'Stable',
            support: 'Moderate (family distant)',
            insurance: 'Student health plan'
        },
        medicalHistory: ['None significant'],
        substanceUse: 'Occasional alcohol (social)',
        priorTreatments: ['Current SSRI for 3 months, partial response']
    }
};

import React from 'react';

export default function TreatmentPlannerPage() {
    const [selectedPatient, setSelectedPatient] = useState('');
    const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'comparison'>('cards');


    const patient = selectedPatient ? mockPatients[selectedPatient as keyof typeof mockPatients] : null;

    const generatePlan = async () => {
        if (!patient) return;

        setLoading(true);
        setTreatmentPlan(null); // Reset previous plan
        setSelectedOption(null); // Reset selection

        try {
            const response = await fetch('/api/ai/treatment-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientData: patient,
                    diagnoses: patient.diagnoses
                })
            });

            const data = await response.json();
            setTreatmentPlan(data);

        } catch (error) {
            console.error('Error generating plan:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                        <Sparkles className="h-8 w-8 text-purple-600" />
                        Treatment Plan Generator
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                        AI-powered personalized treatment planning
                    </p>
                </div>
                <div className="px-3 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full flex items-center font-medium text-sm">
                    <Brain className="mr-2 h-3 w-3" />
                    AI-Enhanced
                </div>
            </div>

            {/* Patient Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Patient</CardTitle>
                    <CardDescription>Choose a patient to generate treatment plan</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <select
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 appearance-none"
                        >
                            <option value="" disabled>Select patient</option>
                            <option value="sarah-johnson">Sarah Johnson - MDD, GAD</option>
                            <option value="michael-chen">Michael Chen - Persistent Depressive Disorder</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                </CardContent>
            </Card>

            {/* Patient Summary */}
            {patient && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-slate-500" />
                            Patient Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Demographics */}
                            <div>
                                <h3 className="font-semibold mb-3 text-sm text-slate-900 dark:text-slate-200">Demographics</h3>
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                                        <span className="text-slate-500">Age:</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-200">{patient.age}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                                        <span className="text-slate-500">Gender:</span>
                                        <span className="font-medium text-slate-900 dark:text-slate-200">{patient.gender}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-500">Insurance:</span>
                                        <span className="font-medium text-xs text-slate-900 dark:text-slate-200 text-right">{patient.socialDeterminants.insurance}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Clinical Data */}
                            <div>
                                <h3 className="font-semibold mb-3 text-sm flex items-center gap-1 text-slate-900 dark:text-slate-200">
                                    <Activity className="h-4 w-4 text-purple-500" />
                                    Clinical Data
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-slate-500 block mb-1">Diagnoses:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {patient.diagnoses.map((dx, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] h-auto py-0.5">
                                                    {dx}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1 mt-2">
                                        <span className="text-slate-500">PHQ-9:</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-200">{patient.phq9Score}</span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-500">GAD-7:</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-200">{patient.gad7Score}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Medications & History */}
                            <div>
                                <h3 className="font-semibold mb-3 text-sm flex items-center gap-1 text-slate-900 dark:text-slate-200">
                                    <Pill className="h-4 w-4 text-blue-500" />
                                    Medications & History
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Current Meds</span>
                                        <p className="text-xs mt-0.5 text-slate-900 dark:text-slate-200 font-medium">{patient.currentMedications.join(', ')}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Allergies</span>
                                        <p className="text-xs mt-0.5 text-red-600 dark:text-red-400 font-medium">{patient.allergies.join(', ')}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">History</span>
                                        <p className="text-xs mt-0.5 text-slate-600 dark:text-slate-400">{patient.priorTreatments.join(', ')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social Determinants */}
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="font-semibold mb-3 text-sm text-slate-900 dark:text-slate-200">Social Determinants of Health</h3>
                            <div className="grid md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 text-xs">Employment</span>
                                    <p className="text-xs mt-1 font-medium text-slate-900 dark:text-slate-200">{patient.socialDeterminants.employment}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-xs">Housing</span>
                                    <p className="text-xs mt-1 font-medium text-slate-900 dark:text-slate-200">{patient.socialDeterminants.housing}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-xs">Support</span>
                                    <p className="text-xs mt-1 font-medium text-slate-900 dark:text-slate-200">{patient.socialDeterminants.support}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500 text-xs">Substance Use</span>
                                    <p className="text-xs mt-1 font-medium text-slate-900 dark:text-slate-200">{patient.substanceUse}</p>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/20"
                            size="lg"
                            onClick={generatePlan}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Treatment Plan...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Personalized Treatment Plan
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Treatment Plan Results */}
            {treatmentPlan && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">

                    {/* 1. Patient Profile Assessment */}
                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-blue-900 dark:text-blue-100">Patient Profile Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-blue-600 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Current Diagnoses</p>
                                    <div className="flex flex-wrap gap-1">
                                        {treatmentPlan.patientProfile?.currentDiagnoses?.map((dx: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="bg-white dark:bg-blue-900/50 text-blue-700 dark:text-blue-200">{dx}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-blue-600 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Severity</p>
                                    <p className="font-bold text-blue-900 dark:text-blue-100">{treatmentPlan.patientProfile?.severity}</p>
                                </div>
                                <div>
                                    <p className="text-blue-600 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Risk Factors</p>
                                    <p className="text-xs text-blue-800 dark:text-blue-200">{treatmentPlan.patientProfile?.riskFactors?.join(', ')}</p>
                                </div>
                                <div>
                                    <p className="text-blue-600 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Protective Factors</p>
                                    <p className="text-xs text-blue-800 dark:text-blue-200">{treatmentPlan.patientProfile?.protectiveFactors?.join(', ')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Recommended Approach */}
                    {treatmentPlan.recommendations && (
                        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                                    <Check className="h-4 w-4 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-full p-0.5" />
                                    AI Recommendation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="font-bold mb-2 text-lg text-emerald-800 dark:text-emerald-200">
                                    Recommended: {treatmentPlan.recommendations.recommended?.toUpperCase()} Approach
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">{treatmentPlan.recommendations.rationale}</p>
                                {treatmentPlan.recommendations.alternativeConsiderations && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 italic border-t border-emerald-100 dark:border-emerald-800/50 pt-2">
                                        Alternative: {treatmentPlan.recommendations.alternativeConsiderations}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                        <span className="text-xs font-medium text-slate-500 pl-3">Compare Treatment Strategies</span>
                        <div className="flex gap-1">
                            <Button
                                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('cards')}
                                className={`text-xs h-8 ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                            >
                                Card View
                            </Button>
                            <Button
                                variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('comparison')}
                                className={`text-xs h-8 ${viewMode === 'comparison' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                            >
                                Comparison View
                            </Button>
                        </div>
                    </div>

                    {/* Treatment Options - Card View */}
                    {viewMode === 'cards' && (
                        <div className="grid md:grid-cols-3 gap-6">
                            {treatmentPlan.options?.map((option: any) => (
                                <Card
                                    key={option.id}
                                    className={`transition-all duration-200 h-full flex flex-col ${selectedOption === option.id ? 'ring-2 ring-purple-600 shadow-md' : 'hover:border-slate-300 dark:hover:border-slate-700'} ${treatmentPlan.recommendations?.recommended === option.id ? 'border-emerald-500 border-2 dark:border-emerald-500' : ''
                                        }`}
                                >
                                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{option.name}</CardTitle>
                                                <CardDescription className="mt-1 line-clamp-2 min-h-[40px]">{option.description}</CardDescription>
                                            </div>
                                            {treatmentPlan.recommendations?.recommended === option.id && (
                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 ml-2 whitespace-nowrap">Recommended</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5 pt-6 flex-1">
                                        {/* Efficacy Indicator */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Predicted Efficacy</span>
                                                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{option.predictedEfficacy}%</span>
                                            </div>
                                            <Progress value={option.predictedEfficacy} className="h-2 bg-slate-100 dark:bg-slate-800" />
                                            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Clock className="h-3 w-3" />
                                                    {option.timeToImprovement}
                                                </span>
                                                <span className="font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{option.successRate}</span>
                                            </div>
                                        </div>

                                        {/* Medications */}
                                        <div>
                                            <h4 className="font-bold text-xs uppercase text-slate-500 mb-3 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                                                <Pill className="h-3.5 w-3.5" />
                                                Medications
                                            </h4>
                                            {option.medications?.map((med: any, i: number) => (
                                                <div key={i} className="text-sm p-3 bg-slate-50 dark:bg-slate-900 rounded-lg mb-2 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-bold text-slate-900 dark:text-white">{med.name}</p>
                                                        <Badge variant="outline" className="text-[10px] h-5 bg-white dark:bg-slate-950 font-mono text-slate-500">{med.cost}</Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">{med.dosage}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 italic leading-tight">{med.rationale}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Therapy */}
                                        <div>
                                            <h4 className="font-bold text-xs uppercase text-slate-500 mb-3 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                                                <Heart className="h-3.5 w-3.5" />
                                                Therapy
                                            </h4>
                                            <div className="text-sm p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <p className="font-bold text-slate-900 dark:text-white">{option.therapy?.type}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{option.therapy?.frequency}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{option.therapy?.duration}</p>
                                            </div>
                                        </div>

                                        {/* Lifestyle */}
                                        <div>
                                            <h4 className="font-bold text-xs uppercase text-slate-500 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">Lifestyle Interventions</h4>
                                            <ul className="text-xs space-y-2">
                                                {option.lifestyle?.slice(0, 3).map((item: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <Check className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                        <span className="text-slate-600 dark:text-slate-400">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Pros/Cons Tabs */}
                                        <div className="mt-auto">
                                            <Tabs defaultValue="pros" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 h-8 p-0.5">
                                                    <TabsTrigger value="pros" className="text-xs h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Pros</TabsTrigger>
                                                    <TabsTrigger value="cons" className="text-xs h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Cons</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="pros" className="space-y-2 mt-3 min-h-[80px]">
                                                    {option.pros?.map((pro: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-2 text-xs">
                                                            <Check className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                            <span className="text-slate-700 dark:text-slate-300">{pro}</span>
                                                        </div>
                                                    ))}
                                                </TabsContent>
                                                <TabsContent value="cons" className="space-y-2 mt-3 min-h-[80px]">
                                                    {option.cons?.map((con: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-2 text-xs">
                                                            <X className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                                                            <span className="text-slate-700 dark:text-slate-300">{con}</span>
                                                        </div>
                                                    ))}
                                                </TabsContent>
                                            </Tabs>
                                        </div>

                                    </CardContent>

                                    {/* Footer / Action */}
                                    <div className="p-6 pt-0 mt-auto">
                                        <Button
                                            className={`w-full font-bold ${selectedOption === option.id ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-slate-200 dark:border-slate-700'}`}
                                            variant={selectedOption === option.id ? 'default' : 'outline'}
                                            onClick={() => setSelectedOption(option.id)}
                                        >
                                            {selectedOption === option.id ? (
                                                <>
                                                    <Check className="mr-2 h-4 w-4" />
                                                    Selected
                                                </>
                                            ) : 'Select Plan'}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Comparison View */}
                    {viewMode === 'comparison' && (
                        <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
                                <CardTitle className="text-lg">Treatment Plan Comparison</CardTitle>
                                <CardDescription>Side-by-side comparison of key metrics</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/30">
                                                <th className="text-left p-4 font-bold text-slate-500 uppercase text-xs tracking-wider border-b border-r border-slate-100 dark:border-slate-800 w-[200px]">Feature</th>
                                                {treatmentPlan.options?.map((opt: any) => (
                                                    <th key={opt.id} className={`text-left p-4 font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 ${treatmentPlan.recommendations?.recommended === opt.id ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                                                        {opt.name}
                                                        {treatmentPlan.recommendations?.recommended === opt.id && (
                                                            <span className="block mt-1 text-[10px] text-emerald-600 font-normal uppercase tracking-wide">Recommended</span>
                                                        )}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            <tr>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">Efficacy</td>
                                                {treatmentPlan.options?.map((opt: any) => (
                                                    <td key={opt.id} className={`p-4 ${treatmentPlan.recommendations?.recommended === opt.id ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-lg text-purple-600">{opt.predictedEfficacy}%</span>
                                                            <Progress value={opt.predictedEfficacy} className="w-16 h-1.5" />
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">Time to Improvement</td>
                                                {treatmentPlan.options?.map((opt: any) => (
                                                    <td key={opt.id} className={`p-4 ${treatmentPlan.recommendations?.recommended === opt.id ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                                        {opt.timeToImprovement}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">Primary Medication</td>
                                                {treatmentPlan.options?.map((opt: any) => (
                                                    <td key={opt.id} className={`p-4 ${treatmentPlan.recommendations?.recommended === opt.id ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                                        <p className="font-medium text-slate-900 dark:text-white">{opt.medications?.[0]?.name}</p>
                                                        <p className="text-xs text-slate-500">{opt.medications?.[0]?.dosage}</p>
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">Therapy Type</td>
                                                {treatmentPlan.options?.map((opt: any) => (
                                                    <td key={opt.id} className={`p-4 ${treatmentPlan.recommendations?.recommended === opt.id ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                                        <p className="font-medium text-slate-900 dark:text-white text-xs">{opt.therapy?.type}</p>
                                                        <p className="text-xs text-slate-500">{opt.therapy?.frequency}</p>
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">Cost Level</td>
                                                {treatmentPlan.options?.map((opt: any) => (
                                                    <td key={opt.id} className={`p-4 ${treatmentPlan.recommendations?.recommended === opt.id ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                                        <Badge variant="outline" className="font-mono bg-white dark:bg-slate-950">{opt.medications?.[0]?.cost}</Badge>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Save Plan Button */}
                    {selectedOption && (
                        <div className="sticky bottom-4 z-10 animate-in slide-in-from-bottom-10 duration-500">
                            <Card className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-none shadow-2xl">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-purple-500/20 p-2 rounded-full">
                                            <Check className="h-6 w-6 text-purple-400 dark:text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">
                                                Confirm {treatmentPlan.options?.find((o: any) => o.id === selectedOption)?.name}?
                                            </p>
                                            <p className="text-sm text-slate-400 dark:text-slate-600">
                                                This plan will be saved to the patient's updated record provided to the EHR.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() => alert('Treatment plan saved successfully!')}
                                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold h-12 px-8"
                                    >
                                        Save Treatment Plan
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
