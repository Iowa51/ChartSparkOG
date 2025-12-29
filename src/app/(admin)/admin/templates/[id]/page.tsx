"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { templates } from "@/lib/demo-data/templates";
import {
    ArrowLeft,
    Plus,
    GripVertical,
    Trash2,
    Settings2,
    Eye,
    Save,
    Sparkles,
    Layout,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Template, TemplateSection } from "@/lib/demo-data/templates";

export default function TemplateEditorPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;
    const initialTemplate = templates.find(t => t.id === templateId);

    const [template, setTemplate] = useState<Template | undefined>(initialTemplate);
    const [isSaving, setIsSaving] = useState(false);

    if (!template) return null;

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            // Mock success
        }, 800);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
            <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border p-4 shadow-sm flex items-center justify-between px-6 lg:px-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-foreground leading-none">{template.name}</h1>
                        <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">Template Editor</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-foreground hover:bg-muted rounded-xl transition-colors">
                        <Eye className="h-4 w-4" />
                        Preview
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                        {!isSaving && <Save className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <main className="flex-1 p-6 lg:px-10 lg:py-12 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Structure Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-card rounded-2xl border border-border shadow-sm p-8">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Note Structure</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Configure the sections and AI prompts for this template.</p>
                                </div>
                                <Layout className="h-6 w-6 text-primary/40" />
                            </div>

                            <div className="space-y-4">
                                {template.sections.map((section: TemplateSection, index: number) => (
                                    <div
                                        key={section.id}
                                        className="group bg-muted/20 border border-border rounded-2xl p-6 transition-all hover:bg-card hover:shadow-md hover:border-primary/20"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors">
                                                <GripVertical className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <input
                                                        type="text"
                                                        defaultValue={section.label}
                                                        className="text-lg font-bold bg-transparent border-none outline-none focus:text-primary transition-colors w-full"
                                                    />
                                                    <button className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Default Placeholder</label>
                                                        <textarea
                                                            defaultValue={section.placeholder}
                                                            className="w-full h-20 p-4 bg-background border border-border rounded-xl text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                                        />
                                                    </div>
                                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">AI Intelligence</span>
                                                        </div>
                                                        <p className="text-xs text-foreground/70 leading-relaxed italic">
                                                            "Analyze the medical transcript and extract {section.label.toLowerCase()} details, prioritizing insurance-required terminology."
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button className="w-full py-4 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all font-bold">
                                    <Plus className="h-5 w-5" />
                                    Add New Section
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Sidebar: Settings/Properties */}
                    <div className="space-y-6">
                        <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sticky top-28">
                            <div className="flex items-center gap-2 mb-6">
                                <Settings2 className="h-5 w-5 text-primary" />
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Properties</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Visibility</label>
                                    <select className="w-full p-2.5 bg-muted/50 border border-border rounded-xl text-sm font-medium">
                                        <option>Public (All Orgs)</option>
                                        <option>Private (Internal Only)</option>
                                        <option>Draft</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Specialties</label>
                                    <div className="flex flex-wrap gap-2">
                                        {template.specialties.map((spec: string) => (
                                            <span key={spec} className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                                                {spec}
                                            </span>
                                        ))}
                                        <button className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase mb-4">
                                        <span>Version History</span>
                                        <button className="text-primary hover:underline">View All</button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1" />
                                            <div>
                                                <p className="text-xs font-bold text-foreground">v2.4.1 (Current)</p>
                                                <p className="text-[10px] text-muted-foreground">Today by Admin</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 opacity-50">
                                            <div className="h-2 w-2 rounded-full bg-slate-300 mt-1" />
                                            <div>
                                                <p className="text-xs font-bold text-foreground">v2.4.0</p>
                                                <p className="text-[10px] text-muted-foreground">Oct 24, 2023</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
