"use client";

import { useState } from "react";
import {
    BookOpen,
    Brain,
    AlertTriangle,
    Heart,
    Pill,
    FileText,
    Search,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    X,
    CheckCircle,
    ClipboardList,
} from "lucide-react";

// Assessment questions/content for interactive modals
const assessmentContent: Record<string, {
    questions?: { id: string; text: string; options?: { label: string; score: number }[] }[];
    instructions?: string;
    interpretation?: string[];
}> = {
    "Mini-Mental State Examination (MMSE)": {
        instructions: "Ask each question and score based on patient response. Maximum score is 30 points.",
        questions: [
            { id: "orientation-time", text: "Orientation to Time (5 pts): What is the year, season, date, day, month?", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }, { label: "4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "orientation-place", text: "Orientation to Place (5 pts): What is the state, county, town, building, floor?", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }, { label: "4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "registration", text: "Registration (3 pts): Name 3 objects, have patient repeat all 3", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }] },
            { id: "attention", text: "Attention (5 pts): Spell 'WORLD' backwards or serial 7s", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }, { label: "4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "recall", text: "Recall (3 pts): Recall the 3 objects from earlier", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }] },
            { id: "language", text: "Language/Praxis (9 pts): Naming, repetition, 3-stage command, reading, writing, copying", options: [{ label: "0-3 pts", score: 2 }, { label: "4-6 pts", score: 5 }, { label: "7-9 pts", score: 9 }] },
        ],
        interpretation: ["24-30: Normal cognition", "19-23: Mild cognitive impairment", "10-18: Moderate cognitive impairment", "<10: Severe cognitive impairment"],
    },
    "Montreal Cognitive Assessment (MoCA)": {
        instructions: "Administer all sections. Maximum score is 30 points. Add 1 point if ≤12 years education.",
        questions: [
            { id: "visuospatial", text: "Visuospatial/Executive (5 pts): Trail making, cube copy, clock drawing", options: [{ label: "0 pts", score: 0 }, { label: "1-2 pts", score: 2 }, { label: "3-4 pts", score: 4 }, { label: "5 pts", score: 5 }] },
            { id: "naming", text: "Naming (3 pts): Lion, rhinoceros, camel", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }, { label: "3 correct", score: 3 }] },
            { id: "memory", text: "Memory: Read list of 5 words, patient repeats (no points, for delayed recall)", options: [{ label: "Done", score: 0 }] },
            { id: "attention", text: "Attention (6 pts): Digit span, vigilance, serial 7s", options: [{ label: "0-2 pts", score: 1 }, { label: "3-4 pts", score: 4 }, { label: "5-6 pts", score: 6 }] },
            { id: "language", text: "Language (3 pts): Sentence repetition (2), verbal fluency (1)", options: [{ label: "0 pts", score: 0 }, { label: "1-2 pts", score: 2 }, { label: "3 pts", score: 3 }] },
            { id: "abstraction", text: "Abstraction (2 pts): Similarities (train-bicycle, watch-ruler)", options: [{ label: "0 correct", score: 0 }, { label: "1 correct", score: 1 }, { label: "2 correct", score: 2 }] },
            { id: "delayed-recall", text: "Delayed Recall (5 pts): Recall the 5 words from memory section", options: [{ label: "0 correct", score: 0 }, { label: "1-2 correct", score: 2 }, { label: "3-4 correct", score: 4 }, { label: "5 correct", score: 5 }] },
            { id: "orientation", text: "Orientation (6 pts): Date, month, year, day, place, city", options: [{ label: "0-2 correct", score: 1 }, { label: "3-4 correct", score: 4 }, { label: "5-6 correct", score: 6 }] },
        ],
        interpretation: ["26+: Normal cognition", "18-25: Mild cognitive impairment", "<18: Significant cognitive impairment"],
    },
    "Geriatric Depression Scale-15 (GDS-15)": {
        instructions: "Ask the patient to answer YES or NO to each question, referring to how they have felt over the past week.",
        questions: [
            { id: "q1", text: "1. Are you basically satisfied with your life?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q2", text: "2. Have you dropped many of your activities and interests?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q3", text: "3. Do you feel that your life is empty?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q4", text: "4. Do you often get bored?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q5", text: "5. Are you in good spirits most of the time?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q6", text: "6. Are you afraid that something bad is going to happen to you?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q7", text: "7. Do you feel happy most of the time?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q8", text: "8. Do you often feel helpless?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q9", text: "9. Do you prefer to stay at home rather than going out?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q10", text: "10. Do you feel you have more problems with memory than most?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q11", text: "11. Do you think it is wonderful to be alive now?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q12", text: "12. Do you feel pretty worthless the way you are now?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q13", text: "13. Do you feel full of energy?", options: [{ label: "Yes", score: 0 }, { label: "No", score: 1 }] },
            { id: "q14", text: "14. Do you feel that your situation is hopeless?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
            { id: "q15", text: "15. Do you think that most people are better off than you?", options: [{ label: "Yes", score: 1 }, { label: "No", score: 0 }] },
        ],
        interpretation: ["0-4: Normal", "5-9: Mild depression", "10-15: Moderate to severe depression"],
    },
    "Timed Up and Go (TUG)": {
        instructions: "Patient sits in a standard arm chair. On 'Go', patient stands, walks 3 meters (10 feet), turns, walks back, and sits down. Time with stopwatch.",
        questions: [
            { id: "time", text: "Time to complete (seconds):", options: [{ label: "< 10 seconds", score: 0 }, { label: "10-14 seconds", score: 1 }, { label: "15-20 seconds", score: 2 }, { label: "> 20 seconds", score: 3 }] },
            { id: "assistive", text: "Assistive device used?", options: [{ label: "None", score: 0 }, { label: "Cane", score: 1 }, { label: "Walker", score: 2 }] },
            { id: "unsteady", text: "Appeared unsteady during test?", options: [{ label: "No", score: 0 }, { label: "Slightly", score: 1 }, { label: "Yes, significant", score: 2 }] },
        ],
        interpretation: ["<10 sec: Normal mobility", "10-20 sec: Borderline, may have some mobility issues", ">20 sec: High fall risk, requires further evaluation", ">30 sec: Dependent mobility"],
    },
    "Katz Index of Independence in ADL": {
        instructions: "Score each activity. 1 point for independence, 0 for dependence.",
        questions: [
            { id: "bathing", text: "Bathing: Bathes self completely or needs help only with single body part", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "dressing", text: "Dressing: Gets clothes and dresses without assistance", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "toileting", text: "Toileting: Goes to toilet, uses it, arranges clothes without help", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "transferring", text: "Transferring: Moves in/out of bed and chair without assistance", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "continence", text: "Continence: Controls bladder and bowel completely", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
            { id: "feeding", text: "Feeding: Gets food from plate to mouth without help", options: [{ label: "Independent", score: 1 }, { label: "Dependent", score: 0 }] },
        ],
        interpretation: ["6: Full function", "4-5: Moderate impairment", "2-3: Severe impairment", "0-1: Very severe impairment"],
    },
    "PHQ-9": {
        instructions: "Over the last 2 weeks, how often have you been bothered by the following problems?",
        questions: [
            { id: "q1", text: "1. Little interest or pleasure in doing things", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q2", text: "2. Feeling down, depressed, or hopeless", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q3", text: "3. Trouble falling/staying asleep, or sleeping too much", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q4", text: "4. Feeling tired or having little energy", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q5", text: "5. Poor appetite or overeating", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q6", text: "6. Feeling bad about yourself — or that you're a failure", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q7", text: "7. Trouble concentrating on things", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q8", text: "8. Moving or speaking slowly / being fidgety or restless", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
            { id: "q9", text: "9. Thoughts of self-harm or being better off dead", options: [{ label: "Not at all", score: 0 }, { label: "Several days", score: 1 }, { label: "More than half the days", score: 2 }, { label: "Nearly every day", score: 3 }] },
        ],
        interpretation: ["0-4: Minimal depression", "5-9: Mild depression", "10-14: Moderate depression", "15-19: Moderately severe depression", "20-27: Severe depression"],
    },
};

// Geriatric reference data
const referenceCategories = [
    {
        id: "cognitive",
        title: "Cognitive Assessments",
        icon: Brain,
        color: "purple",
        items: [
            { title: "Mini-Mental State Examination (MMSE)", description: "30-point questionnaire for cognitive impairment screening", scoring: "24-30 = Normal, 19-23 = Mild, 10-18 = Moderate, <10 = Severe", link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3532551/", hasAssessment: true },
            { title: "Montreal Cognitive Assessment (MoCA)", description: "Detects mild cognitive impairment, more sensitive than MMSE", scoring: "26+ = Normal, 18-25 = MCI, <18 = Significant impairment", link: "https://www.mocatest.org/", hasAssessment: true },
            { title: "Clock Drawing Test", description: "Quick screening for visuospatial and executive function", scoring: "4-point scale: 4 = Normal, <3 = Impairment suspected", link: null, hasAssessment: false },
            { title: "Mini-Cog", description: "3-minute dementia screening combining word recall and clock draw", scoring: "0-2 = High dementia risk, 3-5 = Lower risk", link: "https://mini-cog.com/", hasAssessment: false },
        ],
    },
    {
        id: "depression",
        title: "Depression Screening",
        icon: Heart,
        color: "pink",
        items: [
            { title: "Geriatric Depression Scale-15 (GDS-15)", description: "Self-report measure designed for older adults", scoring: "0-4 = Normal, 5-9 = Mild, 10-15 = Moderate/Severe", link: "https://web.stanford.edu/~yesavage/GDS.html", hasAssessment: true },
            { title: "PHQ-9", description: "9-item depression severity measure", scoring: "0-4 = Minimal, 5-9 = Mild, 10-14 = Moderate, 15-19 = Mod-Severe, 20+ = Severe", link: "https://www.phqscreeners.com/", hasAssessment: true },
            { title: "Cornell Scale for Depression in Dementia", description: "Depression assessment for patients with cognitive impairment", scoring: "Clinician-administered, considers caregiver input", link: null, hasAssessment: false },
        ],
    },
    {
        id: "fall-risk",
        title: "Fall Risk Assessment",
        icon: AlertTriangle,
        color: "amber",
        items: [
            { title: "Timed Up and Go (TUG)", description: "Measures mobility and fall risk", scoring: "<10s = Normal, 10-20s = Borderline, >20s = High risk", link: null, hasAssessment: true },
            { title: "Berg Balance Scale", description: "14-item objective measure of balance ability", scoring: "45-56 = Low risk, 21-44 = Medium, 0-20 = High fall risk", link: null, hasAssessment: false },
            { title: "STEADI Algorithm (CDC)", description: "Stopping Elderly Accidents, Deaths & Injuries toolkit", scoring: "Comprehensive fall prevention protocol", link: "https://www.cdc.gov/steadi/", hasAssessment: false },
            { title: "Morse Fall Scale", description: "Quick assessment for hospital/nursing home settings", scoring: "0-24 = Low, 25-44 = Moderate, 45+ = High risk", link: null, hasAssessment: false },
        ],
    },
    {
        id: "functional",
        title: "Functional Status",
        icon: FileText,
        color: "teal",
        items: [
            { title: "Katz Index of Independence in ADL", description: "Basic Activities of Daily Living assessment", scoring: "6 = Full function, 4 = Moderate, 2 or less = Severe impairment", link: null, hasAssessment: true },
            { title: "Lawton IADL Scale", description: "Instrumental Activities of Daily Living", scoring: "8 = High function, 0 = Low function (gender-adjusted)", link: null, hasAssessment: false },
            { title: "Barthel Index", description: "ADL and mobility assessment, 10 items", scoring: "80-100 = Independent, 60-79 = Minimal assistance, <60 = Dependent", link: null, hasAssessment: false },
        ],
    },
    {
        id: "medications",
        title: "Medication Safety",
        icon: Pill,
        color: "red",
        items: [
            { title: "Beers Criteria", description: "Potentially inappropriate medications for older adults", scoring: "Updated 2023 by American Geriatrics Society", link: "https://geriatricscareonline.org/ProductAbstract/american-geriatrics-society-beers-criteria-2023-update/CL001", hasAssessment: false },
            { title: "STOPP/START Criteria", description: "European screening tool for medication review", scoring: "STOPP = Meds to avoid, START = Meds to consider", link: null, hasAssessment: false },
            { title: "Anticholinergic Burden Scale", description: "Risk scoring for anticholinergic medications", scoring: "Score 3+ indicates significant cognitive risk", link: null, hasAssessment: false },
            { title: "High-Risk Fall Medications", description: "Medications associated with increased fall risk", scoring: "Sedatives, antihypertensives, opioids, antidepressants", link: null, hasAssessment: false },
        ],
    },
];

const geriatricCodes = [
    { code: "G0438", description: "Initial Annual Wellness Visit (IAWV)" },
    { code: "G0439", description: "Subsequent Annual Wellness Visit" },
    { code: "99483", description: "Cognitive Assessment and Care Plan" },
    { code: "99490", description: "Chronic Care Management (20+ min)" },
    { code: "99491", description: "CCM by Clinical Staff (30+ min)" },
    { code: "99487", description: "Complex CCM (60+ min)" },
    { code: "96116", description: "Neurobehavioral Status Exam" },
    { code: "96132", description: "Neuropsychological Testing Eval" },
    { code: "G2211", description: "Complexity Add-on (Primary Care)" },
    { code: "99497", description: "Advance Care Planning (first 30 min)" },
    { code: "99498", description: "Advance Care Planning (each add'l 30 min)" },
];

export default function GeriatricReferencesPage() {
    const [expandedCategory, setExpandedCategory] = useState<string | null>("cognitive");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [showResults, setShowResults] = useState(false);

    const filteredCategories = referenceCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0);

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            purple: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
            pink: { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800" },
            amber: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
            teal: { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-800" },
            red: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
        };
        return colors[color] || colors.purple;
    };

    const openAssessment = (title: string) => {
        if (assessmentContent[title]) {
            setSelectedAssessment(title);
            setAnswers({});
            setShowResults(false);
        }
    };

    const calculateScore = () => {
        return Object.values(answers).reduce((sum, score) => sum + score, 0);
    };

    const getInterpretation = (score: number, interpretations: string[]) => {
        for (const interp of interpretations) {
            const match = interp.match(/^(\d+)-?(\d*)\s*:?\s*(.*)/);
            if (match) {
                const min = parseInt(match[1]);
                const max = match[2] ? parseInt(match[2]) : min;
                if (score >= min && score <= max) return interp;
            }
            if (interp.startsWith("<") || interp.startsWith(">")) {
                const numMatch = interp.match(/[<>]=?\s*(\d+)/);
                if (numMatch) {
                    const threshold = parseInt(numMatch[1]);
                    if (interp.includes("<") && score < threshold) return interp;
                    if (interp.includes(">") && score > threshold) return interp;
                }
            }
        }
        return interpretations[interpretations.length - 1];
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                Geriatric Care References
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">
                                Clinical tools, scoring guides, and billing codes for geriatric care
                            </p>
                        </div>
                    </div>
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search assessments and tools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - Assessment Tools */}
                    <div className="lg:col-span-2 space-y-4">
                        {(searchQuery ? filteredCategories : referenceCategories).map((category) => {
                            const colors = getColorClasses(category.color);
                            const Icon = category.icon;
                            const isExpanded = expandedCategory === category.id;

                            return (
                                <div
                                    key={category.id}
                                    className={`bg-white dark:bg-slate-900 rounded-2xl border ${colors.border} overflow-hidden`}
                                >
                                    <button
                                        onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                                <Icon className={`h-5 w-5 ${colors.text}`} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-slate-900 dark:text-white">{category.title}</h3>
                                                <p className="text-xs text-slate-500">{category.items.length} tools</p>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-slate-400" />
                                        )}
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-4">
                                            {category.items.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => item.hasAssessment && openAssessment(item.title)}
                                                    className={`p-4 bg-slate-50 dark:bg-slate-800 rounded-xl ${item.hasAssessment ? 'cursor-pointer hover:ring-2 hover:ring-teal-500 transition-all' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900 dark:text-white">
                                                                {item.title}
                                                            </h4>
                                                            {item.hasAssessment && (
                                                                <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-[10px] font-bold rounded-full uppercase">
                                                                    Interactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.link && (
                                                            <a
                                                                href={item.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={`p-1 rounded ${colors.text} hover:${colors.bg}`}
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                                        {item.description}
                                                    </p>
                                                    <div className={`px-3 py-2 rounded-lg ${colors.bg} ${colors.text} text-sm font-medium`}>
                                                        {item.scoring}
                                                    </div>
                                                    {item.hasAssessment && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openAssessment(item.title); }}
                                                            className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <ClipboardList className="h-4 w-4" />
                                                            Start Assessment
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Sidebar - Billing Codes */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-teal-600" />
                                Geriatric CPT Codes
                            </h3>
                            <div className="space-y-3">
                                {geriatricCodes.map((code) => (
                                    <div key={code.code} className="flex items-start gap-3">
                                        <span className="px-2 py-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-xs font-mono font-bold rounded">
                                            {code.code}
                                        </span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                            {code.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-white">
                            <h3 className="font-bold mb-2">Quick Tip</h3>
                            <p className="text-sm opacity-90">
                                Use <strong>G2211</strong> complexity add-on code when providing
                                longitudinal care for patients with chronic conditions requiring
                                care coordination.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assessment Modal */}
            {selectedAssessment && assessmentContent[selectedAssessment] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-teal-50 dark:bg-teal-900/20">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                    <ClipboardList className="h-5 w-5 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">{selectedAssessment}</h2>
                                    <p className="text-xs text-slate-500">Interactive Assessment</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAssessment(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {assessmentContent[selectedAssessment].instructions && (
                                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong>Instructions:</strong> {assessmentContent[selectedAssessment].instructions}
                                    </p>
                                </div>
                            )}

                            {!showResults ? (
                                <div className="space-y-6">
                                    {assessmentContent[selectedAssessment].questions?.map((q, idx) => (
                                        <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <p className="font-medium text-slate-900 dark:text-white mb-3">{q.text}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {q.options?.map((opt) => (
                                                    <button
                                                        key={opt.label}
                                                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.score }))}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${answers[q.id] === opt.score
                                                                ? 'bg-teal-600 text-white'
                                                                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-teal-500'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="h-20 w-20 mx-auto rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mb-4">
                                        <CheckCircle className="h-10 w-10 text-teal-600" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                        Score: {calculateScore()}
                                    </h3>
                                    <p className="text-lg text-teal-600 dark:text-teal-400 font-medium mb-6">
                                        {getInterpretation(calculateScore(), assessmentContent[selectedAssessment].interpretation || [])}
                                    </p>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-2">Interpretation Guide:</h4>
                                        <ul className="space-y-1">
                                            {assessmentContent[selectedAssessment].interpretation?.map((interp, idx) => (
                                                <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">• {interp}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                            <button
                                onClick={() => { setAnswers({}); setShowResults(false); }}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Reset
                            </button>
                            {!showResults ? (
                                <button
                                    onClick={() => setShowResults(true)}
                                    disabled={Object.keys(answers).length === 0}
                                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    Calculate Score
                                </button>
                            ) : (
                                <button
                                    onClick={() => setSelectedAssessment(null)}
                                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

