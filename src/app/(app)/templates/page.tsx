import { Header } from "@/components/layout";
import Link from "next/link";
import { FileText, Clock, Stethoscope, Brain, Pill, Heart, Star, Plus, Settings } from "lucide-react";
import { systemTemplates } from "@/lib/demo-data/templates";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "tpl-progress-note": FileText,
    "tpl-follow-up-med": Pill,
    "tpl-individual-cbt": Brain,
    "tpl-bio-psycho": Heart,
    "tpl-initial-med": Stethoscope,
};

const colorMap: Record<string, string> = {
    "tpl-progress-note": "bg-primary/10 text-primary",
    "tpl-follow-up-med": "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    "tpl-individual-cbt": "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    "tpl-bio-psycho": "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    "tpl-initial-med": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function TemplatesPage() {
    // Sort templates: Progress Note first, then others
    const sortedTemplates = [...systemTemplates].sort((a, b) => {
        if (a.is_default) return -1;
        if (b.is_default) return 1;
        return 0;
    });

    return (
        <>
            <Header
                title="Templates"
                description="AI-powered SOAP note templates for clinical documentation."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Templates" },
                ]}
                actions={
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
                        <Settings className="h-4 w-4" />
                        <span>Manage Templates</span>
                    </button>
                }
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Demo Mode Banner */}
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Demo Mode Active
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            AI note generation is simulated with realistic sample responses
                        </p>
                    </div>
                </div>

                {/* Primary Template - Progress Note */}
                <section className="mb-8">
                    <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        Primary Template
                    </h2>
                    {sortedTemplates.filter(t => t.is_default).map((template) => {
                        const Icon = iconMap[template.id] || FileText;
                        return (
                            <Link
                                key={template.id}
                                href={`/notes/new?template=${template.id}`}
                                className="group block bg-gradient-to-r from-primary/5 to-transparent border-2 border-primary/20 hover:border-primary/40 rounded-xl p-6 transition-all hover:shadow-lg"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-4 rounded-xl ${colorMap[template.id] || "bg-primary/10 text-primary"}`}>
                                        <Icon className="h-8 w-8" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {template.name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                                                        PRIMARY
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {template.cpt_suggestions.map((code) => (
                                                        <span key={code} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                            {code}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {template.description}
                                        </p>
                                        <p className="text-xs text-primary font-medium">
                                            Optimized for insurance billing • Reduces claim rejections
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </section>

                {/* Other Templates */}
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-4">
                        Specialized Templates
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sortedTemplates.filter(t => !t.is_default).map((template) => {
                            const Icon = iconMap[template.id] || FileText;
                            return (
                                <Link
                                    key={template.id}
                                    href={`/notes/new?template=${template.id}`}
                                    className="group bg-card rounded-xl p-6 border border-border hover:shadow-lg hover:border-primary/30 transition-all"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${colorMap[template.id] || "bg-muted text-muted-foreground"}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {template.name}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {template.cpt_suggestions.map((code) => (
                                                            <span key={code} className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                {code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                {template.is_system && (
                                                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-muted text-muted-foreground">
                                                        SYSTEM
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {template.description}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
                    <Link
                        href="/notes/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/70 text-foreground rounded-xl font-medium transition-colors"
                    >
                        <FileText className="h-5 w-5" />
                        Start with Blank Note
                    </Link>
                    <Link
                        href="/templates/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Create Custom Template
                    </Link>
                </div>
            </div>
        </>
    );
}
