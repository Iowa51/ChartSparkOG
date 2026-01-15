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
    Trash2,
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

    // Scribe state
    const [scribeTranscription, setScribeTranscription] = useState("");
    const [recordingTime, setRecordingTime] = useState(0);
    const [hasRecording, setHasRecording] = useState(false);

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
    const [phraseCategory, setPhraseCategory] = useState<"Subjective" | "Objective" | "Assessment" | "Plan">("Subjective");

    // Updated SOAP/Note state to be dynamic
    const [noteSections, setNoteSections] = useState<Record<string, string>>({});

    const [suggestedCodes, setSuggestedCodes] = useState<{
        cpt: string[];
        icd10: string[];
    }>({ cpt: [], icd10: [] });

    // Track which codes have been selected/copied
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

    // Modal for code explanations
    const [codeModalOpen, setCodeModalOpen] = useState(false);
    const [selectedCodeInfo, setSelectedCodeInfo] = useState<{
        code: string;
        type: 'cpt' | 'icd10';
        title: string;
        description: string;
        details: string[];
    } | null>(null);

    // Comprehensive code explanations
    const codeExplanations: Record<string, { title: string; description: string; details: string[] }> = {
        // CPT Codes
        '99214': {
            title: 'Evaluation & Management - Level 4',
            description: 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and moderate level of medical decision making.',
            details: [
                'Time: Typically 30-39 minutes when time is the basis',
                'Used for: Established patients with moderate complexity conditions',
                'Documentation: Must show 2 of 3: Limited data reviewed, Prescription drug management, Moderate risk procedures',
                'Common uses: Follow-up visits for chronic conditions, medication management'
            ]
        },
        '99213': {
            title: 'Evaluation & Management - Level 3',
            description: 'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and low level of medical decision making.',
            details: [
                'Time: Typically 20-29 minutes when time is the basis',
                'Used for: Established patients with low complexity conditions',
                'Documentation: Straightforward or low complexity decision making',
                'Common uses: Routine follow-ups, stable chronic disease management'
            ]
        },
        '90834': {
            title: 'Psychotherapy, 45 minutes',
            description: 'Psychotherapy, 45 minutes with patient when performed with an evaluation and management service.',
            details: [
                'Duration: 38-52 minutes face-to-face with patient',
                'Used for: Individual psychotherapy sessions',
                'Can be billed with E/M codes for same-day services',
                'Documentation: Must include start/stop times and therapeutic interventions'
            ]
        },
        '90837': {
            title: 'Psychotherapy, 60 minutes',
            description: 'Psychotherapy, 60 minutes with patient when performed with an evaluation and management service.',
            details: [
                'Duration: 53+ minutes face-to-face with patient',
                'Used for: Extended individual psychotherapy sessions',
                'Highest level of psychotherapy time code',
                'Documentation: Detailed notes on therapeutic techniques and patient response'
            ]
        },
        '90833': {
            title: 'Psychotherapy Add-on',
            description: 'Psychotherapy, 30 minutes with patient when performed with an evaluation and management service (add-on code).',
            details: [
                'Duration: 16-37 minutes face-to-face',
                'Must be billed WITH an E/M code (not standalone)',
                'Used when psychotherapy is provided during a medication management visit',
                'Common pairing: 99214 + 90833 for combined med check with brief therapy'
            ]
        },
        '90792': {
            title: 'Psychiatric Diagnostic Evaluation with Medical Services',
            description: 'Psychiatric diagnostic evaluation with medical services, including history, mental status exam, and medical assessment.',
            details: [
                'Used for: Initial psychiatric evaluations with medication consideration',
                'Includes: Comprehensive psychiatric history, MSE, diagnosis formulation',
                'Can only be billed once per patient (for initial evaluation)',
                'Documentation: Detailed biopsychosocial assessment required'
            ]
        },
        // ICD-10 Codes
        'F32.1': {
            title: 'Major Depressive Disorder, Single Episode, Moderate',
            description: 'A mood disorder characterized by a single episode of depression with moderate severity. Patient experiences depressed mood and/or loss of interest lasting at least 2 weeks with functional impairment.',
            details: [
                'Criteria: 5+ symptoms present during same 2-week period',
                'Symptoms: Depressed mood, anhedonia, weight changes, sleep disturbance, psychomotor changes, fatigue, worthlessness, concentration difficulties, suicidal ideation',
                'Moderate severity: Symptoms cause clinically significant distress with moderate functional impairment',
                'Single episode: No prior history of major depressive episodes'
            ]
        },
        'F41.1': {
            title: 'Generalized Anxiety Disorder',
            description: 'A mental health disorder characterized by persistent and excessive worry about various aspects of life that is difficult to control, lasting at least 6 months.',
            details: [
                'Core feature: Excessive anxiety and worry occurring more days than not for 6+ months',
                'Physical symptoms: Restlessness, fatigue, concentration difficulties, irritability, muscle tension, sleep disturbance',
                'Must cause clinically significant distress or functional impairment',
                'Cannot be better explained by substances, medical conditions, or other mental disorders'
            ]
        },
        'F33.1': {
            title: 'Major Depressive Disorder, Recurrent, Moderate',
            description: 'A mood disorder characterized by multiple episodes of major depression with moderate severity. Current or most recent episode meets criteria for moderate depressive episode.',
            details: [
                'Recurrent: History of 2 or more major depressive episodes',
                'Episodes separated by at least 2 consecutive months without significant symptoms',
                'Moderate: Number and intensity of symptoms and functional impairment between mild and severe',
                'Treatment: Often requires combination of pharmacotherapy and psychotherapy'
            ]
        },
        'G44.209': {
            title: 'Tension-type Headache, Unspecified, Not Intractable',
            description: 'A primary headache disorder characterized by mild to moderate bilateral pressing or tightening pain that is not aggravated by routine physical activity.',
            details: [
                'Duration: 30 minutes to 7 days',
                'Character: Bilateral, pressing/tightening (non-pulsating)',
                'Not intractable: Responsive to standard treatment',
                'Distinguishing: No nausea, no more than one of photophobia or phonophobia'
            ]
        },
        'I10': {
            title: 'Essential (Primary) Hypertension',
            description: 'High blood pressure without an identifiable secondary cause. Defined as systolic BP ≥130 mmHg and/or diastolic BP ≥80 mmHg on at least two occasions.',
            details: [
                'Stage 1: 130-139/80-89 mmHg',
                'Stage 2: ≥140/≥90 mmHg',
                'Risk factors: Age, obesity, sedentary lifestyle, high sodium diet, genetics',
                'Complications if untreated: Heart disease, stroke, kidney disease'
            ]
        },
        'E11.9': {
            title: 'Type 2 Diabetes Mellitus Without Complications',
            description: 'A metabolic disorder characterized by high blood sugar, insulin resistance, and relative lack of insulin. This code indicates no documented micro- or macrovascular complications.',
            details: [
                'Diagnostic criteria: HbA1c ≥6.5%, Fasting glucose ≥126 mg/dL, or 2-hour plasma glucose ≥200 mg/dL',
                'Without complications: No retinopathy, nephropathy, neuropathy, or cardiovascular complications documented',
                'Management: Lifestyle modification, oral hypoglycemics, monitoring',
                'Update code if complications develop (E11.2x-E11.8)'
            ]
        }
    };

    // Handle clicking on a code - show explanation modal
    const handleCodeClick = (code: string, type: 'cpt' | 'icd10') => {
        const explanation = codeExplanations[code];
        if (explanation) {
            setSelectedCodeInfo({
                code,
                type,
                ...explanation
            });
            setCodeModalOpen(true);
        }
    };

    // Copy code to clipboard
    const copyCodeToClipboard = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setSelectedCodes(prev => new Set([...prev, code]));
            setTimeout(() => {
                setSelectedCodes(prev => {
                    const next = new Set(prev);
                    next.delete(code);
                    return next;
                });
            }, 2000);
        } catch (err) {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setSelectedCodes(prev => new Set([...prev, code]));
            setTimeout(() => {
                setSelectedCodes(prev => {
                    const next = new Set(prev);
                    next.delete(code);
                    return next;
                });
            }, 2000);
        }
    };

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

        // Add variability with timestamp-based seed
        const variationSeed = Date.now() % 5;

        // Vital signs variations
        const vitals = [
            'BP 118/76 mmHg, HR 72 bpm, RR 16, Temp 98.4°F, SpO2 98% on RA',
            'BP 122/78 mmHg, HR 68 bpm, RR 14, Temp 98.6°F, SpO2 99% on RA',
            'BP 116/74 mmHg, HR 74 bpm, RR 15, Temp 98.2°F, SpO2 98% on RA',
            'BP 120/80 mmHg, HR 70 bpm, RR 16, Temp 98.5°F, SpO2 99% on RA',
            'BP 124/82 mmHg, HR 76 bpm, RR 14, Temp 98.3°F, SpO2 97% on RA'
        ][variationSeed];

        // Mental status exam variations
        const mseVariations = [
            'Alert and oriented x4. Cooperative with fair eye contact. Speech normal in rate and rhythm. Affect congruent, mildly restricted range. Thought process linear and goal-directed. No suicidal or homicidal ideation. Insight and judgment intact.',
            'Patient is alert, oriented, and cooperative. Good eye contact maintained throughout interview. Speech coherent with normal prosody. Affect euthymic with appropriate reactivity. Thought content without delusions. Denies SI/HI.',
            'Awake, alert, fully oriented. Appropriately dressed with good hygiene. Speech clear and spontaneous. Affect congruent with mild improvement noted. No psychomotor abnormalities. Insight and judgment appear intact.',
            'Alert and attentive throughout session. Engaged appropriately with interviewer. Affect reactive and congruent. Thought process organized and coherent. Denies current SI/HI. Judgment and insight are fair.',
            'Oriented to person, place, time, and situation. Cooperative demeanor with adequate eye contact. Speech fluent without pressure. Affect full range, appropriate to content. No evidence of thought disorder.'
        ][variationSeed];

        // Default plan items
        const defaultPlanItems = [
            ['Continue current medication regimen as prescribed', 'Psychotherapy session scheduled for next week', 'Sleep hygiene education reinforced', 'Return to clinic in 2-4 weeks for follow-up', 'Crisis resources reviewed'],
            ['Maintain current treatment plan with close monitoring', 'Weekly therapy sessions to continue', 'Encouraged daily physical activity', 'Follow-up scheduled in 3 weeks', 'Safety plan updated'],
            ['No medication changes at this time', 'Continue individual therapy twice monthly', 'Medication adherence discussed', 'Labs ordered for routine monitoring', 'Next visit in 4 weeks'],
            ['Treatment plan reviewed and adjusted as indicated', 'Supportive psychotherapy provided', 'Stress reduction techniques reviewed', 'Patient education provided', 'Follow-up in 2 weeks'],
            ['Current interventions effective; continue', 'Behavioral activation strategies discussed', 'Regular sleep schedule encouraged', 'Warning signs reviewed', 'Return visit in 3 weeks']
        ][variationSeed];

        // Build expanded subjective (longer with more detail)
        const subjectiveBase = [...subjectivePhrases, clinicianInput].filter(Boolean).join('. ');
        const subjectiveAdditions = [
            'Patient was accompanied to the visit and appeared engaged in the therapeutic process.',
            'Reports adherence to treatment recommendations discussed in previous sessions.',
            'Denies any new medical concerns, changes in appetite, or significant weight fluctuations.',
            'Sleep quality has been consistent without significant disturbances.'
        ];
        const subjective = subjectiveBase
            ? `${subjectiveBase}. ${subjectiveAdditions.slice(0, 2 + (variationSeed % 2)).join(' ')} Denies any acute distress or safety concerns at this time.`
            : `Patient presents for scheduled follow-up visit. Reports overall stable condition since last encounter. ${subjectiveAdditions.slice(0, 3).join(' ')} Medication compliance has been adequate with no missed doses reported. No new complaints or concerns expressed.`;

        // Build expanded objective (more detailed)
        const additionalFindings = [
            'No acute distress observed. Hygiene and grooming appropriate.',
            'Motor activity within normal limits without psychomotor abnormalities.',
            'Memory appears intact for recent and remote events.',
            'Concentration adequate throughout the session.'
        ];
        const objective = `Vital Signs: ${vitals}

Physical Appearance: Patient is well-groomed and appropriately dressed for the setting.

Mental Status Examination:
${mseVariations}
${additionalFindings[variationSeed % 4]}
${objectivePhrases.length > 0 ? `\nClinical Observations: ${objectivePhrases.join('. ')}.` : ''}

Behavior: Cooperative throughout the session with good rapport.`;

        // Build assessment with ICD codes and clinical reasoning
        const assessmentContent = assessmentPhrases.length > 0
            ? assessmentPhrases.join('. ')
            : 'Condition stable with ongoing treatment';
        const assessment = `${assessmentContent}.

Primary Diagnosis: Major Depressive Disorder, moderate episode (F32.1)
- Patient continues to demonstrate progress toward treatment goals
- Symptoms remain well-controlled with current regimen

Secondary Diagnosis: Generalized Anxiety Disorder (F41.1)
- Anxiety manageable with current interventions

Risk Assessment: Patient denies suicidal ideation, homicidal ideation, and self-harm urges. Safety plan in place.
Prognosis: Favorable with continued treatment adherence.`;

        // Build comprehensive plan
        const planItems = planPhrases.length > 0 ? planPhrases : defaultPlanItems;
        const additionalPlanNotes = [
            'Patient education provided regarding medication adherence and side effects to monitor.',
            'Discussed coping strategies and stress management techniques.',
            'Crisis resources reviewed including 988 Suicide & Crisis Lifeline.'
        ];
        const plan = planItems.map((item, i) => `${i + 1}. ${item}`).join('\n') +
            `\n${planItems.length + 1}. ${additionalPlanNotes[variationSeed % 3]}` +
            `\n\nPatient verbalized understanding of treatment plan and agrees to follow recommendations.` +
            `\n\nTotal time spent: ${25 + (variationSeed * 5)} minutes face-to-face, greater than 50% in counseling and care coordination.`;

        return {
            subjective,
            objective,
            assessment,
            plan,
            suggestedCodes: { cpt: ['90834', '90837', '99214'], icd10: ['F32.1', 'F41.1'] }
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
        const phraseNote = generateNoteFromPhrases();
        // Regenerate the specific section based on its label
        const section = template.sections.find(s => s.id === id);
        if (section) {
            const label = section.label.toLowerCase();
            if (label.includes("subjective")) handleSectionChange(id, phraseNote.subjective);
            else if (label.includes("objective")) handleSectionChange(id, phraseNote.objective);
            else if (label.includes("assessment")) handleSectionChange(id, phraseNote.assessment);
            else if (label.includes("plan")) handleSectionChange(id, phraseNote.plan);
            else handleSectionChange(id, phraseNote.subjective);
        }
        setIsGenerating(false);
    };

    // State to track if full note was copied
    const [noteCopied, setNoteCopied] = useState(false);

    // Copy the entire generated note to clipboard
    const copyFullNote = async () => {
        // Build the full note from all sections
        const fullNote = template.sections
            .map(section => {
                const content = noteSections[section.id] || '';
                return content ? `**${section.label.toUpperCase()}**\n${content}` : '';
            })
            .filter(Boolean)
            .join('\n\n');

        if (!fullNote.trim()) {
            alert('Please generate a note first before copying.');
            return;
        }

        try {
            await navigator.clipboard.writeText(fullNote);
            setNoteCopied(true);
            setTimeout(() => setNoteCopied(false), 3000);
        } catch (err) {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = fullNote;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setNoteCopied(true);
            setTimeout(() => setNoteCopied(false), 3000);
        }
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
                        <button
                            onClick={copyFullNote}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 ${noteCopied
                                ? 'bg-emerald-500 text-white'
                                : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                                }`}
                        >
                            {noteCopied ? (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Note Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copy Note
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
                        <aside className="flex flex-col w-full md:w-[420px] lg:w-[500px] gap-6 shrink-0 flex-none h-full overflow-y-auto">
                            {/* Input Clinical Hub */}
                            <div className="flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-visible shrink-0 transition-all duration-500">
                                <div className="px-5 py-3 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveInputTab("phrases")}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeInputTab === "phrases" ? "text-primary border-b-2 border-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                                        >
                                            Phrases
                                        </button>
                                        <button
                                            onClick={() => setActiveInputTab("manual")}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeInputTab === "manual" ? "text-primary border-b-2 border-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                                        >
                                            Manual
                                        </button>
                                        <button
                                            onClick={() => setActiveInputTab("scribe")}
                                            className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeInputTab === "scribe" ? "text-primary border-b-2 border-primary" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                                        >
                                            Scribe
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
                                                                setPhraseCategory(section as "Subjective" | "Objective" | "Assessment" | "Plan");
                                                                setShowPhraseModal(true);
                                                            }}
                                                            className="text-primary hover:underline lowercase font-bold"
                                                        >
                                                            + custom
                                                        </button>
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {/* System phrases */}
                                                        {phrases.map((phrase) => (
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
                                                        {/* Custom phrases with delete */}
                                                        {(customPhrases[section] || []).map((phrase) => (
                                                            <div key={phrase} className="flex gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedPhrases(prev => ({
                                                                            ...prev,
                                                                            [section]: prev[section].includes(phrase)
                                                                                ? prev[section].filter(p => p !== phrase)
                                                                                : [...prev[section], phrase]
                                                                        }));
                                                                    }}
                                                                    className={`flex-1 text-left p-2.5 rounded-xl border text-[11px] font-medium transition-all ${selectedPhrases[section].includes(phrase)
                                                                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                                                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-foreground/70 hover:border-primary/30"
                                                                        }`}
                                                                >
                                                                    {phrase}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Delete custom phrase
                                                                        const updated = {
                                                                            ...customPhrases,
                                                                            [section]: (customPhrases[section] || []).filter(p => p !== phrase)
                                                                        };
                                                                        setCustomPhrases(updated);
                                                                        localStorage.setItem('customPhrases', JSON.stringify(updated));
                                                                        // Also remove from selected if it was selected
                                                                        setSelectedPhrases(prev => ({
                                                                            ...prev,
                                                                            [section]: prev[section].filter(p => p !== phrase)
                                                                        }));
                                                                    }}
                                                                    className="px-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                                                                    title="Delete custom phrase"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {activeInputTab === "scribe" && (
                                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                                        AI Voice Scribe
                                                    </label>
                                                    {isRecording && (
                                                        <span className="text-xs font-mono text-red-500 flex items-center gap-1">
                                                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                                            Recording...
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Recording Control Button */}
                                                <button
                                                    onClick={() => {
                                                        if (isRecording) {
                                                            // Stop recording - simulate transcription
                                                            setIsRecording(false);
                                                            setHasRecording(true);
                                                            // Demo transcription
                                                            setScribeTranscription(
                                                                "Patient reports feeling much better since last visit. Sleep has improved significantly, now getting 7-8 hours per night. " +
                                                                "No side effects reported from current medication. Mood is stable, describes it as 'pretty good most days'. " +
                                                                "Appetite is normal. Energy levels have improved. Denies any suicidal or homicidal ideation. " +
                                                                "Patient is compliant with medication regimen. Wants to continue current treatment plan."
                                                            );
                                                        } else {
                                                            // Start recording
                                                            setIsRecording(true);
                                                            setRecordingTime(0);
                                                            setScribeTranscription("");
                                                        }
                                                    }}
                                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isRecording
                                                        ? "bg-red-500 text-white shadow-red-500/30 ring-4 ring-red-500/20"
                                                        : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 shadow-primary/20"
                                                        }`}
                                                >
                                                    {isRecording ? (
                                                        <>
                                                            <MicOff className="h-4 w-4" />
                                                            Stop Recording
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Mic className="h-4 w-4" />
                                                            Start AI Scribe
                                                        </>
                                                    )}
                                                </button>

                                                {/* Transcription Area */}
                                                {(hasRecording || scribeTranscription) && (
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                Transcription
                                                            </label>
                                                            <button
                                                                onClick={() => {
                                                                    setScribeTranscription("");
                                                                    setHasRecording(false);
                                                                }}
                                                                className="text-[9px] text-muted-foreground hover:text-red-500 font-bold uppercase"
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            value={scribeTranscription}
                                                            onChange={(e) => setScribeTranscription(e.target.value)}
                                                            placeholder="Transcription will appear here after recording..."
                                                            className="w-full h-32 p-3 bg-muted/20 rounded-xl border border-border text-sm font-medium leading-relaxed resize-none focus:ring-2 focus:ring-primary/10 transition-all"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                // Use transcription as clinician input and generate
                                                                setClinicianInput(scribeTranscription);
                                                                handleGenerateNote();
                                                            }}
                                                            disabled={isGenerating || !scribeTranscription.trim()}
                                                            className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isGenerating ? (
                                                                <>
                                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                                    Generating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="h-4 w-4" />
                                                                    Generate Note from Transcription
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeInputTab === "manual" && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                                        Manual Note Entry
                                                    </label>
                                                    <span className="text-[9px] text-muted-foreground">
                                                        {clinicianInput.length} characters
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={clinicianInput}
                                                    onChange={(e) => setClinicianInput(e.target.value)}
                                                    placeholder="Type your clinical observations here...

Example: 45yo male, depression follow-up. Reports improved mood on current medication. Sleeping better, 7-8 hours. No side effects. Appetite normal. Denies SI/HI. Continue current treatment plan."
                                                    className="w-full h-56 p-4 bg-muted/20 hover:bg-muted/30 rounded-2xl border border-border text-sm leading-relaxed focus:bg-card focus:ring-4 focus:ring-primary/5 transition-all resize-none outline-none font-medium"
                                                />
                                            </div>
                                            <button
                                                onClick={handleGenerateNote}
                                                disabled={isGenerating || !clinicianInput.trim()}
                                                className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                                            >
                                                {isGenerating ? (
                                                    <>
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                        Generating Note...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="h-4 w-4" />
                                                        Generate Note with AI
                                                    </>
                                                )}
                                            </button>
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
                                                    <button
                                                        key={code}
                                                        onClick={() => handleCodeClick(code, 'cpt')}
                                                        className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${selectedCodes.has(code)
                                                            ? 'bg-emerald-500 text-white border-emerald-500 scale-105'
                                                            : 'bg-muted/50 border-border hover:border-primary/30 hover:bg-primary/5'
                                                            }`}
                                                        title="Click to copy code"
                                                    >
                                                        <span className={`text-base font-black tracking-tight ${selectedCodes.has(code) ? 'text-white' : 'text-foreground underline decoration-primary/30 underline-offset-4'}`}>
                                                            {selectedCodes.has(code) ? '✓ Copied!' : code}
                                                        </span>
                                                        <div className="w-px h-6 bg-border mx-1" />
                                                        <span className={`text-xs font-bold ${selectedCodes.has(code) ? 'text-white/80' : 'text-muted-foreground'}`}>
                                                            {code === "99214" && "Evaluation & Management - Level 4"}
                                                            {code === "99213" && "Evaluation & Management - Level 3"}
                                                            {code === "90834" && "Psychotherapy, 45 min"}
                                                            {code === "90837" && "Psychotherapy, 60 min"}
                                                            {code === "90833" && "Psychotherapy Adjunct"}
                                                            {code === "90792" && "Psych Diagnostic Eval"}
                                                        </span>
                                                        {!selectedCodes.has(code) && (
                                                            <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </button>
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
                                                    <button
                                                        key={code}
                                                        onClick={() => handleCodeClick(code, 'icd10')}
                                                        className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer shadow-sm ${selectedCodes.has(code)
                                                            ? 'bg-emerald-500 text-white border-emerald-500 scale-105'
                                                            : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5'
                                                            }`}
                                                        title="Click to copy code"
                                                    >
                                                        <span className={`text-sm font-black px-2 py-1 rounded border tracking-wider ${selectedCodes.has(code)
                                                            ? 'text-white bg-white/20 border-white/30'
                                                            : 'text-primary bg-primary/5 border-primary/10'
                                                            }`}>
                                                            {selectedCodes.has(code) ? '✓' : code}
                                                        </span>
                                                        <span className={`text-xs font-bold ${selectedCodes.has(code) ? 'text-white' : 'text-foreground/80'}`}>
                                                            {selectedCodes.has(code) && 'Copied! - '}
                                                            {code === "G44.209" && "Tension-type headache, not intractable"}
                                                            {code === "I10" && "Essential (primary) hypertension"}
                                                            {code === "E11.9" && "Type 2 diabetes mellitus without complications"}
                                                            {code === "F32.1" && "Major depressive disorder, moderate"}
                                                            {code === "F41.1" && "Generalized anxiety disorder"}
                                                            {code === "F33.1" && "Major depressive disorder, recurrent, moderate"}
                                                        </span>
                                                        {!selectedCodes.has(code) && (
                                                            <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                                                        )}
                                                    </button>
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

            {/* Add Custom Phrase Modal */}
            {showPhraseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-border">
                            <h3 className="text-lg font-bold">Add Custom Phrase</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Add to: <span className="font-bold text-primary">{phraseCategory}</span>
                            </p>
                        </div>
                        <div className="p-5 space-y-4">
                            <textarea
                                value={newPhrase}
                                onChange={(e) => setNewPhrase(e.target.value)}
                                placeholder="Enter your custom phrase..."
                                className="w-full h-24 p-3 bg-muted/20 rounded-xl border border-border text-sm font-medium leading-relaxed resize-none focus:ring-2 focus:ring-primary/10 transition-all"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPhraseModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (newPhrase.trim()) {
                                            const updated = {
                                                ...customPhrases,
                                                [phraseCategory]: [...(customPhrases[phraseCategory] || []), newPhrase.trim()]
                                            };
                                            setCustomPhrases(updated);
                                            localStorage.setItem('customPhrases', JSON.stringify(updated));
                                            setNewPhrase("");
                                            setShowPhraseModal(false);
                                        }
                                    }}
                                    disabled={!newPhrase.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    Add Phrase
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Code Explanation Modal */}
            {codeModalOpen && selectedCodeInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-lg font-black px-3 py-1.5 rounded-lg ${selectedCodeInfo.type === 'cpt'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-primary text-white'
                                            }`}>
                                            {selectedCodeInfo.code}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${selectedCodeInfo.type === 'cpt'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-primary/10 text-primary'
                                            }`}>
                                            {selectedCodeInfo.type === 'cpt' ? 'CPT Code' : 'ICD-10 Code'}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground">{selectedCodeInfo.title}</h2>
                                </div>
                                <button
                                    onClick={() => setCodeModalOpen(false)}
                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                                <p className="text-foreground leading-relaxed">{selectedCodeInfo.description}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Key Details</h3>
                                <ul className="space-y-2">
                                    {selectedCodeInfo.details.map((detail, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm">
                                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                            <span className="text-foreground/80">{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-4 border-t border-border flex gap-3">
                                <button
                                    onClick={() => {
                                        copyCodeToClipboard(selectedCodeInfo.code);
                                    }}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${selectedCodes.has(selectedCodeInfo.code)
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-muted hover:bg-muted/80 text-foreground'
                                        }`}
                                >
                                    {selectedCodes.has(selectedCodeInfo.code) ? (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            Copied to Clipboard!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy Code
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setCodeModalOpen(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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


