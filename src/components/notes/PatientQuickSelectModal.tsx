"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, User } from "lucide-react";
import { patients, Patient } from "@/lib/demo-data/patients";

interface PatientQuickSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PatientQuickSelectModal({ isOpen, onClose }: PatientQuickSelectModalProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Get recent/active patients (sorted by last visit)
    const recentPatients = [...patients]
        .filter(p => p.status === "Active")
        .slice(0, 5);

    // Filter patients based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPatients(recentPatients);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = patients.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.mrn.toLowerCase().includes(query) ||
                p.dob.toLowerCase().includes(query) ||
                p.email.toLowerCase().includes(query)
            );
            setFilteredPatients(filtered);
        }
        setSelectedIndex(0);
    }, [searchQuery]);

    // Initialize with recent patients when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery("");
            setFilteredPatients(recentPatients);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredPatients.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
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
                        {!searchQuery && (
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                                Recent Patients
                            </p>
                        )}

                        {filteredPatients.length === 0 ? (
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
                                                    {patient.lastVisit !== "--" && (
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
