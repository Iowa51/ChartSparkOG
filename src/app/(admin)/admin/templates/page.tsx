"use client";

import { Header } from "@/components/layout";
import { templates } from "@/lib/demo-data/templates";
import {
    FileText,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Copy,
    Trash2,
    CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function AdminTemplatesPage() {
    return (
        <>
            <Header
                title="Clinical Templates"
                description="Manage and customize SOAP note structures for your organization."
                breadcrumbs={[
                    { label: "Admin Dashboard", href: "/admin" },
                    { label: "Templates" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Search & Actions */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-stretch md:items-center">
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search templates by name or specialty..."
                            className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl bg-card text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
                        <Plus className="h-5 w-5" />
                        Create Template
                    </button>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col"
                        >
                            <div className="p-6 flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/admin/templates/${template.id}`}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                        <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Duplicate">
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <button className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-foreground mb-1">{template.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                                    {template.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {template.specialties.map(specialty => (
                                        <span key={specialty} className="px-2 py-0.5 bg-muted text-[10px] font-bold text-muted-foreground uppercase rounded border border-border/50">
                                            {specialty}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Active</span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{template.sections.length} Sections</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
