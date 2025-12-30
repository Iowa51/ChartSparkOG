"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/layout";
import { Search, BookOpen, Pill, AlertTriangle, FileText, ExternalLink, X, ChevronRight, Info, Sparkles } from "lucide-react";

const referenceCategories = [
    {
        id: "drug-interactions",
        title: "Drug Interactions",
        description: "Check for potential medication interactions and contraindications",
        icon: Pill,
        color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        items: [
            { name: "Cytochrome P450 Interactions", details: "Major CYP3A4 inhibitors include ketoconazole, clarithromycin, and ritonavir. Induction by carbamazapine or rifampin can significantly lower psychotropic levels." },
            { name: "Serotonin Syndrome Risk", details: "Monitor for triad of mental status changes, autonomic hyperactivity, and neuromuscular abnormalities when combining SSRIs, SNRIs, MAOIs, or TCAs." },
            { name: "QT Prolongation", details: "Medications like citalopram, ziprasidone, and thioridazine require baseline EKG and ongoing monitoring for QTc >450ms (men) or >470ms (women)." }
        ],
    },
    {
        id: "clinical-guidelines",
        title: "Clinical Guidelines",
        description: "Evidence-based treatment protocols and best practices",
        icon: FileText,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        items: [
            { name: "APA Practice Guidelines", details: "Current standards for MDD, Bipolar Disorder, Schizophrenia, and Substance Use Disorders. Focus on measurement-based care." },
            { name: "CANMAT Guidelines", details: "Evidence-based recommendations for the management of adults with major depressive disorder and bipolar disorder." },
            { name: "Maudsley Prescribing Guidelines", details: "Gold standard for complex prescribing, switching, and tapering protocols in psychiatry." }
        ],
    },
    {
        id: "safety-alerts",
        title: "Safety Alerts",
        description: "FDA warnings, black box notifications, and safety updates",
        icon: AlertTriangle,
        color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        items: [
            { name: "FDA Black Box Warnings", details: "Suicidality in children/young adults (Antidepressants), Mortality in elderly patients with dementia (Antipsychotics), and Agranulocytosis (Clozapine)." },
            { name: "REMS Programs", details: "Clozapine Patient Management System, Spravato (Esketamine) monitoring protocol, and isotretinoin (iPledge)." },
            { name: "Drug Recalls", details: "Recent recalls regarding NDMA impurities in metformin and ranitidine formulations." }
        ],
    },
    {
        id: "dosing-guides",
        title: "Dosing Guides",
        description: "Medication dosing recommendations and titration schedules",
        icon: BookOpen,
        color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        items: [
            { name: "Psychotropic Dosing", details: "Starting, therapeutic, and maximum doses for common classes. Adult and geriatric titration variations." },
            { name: "Renal Adjustments", details: "Lithium, Gabapentin, and Topiramate require significant dose reductions for eGFR <60." },
            { name: "Hepatic Adjustments", details: "Valproate and Duloxetine should be avoided in severe hepatic impairment." }
        ],
    },
];

export default function ReferencesPage() {
    const [selectedItem, setSelectedItem] = useState<{ category: string, item: string, details: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCategories = referenceCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(i =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Clinical Reference Suite"
                description="Evidence-based resources, drug intelligence, and safety protocols."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "References" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Reference Bubbles / Category Chips */}
                <div className="flex flex-wrap items-center justify-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setSearchQuery("")}
                        className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${searchQuery === ""
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-primary dark:border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}
                    >
                        All Resources
                    </button>
                    {referenceCategories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSearchQuery(cat.title)}
                            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${searchQuery === cat.title
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-primary dark:border-primary"
                                : "bg-card text-muted-foreground border-border hover:border-primary/50"
                                }`}
                        >
                            <cat.icon className="h-3.5 w-3.5" />
                            {cat.title}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="max-w-3xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type to filter drug intelligence, guidelines, or safety protocols..."
                            className="block w-full pl-12 pr-4 py-4.5 border-none rounded-2xl bg-card text-foreground shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-inset ring-border placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-inset focus:ring-primary text-base transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Reference Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <div
                                key={category.id}
                                className="bg-card rounded-2xl p-7 border border-border shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start gap-4 mb-6">
                                    <div className={`p-4 rounded-2xl ${category.color} shadow-sm group-hover:scale-110 transition-all`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground mb-1 leading-none">
                                            {category.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground font-medium">
                                            {category.description}
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-1 ml-14">
                                    {category.items.map((item) => (
                                        <li key={item.name}>
                                            <button
                                                onClick={() => setSelectedItem({ category: category.title, item: item.name, details: item.details })}
                                                className="w-full text-left text-sm text-muted-foreground hover:text-primary flex items-center gap-2 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-all group/item"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover/item:text-primary transition-colors" />
                                                <span className="flex-1 font-medium">{item.name}</span>
                                                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Links */}
                <div className="p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpen className="h-24 w-24 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
                            <h4 className="font-black text-white uppercase tracking-[0.2em] text-xs">Essential Clinical Shortcuts</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { name: "Drug Interactions (Lexicomp)", url: "https://www.wolterskluwer.com/en/solutions/lexicomp", external: true },
                                { name: "APA Practice Guidelines", url: "https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines", external: true },
                                { name: "FDA Black Box Search", url: "https://www.accessdata.fda.gov/scripts/cder/daf/", external: true },
                                { name: "Clozapine REMS Portal", url: "https://www.clozapinerems.com/", external: true },
                                { name: "ICD-10 Browser", url: "https://icd10cmtool.cdc.gov/", external: true },
                                { name: "Lab Reference Ranges", href: "/references/labs", external: false }
                            ].map((link) => (
                                link.external ? (
                                    <a
                                        key={link.name}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white/80 hover:bg-white/10 hover:border-primary/50 hover:text-white transition-all group/link"
                                    >
                                        <span className="truncate">{link.name}</span>
                                        <ExternalLink className="h-4 w-4 shrink-0 opacity-40 group-hover/link:opacity-100 transition-opacity" />
                                    </a>
                                ) : (
                                    <Link
                                        key={link.name}
                                        href={link.href ?? "#"}
                                        className="flex items-center justify-between gap-2 px-6 py-4 bg-primary/10 border border-primary/20 rounded-2xl text-sm font-bold text-primary hover:bg-primary/20 transition-all group/link"
                                    >
                                        <span className="truncate">{link.name}</span>
                                        <ChevronRight className="h-4 w-4 shrink-0 group-hover/link:translate-x-1 transition-transform" />
                                    </Link>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Details */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <div>
                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">{selectedItem.category}</span>
                                <h3 className="text-xl font-bold text-foreground mt-1">{selectedItem.item}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <p className="text-base text-foreground/80 leading-relaxed font-medium mb-8">
                                {selectedItem.details}
                            </p>
                            <div className="flex gap-3">
                                <button className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                                    Copy to Chart
                                </button>
                                <button className="flex-1 bg-muted font-bold py-3 rounded-xl hover:bg-muted/80 transition-all">
                                    Full Reference
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
