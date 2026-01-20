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
    const [activeTab, setActiveTab] = useState('profile');

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
                            { id: 'profile', label: 'My Profile', icon: User },
                            { id: 'notifications', label: 'Notifications', icon: Bell },
                            { id: 'security', label: 'Security & Privacy', icon: Shield },
                            { id: 'appearance', label: 'Appearance', icon: Palette },
                            { id: 'ehr', label: 'EHR Sync Settings', icon: Database },
                            { id: 'mobility', label: 'Mobile Access', icon: Smartphone },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </div>
                                    {isActive && <Eye className="h-4 w-4 opacity-70" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Settings Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Section */}
                        {activeTab === 'profile' && (
                            <>
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
                            </>
                        )}

                        {/* Notifications Section */}
                        {activeTab === 'notifications' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <Bell className="h-4 w-4 text-primary" />
                                        Notification Preferences
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {[
                                        { label: "Email notifications", desc: "Receive email alerts for important updates", enabled: true },
                                        { label: "Appointment reminders", desc: "Get notified before scheduled appointments", enabled: true },
                                        { label: "New patient alerts", desc: "Notify when new patients are assigned", enabled: false },
                                        { label: "Billing updates", desc: "Receive billing and payment notifications", enabled: true },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold">{item.label}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                            <div className={`h-6 w-11 ${item.enabled ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer border border-border`}>
                                                <div className={`h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform ${item.enabled ? 'translate-x-5' : 'translate-x-0'} transition-transform`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Security Section */}
                        {activeTab === 'security' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <Shield className="h-4 w-4 text-primary" />
                                        Security & Privacy
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Current Password</label>
                                        <input type="password" placeholder="Enter current password" className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Password</label>
                                            <input type="password" placeholder="New password" className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</label>
                                            <input type="password" placeholder="Confirm new password" className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-primary/20 ring-1 ring-primary/5 mt-4">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">Two-Factor Authentication</p>
                                            <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
                                        </div>
                                        <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
                                            Enable 2FA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Appearance Section */}
                        {activeTab === 'appearance' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <Palette className="h-4 w-4 text-primary" />
                                        Appearance
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Theme</label>
                                        <div className="flex gap-3">
                                            {['Light', 'Dark', 'System'].map((theme) => (
                                                <button key={theme} className={`px-6 py-3 rounded-xl text-sm font-bold border transition-all ${theme === 'System' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/30'}`}>
                                                    {theme}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">Compact Mode</p>
                                            <p className="text-xs text-muted-foreground">Reduce spacing for more content on screen.</p>
                                        </div>
                                        <div className="h-6 w-11 bg-muted rounded-full relative cursor-pointer border border-border">
                                            <div className="h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform translate-x-0 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* EHR Section */}
                        {activeTab === 'ehr' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <Database className="h-4 w-4 text-primary" />
                                        EHR Sync Settings
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Connected to Epic EHR</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-500">Last synced: 5 minutes ago</p>
                                        </div>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">Auto-sync notes</p>
                                            <p className="text-xs text-muted-foreground">Automatically push signed notes to EHR.</p>
                                        </div>
                                        <div className="h-6 w-11 bg-primary rounded-full relative cursor-pointer shadow-inner">
                                            <div className="h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform translate-x-5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mobile Section */}
                        {activeTab === 'mobility' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <Smartphone className="h-4 w-4 text-primary" />
                                        Mobile Access
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">iPhone 14 Pro</p>
                                            <p className="text-xs text-muted-foreground">Last active: Today, 10:30 AM</p>
                                        </div>
                                        <button className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline">
                                            Remove
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">iPad Pro</p>
                                            <p className="text-xs text-muted-foreground">Last active: Yesterday, 4:15 PM</p>
                                        </div>
                                        <button className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline">
                                            Remove
                                        </button>
                                    </div>
                                    <button className="w-full py-3 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl border border-dashed border-primary/30 transition-all">
                                        + Add New Device
                                    </button>
                                </div>
                            </div>
                        )}

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
