"use client";

import { useState } from "react";
import {
    Plus,
    Shield,
    Activity,
    CheckCircle2,
    AlertCircle,
    Clock,
    RotateCw,
    Edit2,
    Trash2,
    CreditCard
} from "lucide-react";

export interface InsuranceFormProps {
    patientId: string;
}

export function InsuranceForm({ patientId }: InsuranceFormProps) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [lastVerified, setLastVerified] = useState<string | null>("Oct 28, 2023");

    const handleVerify = async () => {
        setIsVerifying(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsVerifying(false);
        setLastVerified(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    };

    const coverage = {
        provider: "Aetna Better Health",
        payerId: "60054",
        memberId: "W123456789",
        groupNumber: "RX8822",
        priority: "Primary",
        status: "Active",
        planType: "PPO",
        effectiveDate: "01/01/2023"
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header with Eligibility Pulse */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card rounded-2xl p-6 border border-border shadow-sm ring-1 ring-border/5">
                <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Insurance & Coverage
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Manage patient insurance policies and verify eligibility.</p>
                </div>

                <div className="flex items-center gap-4 bg-muted/20 px-4 py-2 rounded-xl border border-border/50">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Eligibility Pulse</span>
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                            <Activity className="h-3 w-3 animate-pulse" />
                            Verified Active
                        </span>
                    </div>
                    <div className="h-8 w-[1px] bg-border" />
                    <button
                        onClick={handleVerify}
                        disabled={isVerifying}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-2"
                    >
                        {isVerifying ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                        Run Re-Check
                    </button>
                </div>
            </div>

            {/* Insurance Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Coverage Card */}
                <div className="bg-card rounded-2xl border border-primary/20 shadow-sm overflow-hidden ring-1 ring-primary/5 flex flex-col">
                    <div className="px-6 py-4 border-b border-primary/10 bg-primary/5 flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Primary Coverage</span>
                        <div className="flex items-center gap-2">
                            <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors hover:bg-white rounded-lg"><Edit2 className="h-3.5 w-3.5" /></button>
                            <button className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors hover:bg-white rounded-lg"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                    </div>

                    <div className="p-6 flex-1 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-border">
                                <CreditCard className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-black text-foreground">{coverage.provider}</p>
                                <p className="text-xs text-muted-foreground">Payer ID: {coverage.payerId}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Member ID</p>
                                <p className="text-sm font-bold font-mono">{coverage.memberId}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Group #</p>
                                <p className="text-sm font-bold font-mono">{coverage.groupNumber}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Plan Type</p>
                                <p className="text-sm font-bold">{coverage.planType}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Effective Date</p>
                                <p className="text-sm font-bold">{coverage.effectiveDate}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground font-medium">Last Verified: {lastVerified}</span>
                            </div>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Add Secondary Coverage Placeholder */}
                <button className="bg-slate-50 border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="h-14 w-14 rounded-full bg-white border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all">
                        <Plus className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-foreground">Add Secondary Insurance</p>
                        <p className="text-xs text-muted-foreground mt-1">Capture COB (Coordination of Benefits)</p>
                    </div>
                </button>
            </div>

            {/* Compliance / Disclaimer */}
            <div className="p-4 bg-muted/20 rounded-xl border border-border/50 flex gap-3 items-start">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Insurance verification is performed via Office Ally real-time EDI 270/271 queries. Resulting data represents the payer's system status at the time of query and is not a guarantee of payment.
                </p>
            </div>
        </div>
    );
}
