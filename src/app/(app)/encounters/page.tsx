"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import Link from "next/link";
import {
    Search,
    Filter,
    Plus,
    Eye,
    FileText,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    AlertCircle,
    X,
} from "lucide-react";
import { encounters } from "@/lib/demo-data/encounters";
import { patients } from "@/lib/demo-data/patients";


const statusStyles = {
    "In Progress": {
        bg: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        icon: Clock,
        dot: "bg-blue-500",
    },
    Scheduled: {
        bg: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        icon: AlertCircle,
        dot: "bg-amber-500",
    },
    Completed: {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
        icon: CheckCircle,
        dot: "bg-emerald-500",
    },
};

export default function EncountersPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);

    const filteredEncounters = encounters.filter(e => {
        const patient = patients.find(p => p.id === e.patientId);
        const matchesSearch = patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.chiefComplaint.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || e.status === statusFilter;
        const matchesType = !typeFilter || e.type.toLowerCase().includes(typeFilter.toLowerCase());
        return matchesSearch && matchesStatus && matchesType;
    });

    const resetFilters = () => {
        setSearchQuery("");
        setStatusFilter(null);
        setTypeFilter(null);
    };

    return (
        <>
            <Header
                title="Encounters"
                description="View and manage patient encounters and visits."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Encounters" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Controls Toolbar */}
                <div className="flex flex-col gap-4 mb-6 bg-card/40 p-4 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm ring-1 ring-border/5">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                        {/* Search */}
                        <div className="relative flex-1 max-w-lg text-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by patient or concern..."
                                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary transition-all focus:shadow-md"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
                                {["Scheduled", "In Progress", "Completed"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s
                                            ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-border/10"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            <Link
                                href="/encounters/new"
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg whitespace-nowrap"
                            >
                                <Plus className="h-5 w-5" />
                                <span>New Encounter</span>
                            </Link>
                        </div>
                    </div>

                    {/* Secondary Filters */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type:</span>
                            <select
                                value={typeFilter || ""}
                                onChange={(e) => setTypeFilter(e.target.value || null)}
                                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer hover:text-primary transition-colors"
                            >
                                <option value="">All Types</option>
                                <option value="Initial">Initial Consultation</option>
                                <option value="Follow-up">Follow-up Visit</option>
                                <option value="Medication">Medication Review</option>
                                <option value="Therapy">Therapy Session</option>
                            </select>
                        </div>

                        <div className="h-4 w-px bg-border" />

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provider:</span>
                            <span className="text-xs font-bold text-foreground">Dr. Sarah K.</span>
                        </div>

                        {(searchQuery || statusFilter || typeFilter) && (
                            <button
                                onClick={resetFilters}
                                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors bg-muted/30 rounded-lg border border-border/50"
                            >
                                <X className="h-3 w-3" />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Encounters Table Card */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full whitespace-nowrap text-left">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Date & Time
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Chief Complaint
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredEncounters.map((encounter) => {
                                    const statusConfig = statusStyles[encounter.status];
                                    return (
                                        <tr
                                            key={encounter.id}
                                            className="group hover:bg-accent/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${patients.find(p => p.id === encounter.patientId)?.avatarColor || "bg-primary/10 text-primary"}`}>
                                                        {patients.find(p => p.id === encounter.patientId)?.initials || "??"}
                                                    </div>
                                                    <Link
                                                        href={`/patients/${encounter.patientId}`}
                                                        className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                                                    >
                                                        {patients.find(p => p.id === encounter.patientId)?.name || "Unknown Patient"}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-foreground">
                                                    {encounter.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm text-foreground">{encounter.date}</p>
                                                    <p className="text-xs text-muted-foreground">{encounter.time}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-muted-foreground">
                                                    {encounter.chiefComplaint}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg}`}
                                                >
                                                    <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                                                    {encounter.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/encounters/${encounter.id}`}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                        title="View Encounter"
                                                    >
                                                        <Eye className="h-5 w-5" />
                                                    </Link>
                                                    <Link
                                                        href={`/encounters/${encounter.id}/note`}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                                                        title="Edit Note"
                                                    >
                                                        <FileText className="h-5 w-5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card text-sm">
                        <p className="text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{filteredEncounters.length}</span> of{" "}
                            <span className="font-medium text-foreground">{encounters.length}</span> encounters
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                disabled
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
