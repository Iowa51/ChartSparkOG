import { Header } from "@/components/layout";
import { Search, BookOpen, Pill, AlertTriangle, FileText, ExternalLink } from "lucide-react";

const referenceCategories = [
    {
        id: "drug-interactions",
        title: "Drug Interactions",
        description: "Check for potential medication interactions and contraindications",
        icon: Pill,
        color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        items: ["Cytochrome P450 Interactions", "Serotonin Syndrome Risk", "QT Prolongation"],
    },
    {
        id: "clinical-guidelines",
        title: "Clinical Guidelines",
        description: "Evidence-based treatment protocols and best practices",
        icon: FileText,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        items: ["APA Practice Guidelines", "CANMAT Guidelines", "Maudsley Prescribing Guidelines"],
    },
    {
        id: "safety-alerts",
        title: "Safety Alerts",
        description: "FDA warnings, black box notifications, and safety updates",
        icon: AlertTriangle,
        color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        items: ["FDA Black Box Warnings", "REMS Programs", "Drug Recalls"],
    },
    {
        id: "dosing-guides",
        title: "Dosing Guides",
        description: "Medication dosing recommendations and titration schedules",
        icon: BookOpen,
        color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        items: ["Psychotropic Dosing", "Renal Adjustments", "Hepatic Adjustments"],
    },
];

export default function ReferencesPage() {
    return (
        <>
            <Header
                title="Clinical References"
                description="Access drug interactions, guidelines, and clinical resources."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "References" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-2xl mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search medications, interactions, or guidelines..."
                            className="block w-full pl-11 pr-4 py-4 border-none rounded-2xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary text-base transition-shadow"
                        />
                    </div>
                </div>

                {/* Reference Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {referenceCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                            <div
                                key={category.id}
                                className="bg-card rounded-xl p-6 border border-border hover:shadow-md transition-all"
                            >
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`p-3 rounded-xl ${category.color}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground mb-1">
                                            {category.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {category.description}
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-2 ml-14">
                                    {category.items.map((item) => (
                                        <li key={item}>
                                            <button className="w-full text-left text-sm text-muted-foreground hover:text-primary flex items-center gap-2 py-1 transition-colors group">
                                                <span className="flex-1">{item}</span>
                                                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Links */}
                <div className="mt-8 p-6 bg-muted/50 rounded-xl border border-border">
                    <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
                    <div className="flex flex-wrap gap-3">
                        {["UpToDate", "Epocrates", "Lexicomp", "Micromedex", "PDR"].map((link) => (
                            <button
                                key={link}
                                className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                            >
                                {link}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
