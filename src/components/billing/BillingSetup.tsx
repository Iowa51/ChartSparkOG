"use client";

import { useState } from "react";
import {
    Building2,
    ShieldCheck,
    Hash,
    MapPin,
    Zap,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";

export function BillingSetup() {
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsTesting(false);
        setTestResult('success');
    };

    return (
        <div className="space-y-6">
            {/* Card 1: Billing Provider */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Building2 className="h-4 w-4 text-primary" />
                        Billing Provider (Organization)
                    </h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Organization Name</label>
                            <input
                                placeholder="Hospital or Practice Name"
                                className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Billing NPI</label>
                            <div className="relative">
                                <input
                                    placeholder="10-digit NPI"
                                    className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm pr-20"
                                />
                                <button className="absolute right-2 top-1.5 px-2 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg border border-primary/20 hover:bg-primary/20 transition-all">
                                    VALIDATE
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tax ID (TIN/EIN)</label>
                            <input
                                placeholder="XX-XXXXXXX"
                                className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                            <input
                                placeholder="(555) 000-0000"
                                className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Practice Street Address</label>
                        <input
                            placeholder="123 Main St, Suite 100"
                            className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                        />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</label>
                            <input className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">State</label>
                            <input maxLength={2} className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Zip Code</label>
                            <input className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Office Ally Connection */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h2 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Zap className="h-4 w-4 text-primary" />
                        Office Ally Connection
                    </h2>
                    {testResult === 'success' && (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 animate-in zoom-in-95 duration-300">
                            <CheckCircle2 className="h-3 w-3" />
                            CONNECTED
                        </span>
                    )}
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sender ID</label>
                            <input
                                defaultValue="SNDR_12345"
                                className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Environment</label>
                            <select className="w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm appearance-none">
                                <option>Sandbox (Test Mode)</option>
                                <option>Production (Live)</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-sm font-bold">Clearinghouse Credentials</p>
                                <p className="text-xs text-muted-foreground">SFTP and API credentials are encrypted at rest using AES-256 for HIPAA compliance.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="w-full py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Testing Connection...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
                                    Test Connectivity Plan
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
