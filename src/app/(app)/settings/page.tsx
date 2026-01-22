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
    Globe,
    QrCode,
    X,
    Laptop,
    Camera,
    FileText,
    Award,
    History,
    Search,
    Plus,
    Trash2,
    Calendar,
    AlertTriangle,
    LifeBuoy
} from "lucide-react";
import { useEffect, useRef } from "react";

export default function SettingsPage() {
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    // Profile settings
    const [autoSignNotes, setAutoSignNotes] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState(true);

    // Notification settings
    const [notifications, setNotifications] = useState({
        email: true,
        appointments: true,
        newPatients: false,
        billing: true,
    });

    // Security settings
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // Appearance settings
    const [theme, setTheme] = useState<'Light' | 'Dark' | 'System'>('System');
    const [compactMode, setCompactMode] = useState(false);

    const [ehrAutoSync, setEhrAutoSync] = useState(true);

    // Profile photo state
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Mobile device settings
    const [devices, setDevices] = useState([
        { id: '1', name: 'iPhone 14 Pro', lastActive: 'Today, 10:30 AM' },
        { id: '2', name: 'iPad Pro', lastActive: 'Yesterday, 4:15 PM' }
    ]);
    const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);

    // Advanced Clinical Feature States
    const [dotPhrases, setDotPhrases] = useState([
        { id: '1', shortcut: '.cardio', expansion: 'Cardiovascular exam shows normal S1/S2 rhythm, no murmurs, rubs, or gallops.' },
        { id: '2', shortcut: '.resp', expansion: 'Lungs clear to auscultation bilaterally. No wheezes, rales, or rhonchi noted.' },
        { id: '3', shortcut: '.neuro', expansion: 'CN II-XII grossly intact. Alert and oriented x3. Motor strength 5/5 in all extremities.' }
    ]);

    const syncLogs = [
        { id: '1', patient: 'Sarah Johnson', status: 'Success', timestamp: 'Today, 10:45 AM', reference: 'EPIC-99214' },
        { id: '2', patient: 'Michael Chen', status: 'Success', timestamp: 'Today, 09:12 AM', reference: 'EPIC-99213' },
        { id: '3', patient: 'Emily Rodriguez', status: 'Failed', timestamp: 'Yesterday, 04:30 PM', reference: 'Timeout' },
    ];

    // Load from localStorage on mount
    useEffect(() => {
        const savedPhoto = localStorage.getItem('cs_profile_image');
        const savedDevices = localStorage.getItem('cs_paired_devices');
        const savedDots = localStorage.getItem('cs_dot_phrases');
        const savedLicenses = localStorage.getItem('cs_licenses');

        if (savedPhoto) setProfileImage(savedPhoto);
        if (savedDevices) {
            try { setDevices(JSON.parse(savedDevices)); } catch (e) { }
        }
        if (savedDots) {
            try { setDotPhrases(JSON.parse(savedDots)); } catch (e) { }
        }
        setHasLoaded(true);
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (!hasLoaded) return;
        if (profileImage) localStorage.setItem('cs_profile_image', profileImage);
        localStorage.setItem('cs_paired_devices', JSON.stringify(devices));
        localStorage.setItem('cs_dot_phrases', JSON.stringify(dotPhrases));
    }, [profileImage, devices, dotPhrases, hasLoaded]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveDevice = (id: string) => {
        setDevices(prev => prev.filter(d => d.id !== id));
    };

    const confirmPairing = () => {
        const newDevice = {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Authorized Phone',
            lastActive: 'Just Now'
        };
        setDevices(prev => [...prev, newDevice]);
        setIsPairingModalOpen(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

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
                            { id: 'templates', label: 'Clinical Templates', icon: FileText },
                            { id: 'mobility', label: 'Mobile Access', icon: Smartphone },
                            { id: 'ehr-logs', label: 'EHR Sync History', icon: History },
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
                                            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20 overflow-hidden">
                                                {profileImage ? (
                                                    <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
                                                ) : (
                                                    "SK"
                                                )}
                                            </div>
                                            <div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handlePhotoUpload}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-xs font-black uppercase tracking-widest text-primary hover:underline px-4 py-2 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-2 group transition-all"
                                                >
                                                    <Camera className="h-4 w-4 group-hover:scale-110 transition-transform" />
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
                                            <button
                                                onClick={() => setAutoSignNotes(!autoSignNotes)}
                                                className={`h-6 w-11 ${autoSignNotes ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer border border-border transition-colors`}
                                            >
                                                <div className={`h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform ${autoSignNotes ? 'translate-x-5' : 'translate-x-0'} transition-transform`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-primary/20 ring-1 ring-primary/5">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold">AI Clinical Suggestions</p>
                                                <p className="text-xs text-muted-foreground">Enable real-time ICD-10 and CPT coding assistance.</p>
                                            </div>
                                            <button
                                                onClick={() => setAiSuggestions(!aiSuggestions)}
                                                className={`h-6 w-11 ${aiSuggestions ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer shadow-inner transition-colors`}
                                            >
                                                <div className={`h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform ${aiSuggestions ? 'translate-x-5' : 'translate-x-0'} transition-transform`} />
                                            </button>
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
                                        { key: 'email' as const, label: "Email notifications", desc: "Receive email alerts for important updates" },
                                        { key: 'appointments' as const, label: "Appointment reminders", desc: "Get notified before scheduled appointments" },
                                        { key: 'newPatients' as const, label: "New patient alerts", desc: "Notify when new patients are assigned" },
                                        { key: 'billing' as const, label: "Billing updates", desc: "Receive billing and payment notifications" },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold">{item.label}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                                className={`h-6 w-11 ${notifications[item.key] ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer border border-border transition-colors`}
                                            >
                                                <div className={`h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform ${notifications[item.key] ? 'translate-x-5' : 'translate-x-0'} transition-transform`} />
                                            </button>
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
                                            <p className="text-xs text-muted-foreground">{twoFactorEnabled ? '2FA is currently enabled on your account.' : 'Add an extra layer of security to your account.'}</p>
                                        </div>
                                        <button
                                            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                                            className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all ${twoFactorEnabled ? 'bg-emerald-500 text-white border-emerald-600' : 'text-primary hover:underline bg-primary/5 border-primary/10'}`}
                                        >
                                            {twoFactorEnabled ? '2FA Enabled ✓' : 'Enable 2FA'}
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
                                            {(['Light', 'Dark', 'System'] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setTheme(t)}
                                                    className={`px-6 py-3 rounded-xl text-sm font-bold border transition-all ${theme === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 border-border hover:border-primary/30'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">Compact Mode</p>
                                            <p className="text-xs text-muted-foreground">Reduce spacing for more content on screen.</p>
                                        </div>
                                        <button
                                            onClick={() => setCompactMode(!compactMode)}
                                            className={`h-6 w-11 ${compactMode ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer border border-border transition-colors`}
                                        >
                                            <div className={`h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform ${compactMode ? 'translate-x-5' : 'translate-x-0'} transition-transform`} />
                                        </button>
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
                                        <button
                                            onClick={() => setEhrAutoSync(!ehrAutoSync)}
                                            className={`h-6 w-11 ${ehrAutoSync ? 'bg-primary' : 'bg-muted'} rounded-full relative cursor-pointer shadow-inner transition-colors`}
                                        >
                                            <div className={`h-5 w-5 bg-white rounded-full m-0.5 shadow-sm transform ${ehrAutoSync ? 'translate-x-5' : 'translate-x-0'} transition-transform`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Clinical Templates & Dot Phrases */}
                        {activeTab === 'templates' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <FileText className="h-4 w-4 text-primary" />
                                        DOT Phrases & Templates
                                    </h2>
                                    <button
                                        onClick={() => {
                                            const shortcut = prompt("Enter shortcut (e.g. .heart):");
                                            const expansion = prompt("Enter full text expansion:");
                                            if (shortcut && expansion) {
                                                setDotPhrases(prev => [...prev, { id: Math.random().toString(), shortcut, expansion }]);
                                            }
                                        }}
                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                    >
                                        + Create New
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {dotPhrases.map((phrase) => (
                                        <div key={phrase.id} className="p-4 bg-muted/10 border border-border rounded-xl group hover:border-primary/30 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-black text-primary px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">{phrase.shortcut}</span>
                                                <button
                                                    onClick={() => setDotPhrases(prev => prev.filter(p => p.id !== phrase.id))}
                                                    className="p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-foreground/80 font-medium leading-relaxed italic">"{phrase.expansion}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* EHR Sync History */}
                        {activeTab === 'ehr-logs' && (
                            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <History className="h-4 w-4 text-primary" />
                                        Direct Integration Logs
                                    </h2>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">System Live</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-950/20">
                                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Patient</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {syncLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-bold">{log.patient}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${log.status === 'Success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-muted-foreground">{log.timestamp}</td>
                                                    <td className="px-6 py-4 text-[10px] font-mono text-muted-foreground">{log.reference}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-950/20 border-t border-border">
                                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-2">
                                        <LifeBuoy className="h-3 w-3" />
                                        Request Manual Sync Reconciliation
                                    </button>
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
                                    {devices.map((device) => (
                                        <div key={device.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold">{device.name}</p>
                                                <p className="text-xs text-muted-foreground">Last active: {device.lastActive}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveDevice(device.id)}
                                                className="text-xs font-black uppercase tracking-widest text-red-600 hover:underline px-3 py-1 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}

                                    {devices.length === 0 && (
                                        <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
                                            <p className="text-sm font-bold text-muted-foreground">No authorized devices found.</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setIsPairingModalOpen(true)}
                                        className="w-full py-4 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
                                    >
                                        <Smartphone className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                        + Pair New Device
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Pairing Modal */}
                        {isPairingModalOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <h3 className="text-lg font-black uppercase tracking-tight">Pair New Device</h3>
                                        <button onClick={() => setIsPairingModalOpen(false)} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="p-8 space-y-8 text-center">
                                        <div className="mx-auto w-48 h-48 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative group">
                                            <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center">
                                                <QrCode className="h-32 w-32 text-slate-900 dark:text-white" />
                                            </div>
                                            <div className="absolute inset-0 bg-primary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Scan this code with the ChartSpark Mobile App</p>
                                            <p className="text-xs text-slate-500 font-medium">To authorize this device for clinical access and 2FA.</p>
                                        </div>
                                        <button
                                            onClick={confirmPairing}
                                            className="w-full py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95"
                                        >
                                            Confirm Pairing Complete
                                        </button>
                                    </div>
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
