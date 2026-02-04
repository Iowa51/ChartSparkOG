"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    User,
    Calendar,
    Mail,
    Phone,
    MapPin,
    FileText,
    ArrowLeft,
    Save,
    Plus,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get("returnTo");

    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newPatientId, setNewPatientId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        preferredName: "",
        dob: "",
        gender: "",
        ssn: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        allergies: "",
        medications: "",
        medicalHistory: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            // Split full name into first and last
            const nameParts = formData.fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || 'Unknown';

            // Parse allergies from comma-separated string
            const allergies = formData.allergies
                ? formData.allergies.split(',').map(a => a.trim()).filter(a => a)
                : [];

            // Parse medications from comma-separated string
            const medications = formData.medications
                ? formData.medications.split(',').map(m => {
                    const med = m.trim();
                    return { medication: med };
                }).filter(m => m.medication)
                : [];

            // Parse medical history into problems
            const problems = formData.medicalHistory
                ? formData.medicalHistory.split(',').map(p => {
                    const problem = p.trim();
                    return { problem };
                }).filter(p => p.problem)
                : [];

            // Combine address fields
            const fullAddress = [
                formData.address,
                formData.city,
                formData.state,
                formData.zipCode
            ].filter(Boolean).join(', ');

            // Call API to create patient
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    preferred_name: formData.preferredName || undefined,
                    date_of_birth: formData.dob || undefined,
                    gender: formData.gender || undefined,
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    address: fullAddress || undefined,
                    allergies: allergies.length > 0 ? allergies : undefined,
                    medications: medications.length > 0 ? medications : undefined,
                    problems: problems.length > 0 ? problems : undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create patient');
            }

            const patient = await response.json();

            setNewPatientId(patient.id);
            setSaved(true);

            // Only auto-redirect if NOT from note creation flow
            if (!returnTo) {
                setTimeout(() => {
                    router.push('/patients');
                }, 1500);
            }
        } catch (err) {
            console.error('Error creating patient:', err);
            setError(err instanceof Error ? err.message : 'Failed to create patient');
            setIsSaving(false);
        }
    };

    return (
        <>
            <Header
                title="Add New Patient"
                description="Create a new comprehensive patient record in the EHR."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Patients", href: "/patients" },
                    { label: "New Patient" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Main Demographics Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <User className="h-4 w-4" />
                                Patient Demographics
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="e.g. Jane Doe"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Preferred Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.preferredName}
                                        onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                                        placeholder="e.g. Jenny"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Date of Birth
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        Gender
                                    </label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground"
                                    >
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <Mail className="h-4 w-4" />
                                Contact Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="patient@example.com"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Street Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="123 Main St"
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="San Francisco"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="CA"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-2">
                                        ZIP Code
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                        placeholder="94102"
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Information Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <FileText className="h-4 w-4" />
                                Clinical Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Allergies
                                </label>
                                <input
                                    type="text"
                                    value={formData.allergies}
                                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                    placeholder="E.g. Penicillin, Peanuts (comma-separated)"
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    Separate multiple allergies with commas
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Current Medications
                                </label>
                                <input
                                    type="text"
                                    value={formData.medications}
                                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                                    placeholder="E.g. Lisinopril 10mg, Metformin 500mg (comma-separated)"
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    Separate multiple medications with commas
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">
                                    Medical History / Problems
                                </label>
                                <textarea
                                    value={formData.medicalHistory}
                                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                                    placeholder="E.g. Hypertension, Type 2 Diabetes (comma-separated)"
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground resize-none"
                                />
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    Separate multiple problems with commas
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-4 pt-4">
                        <Link
                            href={returnTo || "/patients"}
                            className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-sm font-semibold text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Cancel
                        </Link>

                        {!saved ? (
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Create Patient
                                    </>
                                )}
                            </button>
                        ) : (
                            <>
                                {/* Success State */}
                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm font-bold">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Patient Created Successfully!
                                </div>

                                {/* Only show "Start Initial Note" if returnTo is present */}
                                {returnTo && newPatientId && (
                                    <Link
                                        href={`${returnTo}?patientId=${newPatientId}`}
                                        className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md text-sm font-bold ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Start Initial Note
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}
