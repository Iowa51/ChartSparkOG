"use client";

import { Header } from "@/components/layout";
import { useState } from "react";
import {
    User,
    Bell,
    Shield,
    Database,
    Smartphone,
    Eye,
    Save,
    CheckCircle2,
    Palette,
    Globe
} from "lucide-react";

export default function SettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <>
            <Header
                title="User Settings"
                description="Manage your clinical profile, notifications, and security preferences."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Settings" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Navigation sidebar for settings */}
                    <div className="space-y-2">
                        {[
                            { id: 'profile', label: 'My Profile', icon: User, active: true },
                            { id: 'notifications', label: 'Notifications', icon: Bell },
                            { id: 'security', label: 'Security & Privacy', icon: Shield },
                            { id: 'appearance', label: 'Appearance', icon: Palette },
                            { id: 'ehr', label: 'EHR Sync Settings', icon: Database },
                            { id: 'mobility', label: 'Mobile Access', icon: Smartphone },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${item.active
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </div>
                                    {item.active && <Eye className="h-4 w-4 opacity-70" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Settings Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Section */}
                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                            <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                    <User className="h-4 w-4 text-primary" />
                                    Clinical Profile
                                </h2>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-6 mb-4">
                                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20">
                                        SK
                                    </div>
                                    <div>
                                        <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
                                            Change Photo
                                        </button>
                                        <p className="text-[10px] text-muted-foreground mt-2 font-medium">JPG, GIF or PNG. 1MB Max.</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                        <input defaultValue="Sarah K. (Nurse Practitioner)" className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">NPI Number</label>
                                        <input defaultValue="1234567890" disabled className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-muted-foreground cursor-not-allowed font-mono text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
                                        <input defaultValue="sarah.k@hospital.org" className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Specialty</label>
                                        <input defaultValue="Psychiatry / Mental Health" className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preferences Section */}
                        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                            <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                    <Globe className="h-4 w-4 text-primary" />
                                    Preferences
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold">Auto-sign notes</p>
                                        <p className="text-xs text-muted-foreground">Automatically sign notes after final review.</p>
                                    </div>
                                    <div className="h-6 w-11 bg-muted rounded-full relative cursor-pointer border border-border">
                                        <div className="h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform translate-x-0 transition-transform" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-primary/20 ring-1 ring-primary/5">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold">AI Clinical Suggestions</p>
                                        <p className="text-xs text-muted-foreground">Enable real-time ICD-10 and CPT coding assistance.</p>
                                    </div>
                                    <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer shadow-inner">
                                        <div className="h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform translate-x-5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Save className="h-4 w-4 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save All Preferences
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {saved && (
                <div className="fixed bottom-8 right-8 z-[60] animate-in slide-in-from-right-10 fade-in duration-500">
                    <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Settings Updated Successfully</span>
                    </div>
                </div>
            )}
        </>
    );
}
