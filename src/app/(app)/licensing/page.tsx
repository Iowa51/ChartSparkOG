"use client";

import { Header } from "@/components/layout";
import { useState, useEffect } from "react";
import {
    Award,
    AlertTriangle,
    Save,
    CheckCircle2,
    Clock,
    Plus,
    Trash2
} from "lucide-react";

export default function LicensingPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const [licenses, setLicenses] = useState([
        { id: '1', type: 'State Medical License', number: 'NP-77821-NY', expiry: '2026-12-15' },
        { id: '2', type: 'DEA Registration', number: 'AB1234567', expiry: '2026-03-01' },
        { id: '3', type: 'ANCC Certification', number: '20230192', expiry: '2026-01-30' }
    ]);

    const getLicenseStatus = (expiry: string) => {
        const today = new Date('2026-01-22');
        const expiryDate = new Date(expiry);
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: 'Expired', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
        if (diffDays < 30) return { label: 'Expiring Soon', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
        return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    };

    useEffect(() => {
        const savedLicenses = localStorage.getItem('cs_licenses');
        if (savedLicenses) {
            try { setLicenses(JSON.parse(savedLicenses)); } catch (e) { }
        }
        setHasLoaded(true);
    }, []);

    useEffect(() => {
        if (!hasLoaded) return;
        localStorage.setItem('cs_licenses', JSON.stringify(licenses));
    }, [licenses, hasLoaded]);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Medical Licenses & Certifications"
                description="Manage your professional medical licenses and certification compliance."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Credentials" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                    <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                        <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                            <Award className="h-4 w-4 text-primary" />
                            Active Licenses
                        </h2>
                        <button
                            onClick={() => {
                                const type = prompt("License Type (e.g. State License):");
                                const number = prompt("License Number:");
                                const expiry = prompt("Expiry Date (YYYY-MM-DD):");
                                if (type && number && expiry) {
                                    setLicenses(prev => [...prev, { id: Math.random().toString(), type, number, expiry }]);
                                }
                            }}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                            + Add Credential
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {licenses.map((license) => {
                            const status = getLicenseStatus(license.expiry);
                            return (
                                <button
                                    key={license.id}
                                    onClick={() => {
                                        const newNum = prompt(`Edit ${license.type} Number:`, license.number);
                                        if (newNum) {
                                            setLicenses(prev => prev.map(l => l.id === license.id ? { ...l, number: newNum } : l));
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-5 bg-muted/10 border border-border rounded-2xl hover:border-primary/20 hover:bg-muted/20 transition-all group text-left"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{license.type}</h3>
                                        <p className="text-[10px] font-mono text-muted-foreground">{license.number}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Expires</p>
                                            <p className="text-xs font-bold">{license.expiry}</p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                                            {status.label}
                                        </span>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this credential?')) {
                                                    setLicenses(prev => prev.filter(l => l.id !== license.id));
                                                }
                                            }}
                                            className="p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}

                        <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Compliance Alert</p>
                                <p className="text-[11px] text-amber-600 font-medium leading-relaxed">
                                    Your ANCC Certification expires in less than 30 days. Please initiate renewal to avoid clinical interruption.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Clock className="h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Verification Status
                            </>
                        )}
                    </button>
                </div>
            </div>

            {saved && (
                <div className="fixed bottom-8 right-8 z-[60] animate-in slide-in-from-right-10 fade-in duration-500">
                    <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Credentials Audited Successfully</span>
                    </div>
                </div>
            )}
        </div>
    );
}
