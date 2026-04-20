"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, User, Loader2, AlertCircle } from "lucide-react";

interface PatientQuickSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ApiPatient {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string | null;
    mrn?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    avatar_color?: string | null;
    email?: string | null;
}

interface UiPatient {
    id: string;
    name: string;
    initials: string;
    mrn: string;
    dob: string;
    gender: string;
    email: string;
    lastVisit: string;
    avatarColor: string;
}

const AVATAR_PALETTE = [
    "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300",
    "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
    "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300",
    "bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300",
    "bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300",
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
    "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
];

function hashIdToPaletteIndex(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return hash % AVATAR_PALETTE.length;
}

function formatDob(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function transformPatient(p: ApiPatient): UiPatient {
    const first = p.first_name || "";
    const last = p.last_name || "";
    const name = `${first} ${last}`.trim() || "Unnamed Patient";
    const initials = `${(first[0] || "").toUpperCase()}${(last[0] || "").toUpperCase()}` || "?";
    return {
        id: p.id,
        name,
        initials,
        mrn: p.mrn || "—",
        dob: formatDob(p.date_of_birth),
        gender: p.gender || "—",
        email: p.email || "",
        lastVisit: "—",
        avatarColor: p.avatar_color || AVATAR_PALETTE[hashIdToPaletteIndex(p.id)],
    };
}

export default function PatientQuickSelectModal({ isOpen, onClose }: PatientQuickSelectModalProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [patients, setPatients] = useState<UiPatient[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/patients?status=active&limit=100");
                if (!res.ok) throw new Error(`Failed to load patients (${res.status})`);
                const data = await res.json();
                const rows: ApiPatient[] = Array.isArray(data.patients) ? data.patients : [];
                if (!cancelled) setPatients(rows.map(transformPatient));
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load patients");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return patients;
        const query = searchQuery.toLowerCase();
        return patients.filter(
            (p) =>
                p.name.toLowerCase().includes(query) ||
                p.mrn.toLowerCase().includes(query) ||
                p.dob.toLowerCase().includes(query) ||
                p.email.toLowerCase().includes(query),
        );
    }, [patients, searchQuery]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery, patients]);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery("");
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, filteredPatients.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && filteredPatients.length > 0) {
                e.preventDefault();
                handleSelectPatient(filteredPatients[selectedIndex].id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filteredPatients, selectedIndex]);

    const handleSelectPatient = (patientId: string) => {
        router.push(`/notes/new?patientId=${patientId}`);
        onClose();
    };

    const handleAddNewPatient = () => {
        router.push("/patients/new?returnTo=/notes/new");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 pointer-events-none">
                <div
                    className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[600px] flex flex-col pointer-events-auto animate-in zoom-in-95 slide-in-from-top-4 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-lg font-bold text-foreground">Select Patient for Note</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 py-4 border-b border-border bg-muted/20">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by name, MRN, or DOB..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Patient List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {!searchQuery && !loading && !error && filteredPatients.length > 0 && (
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                                Active Patients
                            </p>
                        )}

                        {loading ? (
                            <div className="text-center py-12">
                                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">Loading patients…</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <AlertCircle className="h-12 w-12 text-destructive/70 mx-auto mb-3" />
                                <p className="text-sm font-medium text-destructive mb-2">
                                    Couldn't load patients
                                </p>
                                <p className="text-xs text-muted-foreground">{error}</p>
                            </div>
                        ) : filteredPatients.length === 0 ? (
                            <div className="text-center py-12">
                                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                    No patients found
                                </p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Try a different search or add a new patient
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredPatients.map((patient, index) => (
                                    <button
                                        key={patient.id}
                                        onClick={() => handleSelectPatient(patient.id)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${index === selectedIndex
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl ${patient.avatarColor} flex items-center justify-center text-lg font-bold shrink-0`}>
                                                {patient.initials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="font-bold text-foreground">{patient.name}</h3>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {patient.mrn}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>DOB: {patient.dob}</span>
                                                    <span>•</span>
                                                    <span>{patient.gender}</span>
                                                    {patient.lastVisit !== "—" && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Last visit: {patient.lastVisit}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer - Add New Patient */}
                    <div className="px-6 py-4 border-t border-border bg-muted/20">
                        <button
                            onClick={handleAddNewPatient}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold transition-all active:scale-98"
                        >
                            <Plus className="h-5 w-5" />
                            Can't find patient? Add New Patient
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
