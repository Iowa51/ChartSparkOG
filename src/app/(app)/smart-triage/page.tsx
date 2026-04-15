"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout";
import {
    ShieldCheck,
    Users,
    AlertTriangle,
    CheckCircle,
    Search,
    ChevronRight,
    Filter,
    RefreshCw,
    Pill,
    FileText,
    Activity,
    Loader2,
    AlertCircle,
    XCircle,
} from "lucide-react";

// Types
interface PatientTriageRow {
    id: string;
    name: string;
    initials: string;
    dob: string;
    mrn: string;
    gender: string;
    status: string;
    triageLevel: "green" | "yellow" | "red" | "black" | "none";
    safetyScore: number | null;
    alertsCount: number;
    criticalCount: number;
    medications: string[];
    diagnoses: string[];
    lastTriageDate: string | null;
    triageSummary: string;
}

// Safety level config
const levelConfig: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    green: { label: "All Clear", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
    yellow: { label: "Caution", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
    red: { label: "Alert", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", dot: "bg-red-500" },
    black: { label: "Critical", color: "text-slate-900 dark:text-slate-100", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-600", dot: "bg-slate-900 dark:bg-slate-200" },
    none: { label: "Not Assessed", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", dot: "bg-slate-300 dark:bg-slate-600" },
};

export default function SmartTriageDashboard() {
    const [patients, setPatients] = useState<PatientTriageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLevel, setFilterLevel] = useState<string>("all");
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    // Fetch all patients and their triage data
    useEffect(() => {
        fetchAllPatientTriage();
    }, []);

    const fetchAllPatientTriage = async () => {
        setLoading(true);
        try {
            // Fetch patient list
            const patientsRes = await fetch("/api/patients");
            if (!patientsRes.ok) throw new Error("Failed to fetch patients");
            const patientsData = await patientsRes.json();
            const patientList = patientsData.patients || patientsData || [];

            // For each patient, fetch their triage data
            const triageRows: PatientTriageRow[] = await Promise.all(
                patientList.map(async (p: any) => {
                    const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
                    const initials = `${(p.first_name || "")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase() || "??";

                    // Default row
                    const row: PatientTriageRow = {
                        id: p.id,
                        name,
                        initials,
                        dob: p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : "N/A",
                        mrn: p.mrn || "N/A",
                        gender: p.gender || "N/A",
                        status: p.status || "active",
                        triageLevel: "none",
                        safetyScore: null,
                        alertsCount: 0,
                        criticalCount: 0,
                        medications: [],
                        diagnoses: [],
                        lastTriageDate: null,
                        triageSummary: "No triage data available",
                    };

                    // Try fetching medication triage for this patient
                    try {
                        const triageRes = await fetch("/api/ai/smart-triage/medication-review", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ patient_id: p.id }),
                        });

                        if (triageRes.ok) {
                            const triageData = await triageRes.json();
                            const result = triageData.result || {};

                            row.safetyScore = triageData.safety_score ?? result.overall_safety_score ?? null;
                            row.triageLevel = triageData.safety_level || (row.safetyScore !== null
                                ? row.safetyScore >= 80 ? "green" : row.safetyScore >= 60 ? "yellow" : row.safetyScore >= 40 ? "red" : "black"
                                : "none");
                            row.alertsCount = (result.drug_drug_interactions?.length || 0) + (result.black_box_warnings?.length || 0);
                            row.criticalCount = result.drug_drug_interactions?.filter((d: any) => d.severity === "critical" || d.severity === "high").length || 0;
                            row.lastTriageDate = triageData.created_at || new Date().toISOString();
                            row.triageSummary = result.summary || "Triage analysis complete";

                            // Extract medication names from interactions
                            const medSet = new Set<string>();
                            result.drug_drug_interactions?.forEach((ddi: any) => {
                                if (ddi.med_a) medSet.add(ddi.med_a);
                                if (ddi.med_b) medSet.add(ddi.med_b);
                            });
                            result.black_box_warnings?.forEach((bbw: any) => {
                                if (bbw.medication) medSet.add(bbw.medication);
                            });
                            result.lab_monitoring?.forEach((lab: any) => {
                                if (lab.medication) medSet.add(lab.medication);
                            });
                            if (medSet.size > 0) row.medications = Array.from(medSet);

                            // Extract diagnoses from clinical pearls or summary
                            if (result.clinical_pearls?.length) {
                                row.diagnoses = result.clinical_pearls.slice(0, 3);
                            }
                        }
                    } catch {
                        // Silently continue — triage may not be available for this patient
                    }

                    return row;
                })
            );

            setPatients(triageRows);
        } catch (error) {
            console.error("Error fetching triage data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Refresh triage for a single patient
    const refreshPatientTriage = async (patientId: string) => {
        setRefreshingId(patientId);
        try {
            const res = await fetch("/api/ai/smart-triage/medication-review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patient_id: patientId }),
            });
            if (res.ok) {
                const data = await res.json();
                const result = data.result || {};
                setPatients(prev => prev.map(p => {
                    if (p.id !== patientId) return p;
                    const score = data.safety_score ?? result.overall_safety_score ?? null;
                    const medSet = new Set<string>();
                    result.drug_drug_interactions?.forEach((ddi: any) => { if (ddi.med_a) medSet.add(ddi.med_a); if (ddi.med_b) medSet.add(ddi.med_b); });
                    result.black_box_warnings?.forEach((bbw: any) => { if (bbw.medication) medSet.add(bbw.medication); });
                    result.lab_monitoring?.forEach((lab: any) => { if (lab.medication) medSet.add(lab.medication); });

                    return {
                        ...p,
                        safetyScore: score,
                        triageLevel: data.safety_level || (score !== null ? score >= 80 ? "green" : score >= 60 ? "yellow" : score >= 40 ? "red" : "black" : "none"),
                        alertsCount: (result.drug_drug_interactions?.length || 0) + (result.black_box_warnings?.length || 0),
                        criticalCount: result.drug_drug_interactions?.filter((d: any) => d.severity === "critical" || d.severity === "high").length || 0,
                        lastTriageDate: data.created_at || new Date().toISOString(),
                        triageSummary: result.summary || "Triage analysis complete",
                        medications: medSet.size > 0 ? Array.from(medSet) : p.medications,
                        diagnoses: result.clinical_pearls?.slice(0, 3) || p.diagnoses,
                    };
                }));
            }
        } catch (error) {
            console.error("Error refreshing triage:", error);
        } finally {
            setRefreshingId(null);
        }
    };

    // Filter and search
    const filtered = patients.filter(p => {
        const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.mrn.includes(searchQuery);
        const matchesLevel = filterLevel === "all" || p.triageLevel === filterLevel;
        return matchesSearch && matchesLevel;
    });

    // Stats
    const stats = {
        total: patients.length,
        critical: patients.filter(p => p.triageLevel === "black" || p.triageLevel === "red").length,
        caution: patients.filter(p => p.triageLevel === "yellow").length,
        clear: patients.filter(p => p.triageLevel === "green").length,
    };

    // Sort by severity (worst first)
    const severityOrder: Record<string, number> = { black: 0, red: 1, yellow: 2, none: 3, green: 4 };
    const sorted = [...filtered].sort((a, b) => (severityOrder[a.triageLevel] ?? 5) - (severityOrder[b.triageLevel] ?? 5));

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header title="Smart Triage" description="Population Overview" />

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-foreground">{loading ? "—" : stats.total}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Patients</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card rounded-2xl border border-red-200 dark:border-red-900/30 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-red-600 dark:text-red-400">{loading ? "—" : stats.critical}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Critical / Alert</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card rounded-2xl border border-amber-200 dark:border-amber-900/30 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{loading ? "—" : stats.caution}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Caution</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-card rounded-2xl border border-emerald-200 dark:border-emerald-900/30 p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{loading ? "—" : stats.clear}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">All Clear</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by patient name or MRN..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            {["all", "black", "red", "yellow", "green", "none"].map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setFilterLevel(level)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${filterLevel === level
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
                                        }`}
                                >
                                    {level === "all" ? "All" : levelConfig[level]?.label || level}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchAllPatientTriage}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh All
                        </button>
                    </div>

                    {/* Patient Triage Table */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium text-muted-foreground">Loading patient triage data...</p>
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <ShieldCheck className="h-12 w-12 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">No patients match your filters</p>
                        </div>
                    ) : (
                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-900/50">
                                            <th className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Patient</th>
                                            <th className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Triage</th>
                                            <th className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score</th>
                                            <th className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Medications</th>
                                            <th className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Clinical Notes</th>
                                            <th className="text-left px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Alerts</th>
                                            <th className="text-right px-5 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {sorted.map((patient) => {
                                            const config = levelConfig[patient.triageLevel] || levelConfig.none;
                                            return (
                                                <tr key={patient.id} className="hover:bg-muted/30 transition-colors group">
                                                    {/* Patient Info */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                                                                {patient.initials}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-foreground">{patient.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    MRN: {patient.mrn} · {patient.gender} · DOB: {patient.dob}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Triage Level Badge */}
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                                            <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                                                            {config.label}
                                                        </span>
                                                    </td>

                                                    {/* Safety Score */}
                                                    <td className="px-5 py-4">
                                                        {patient.safetyScore !== null ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${patient.safetyScore >= 80 ? "bg-emerald-500" :
                                                                            patient.safetyScore >= 60 ? "bg-amber-500" :
                                                                                patient.safetyScore >= 40 ? "bg-red-500" : "bg-slate-800"
                                                                            }`}
                                                                        style={{ width: `${patient.safetyScore}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-foreground">{patient.safetyScore}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>

                                                    {/* Medications */}
                                                    <td className="px-5 py-4 max-w-[200px]">
                                                        {patient.medications.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {patient.medications.slice(0, 3).map((med, i) => (
                                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-medium border border-blue-100 dark:border-blue-800">
                                                                        <Pill className="h-2.5 w-2.5" />
                                                                        {med}
                                                                    </span>
                                                                ))}
                                                                {patient.medications.length > 3 && (
                                                                    <span className="text-[10px] text-muted-foreground font-medium">+{patient.medications.length - 3} more</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground">No medication data</span>
                                                        )}
                                                    </td>

                                                    {/* Clinical Notes / Summary */}
                                                    <td className="px-5 py-4 max-w-[250px]">
                                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {patient.triageSummary}
                                                        </p>
                                                    </td>

                                                    {/* Alerts */}
                                                    <td className="px-5 py-4">
                                                        {patient.alertsCount > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${patient.criticalCount > 0
                                                                    ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                                                                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                                                    }`}>
                                                                    <AlertCircle className="h-3 w-3" />
                                                                    {patient.alertsCount}
                                                                </span>
                                                                {patient.criticalCount > 0 && (
                                                                    <span className="text-[9px] font-bold text-red-600 dark:text-red-400">
                                                                        {patient.criticalCount} critical
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                                <CheckCircle className="h-3 w-3" />
                                                                None
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => refreshPatientTriage(patient.id)}
                                                                disabled={refreshingId === patient.id}
                                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
                                                                title="Refresh triage"
                                                            >
                                                                <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === patient.id ? "animate-spin" : ""}`} />
                                                            </button>
                                                            <Link
                                                                href={`/patients/${patient.id}`}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 transition-all"
                                                            >
                                                                View
                                                                <ChevronRight className="h-3 w-3" />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
