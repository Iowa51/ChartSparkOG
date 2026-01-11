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
} from "lucide-react";

// Geriatric reference data
const referenceCategories = [
    {
        id: "cognitive",
        title: "Cognitive Assessments",
        icon: Brain,
        color: "purple",
        items: [
            {
                title: "Mini-Mental State Examination (MMSE)",
                description: "30-point questionnaire for cognitive impairment screening",
                scoring: "24-30 = Normal, 19-23 = Mild, 10-18 = Moderate, <10 = Severe",
                link: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3532551/",
            },
            {
                title: "Montreal Cognitive Assessment (MoCA)",
                description: "Detects mild cognitive impairment, more sensitive than MMSE",
                scoring: "26+ = Normal, 18-25 = MCI, <18 = Significant impairment",
                link: "https://www.mocatest.org/",
            },
            {
                title: "Clock Drawing Test",
                description: "Quick screening for visuospatial and executive function",
                scoring: "4-point scale: 4 = Normal, <3 = Impairment suspected",
                link: null,
            },
            {
                title: "Mini-Cog",
                description: "3-minute dementia screening combining word recall and clock draw",
                scoring: "0-2 = High dementia risk, 3-5 = Lower risk",
                link: "https://mini-cog.com/",
            },
        ],
    },
    {
        id: "depression",
        title: "Depression Screening",
        icon: Heart,
        color: "pink",
        items: [
            {
                title: "Geriatric Depression Scale-15 (GDS-15)",
                description: "Self-report measure designed for older adults",
                scoring: "0-4 = Normal, 5-9 = Mild, 10-15 = Moderate/Severe",
                link: "https://web.stanford.edu/~yesavage/GDS.html",
            },
            {
                title: "PHQ-9",
                description: "9-item depression severity measure",
                scoring: "0-4 = Minimal, 5-9 = Mild, 10-14 = Moderate, 15-19 = Mod-Severe, 20+ = Severe",
                link: "https://www.phqscreeners.com/",
            },
            {
                title: "Cornell Scale for Depression in Dementia",
                description: "Depression assessment for patients with cognitive impairment",
                scoring: "Clinician-administered, considers caregiver input",
                link: null,
            },
        ],
    },
    {
        id: "fall-risk",
        title: "Fall Risk Assessment",
        icon: AlertTriangle,
        color: "amber",
        items: [
            {
                title: "Timed Up and Go (TUG)",
                description: "Measures mobility and fall risk",
                scoring: "<10s = Normal, 10-20s = Borderline, >20s = High risk",
                link: null,
            },
            {
                title: "Berg Balance Scale",
                description: "14-item objective measure of balance ability",
                scoring: "45-56 = Low risk, 21-44 = Medium, 0-20 = High fall risk",
                link: null,
            },
            {
                title: "STEADI Algorithm (CDC)",
                description: "Stopping Elderly Accidents, Deaths & Injuries toolkit",
                scoring: "Comprehensive fall prevention protocol",
                link: "https://www.cdc.gov/steadi/",
            },
            {
                title: "Morse Fall Scale",
                description: "Quick assessment for hospital/nursing home settings",
                scoring: "0-24 = Low, 25-44 = Moderate, 45+ = High risk",
                link: null,
            },
        ],
    },
    {
        id: "functional",
        title: "Functional Status",
        icon: FileText,
        color: "teal",
        items: [
            {
                title: "Katz Index of Independence in ADL",
                description: "Basic Activities of Daily Living assessment",
                scoring: "6 = Full function, 4 = Moderate, 2 or less = Severe impairment",
                link: null,
            },
            {
                title: "Lawton IADL Scale",
                description: "Instrumental Activities of Daily Living",
                scoring: "8 = High function, 0 = Low function (gender-adjusted)",
                link: null,
            },
            {
                title: "Barthel Index",
                description: "ADL and mobility assessment, 10 items",
                scoring: "80-100 = Independent, 60-79 = Minimal assistance, <60 = Dependent",
                link: null,
            },
        ],
    },
    {
        id: "medications",
        title: "Medication Safety",
        icon: Pill,
        color: "red",
        items: [
            {
                title: "Beers Criteria",
                description: "Potentially inappropriate medications for older adults",
                scoring: "Updated 2023 by American Geriatrics Society",
                link: "https://geriatricscareonline.org/ProductAbstract/american-geriatrics-society-beers-criteria-2023-update/CL001",
            },
            {
                title: "STOPP/START Criteria",
                description: "European screening tool for medication review",
                scoring: "STOPP = Meds to avoid, START = Meds to consider",
                link: null,
            },
            {
                title: "Anticholinergic Burden Scale",
                description: "Risk scoring for anticholinergic medications",
                scoring: "Score 3+ indicates significant cognitive risk",
                link: null,
            },
            {
                title: "High-Risk Fall Medications",
                description: "Medications associated with increased fall risk",
                scoring: "Sedatives, antihypertensives, opioids, antidepressants",
                link: null,
            },
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
                                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">
                                                            {item.title}
                                                        </h4>
                                                        {item.link && (
                                                            <a
                                                                href={item.link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
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
        </div>
    );
}
