"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => {
            router.push('/patients');
        }, 2000);
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
                    {/* Main Demographics Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <User className="h-4 w-4 text-primary" />
                                Patient Demographics
                            </h2>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Legal Name</label>
                                    <input
                                        required
                                        placeholder="e.g. Jane Doe"
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Preferred Name / Alias</label>
                                    <input
                                        placeholder="Optional"
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date of Birth</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="date"
                                                className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium appearance-none"
                                            />
                                            <Calendar className="absolute right-4 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gender Identity</label>
                                        <select className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium">
                                            <option>Select...</option>
                                            <option>Female</option>
                                            <option>Male</option>
                                            <option>Non-binary</option>
                                            <option>Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Social Security Number</label>
                                    <input
                                        placeholder="XXX-XX-XXXX"
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <Phone className="h-4 w-4 text-primary" />
                                Contact & Communication
                            </h2>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Email</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="email"
                                            placeholder="patient@example.com"
                                            className="w-full px-10 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                        />
                                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                                    <div className="relative">
                                        <input
                                            required
                                            placeholder="(555) 000-0000"
                                            className="w-full px-10 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                        />
                                        <Phone className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Home Address</label>
                                    <div className="relative">
                                        <input
                                            placeholder="Street, City, State, ZIP"
                                            className="w-full px-10 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                        />
                                        <MapPin className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Insurance & Clinical */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                        <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                            <h2 className="text-sm font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <FileText className="h-4 w-4 text-primary" />
                                Clinical & Payer Info
                            </h2>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Insurance Provider</label>
                                    <input
                                        placeholder="e.g. Blue Cross Blue Shield"
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Insurance Policy Number</label>
                                    <input
                                        placeholder="ID Number"
                                        className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Significant Medical History / Notes</label>
                                    <textarea
                                        placeholder="Known allergies, chronic conditions, etc."
                                        className="w-full h-32 px-4 py-3 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Form Actions */}
                    <div className="sticky bottom-6 flex items-center justify-between p-4 bg-card/80 backdrop-blur-md rounded-2xl border border-primary/20 shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
                        <Link
                            href="/patients"
                            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Discard
                        </Link>
                        <button
                            type="submit"
                            disabled={isSaving || saved}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl active:scale-95 ${saved
                                    ? "bg-emerald-600 text-white"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                                }`}
                        >
                            {isSaving ? (
                                <>
                                    <Plus className="h-4 w-4 animate-spin" />
                                    Creating Record...
                                </>
                            ) : saved ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Patient Created
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Finalize & Save Patient
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Success Overlay */}
            {saved && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="bg-card px-10 py-12 rounded-3xl shadow-2xl border border-emerald-500/20 text-center animate-in zoom-in-95 duration-300">
                        <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-2 italic tracking-tight">Record Synchronized</h2>
                        <p className="text-muted-foreground font-medium mb-8">Jane Doe has been successfully added to the EHR system.</p>
                        <div className="flex gap-4 justify-center">
                            <Link href="/patients" className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-bold transition-all">
                                Done
                            </Link>
                            <Link href="/notes/new" className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all">
                                Start Initial Note
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
