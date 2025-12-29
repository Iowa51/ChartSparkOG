"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Copy,
    Eye,
    FileText,
    Building2,
    Check,
    X,
} from "lucide-react";
import { systemTemplates } from "@/lib/demo-data/templates";

// Demo org-specific templates
const orgTemplates = [
    {
        id: "org-tpl-1",
        name: "Anxiety Follow-up",
        organization: "Wellness Psychiatry Associates",
        cpt_suggestions: ["99214", "90833"],
        is_system: false,
        created_at: "2024-01-15",
    },
    {
        id: "org-tpl-2",
        name: "ADHD Medication Check",
        organization: "Coastal Mental Health",
        cpt_suggestions: ["99213"],
        is_system: false,
        created_at: "2024-02-20",
    },
];

export default function AdminTemplatesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSystemTemplates, setShowSystemTemplates] = useState(true);
    const [showOrgTemplates, setShowOrgTemplates] = useState(true);

    const filteredSystemTemplates = systemTemplates.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOrgTemplates = orgTemplates.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Template Management
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Manage system and organization-specific note templates
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors">
                        <Plus className="h-5 w-5" />
                        Create Template
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Search & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSystemTemplates(!showSystemTemplates)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showSystemTemplates
                                        ? "bg-primary/10 text-primary border border-primary"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent"
                                    }`}
                            >
                                System Templates
                            </button>
                            <button
                                onClick={() => setShowOrgTemplates(!showOrgTemplates)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showOrgTemplates
                                        ? "bg-primary/10 text-primary border border-primary"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent"
                                    }`}
                            >
                                Org Templates
                            </button>
                        </div>
                    </div>

                    {/* System Templates */}
                    {showSystemTemplates && (
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                System Templates
                                <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {filteredSystemTemplates.length}
                                </span>
                            </h2>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Template Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">CPT Codes</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Default</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {filteredSystemTemplates.map((template) => (
                                            <tr key={template.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10">
                                                            <FileText className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white">{template.name}</p>
                                                            <p className="text-xs text-slate-500 truncate max-w-xs">{template.description}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        {template.cpt_suggestions.map((code) => (
                                                            <span key={code} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-300">
                                                                {code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {template.is_default ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                                            <Check className="h-3 w-3" /> Primary
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                            <Copy className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Organization Templates */}
                    {showOrgTemplates && (
                        <section>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-500" />
                                Organization Templates
                                <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {filteredOrgTemplates.length}
                                </span>
                            </h2>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Template Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Organization</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">CPT Codes</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Created</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {filteredOrgTemplates.map((template) => (
                                            <tr key={template.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                    {template.name}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{template.organization}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-1">
                                                        {template.cpt_suggestions.map((code) => (
                                                            <span key={code} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-300">
                                                                {code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">{template.created_at}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
