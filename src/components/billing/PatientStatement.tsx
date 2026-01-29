"use client";

import { Printer, Download, Mail, DollarSign, Calendar, FileText } from "lucide-react";
import { StatementService, PatientBalance } from "@/lib/managed-billing/statement-service";

interface PatientStatementProps {
    balance: PatientBalance;
}

export function PatientStatement({ balance }: PatientStatementProps) {
    const format = StatementService.formatCurrency;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-border shadow-2xl overflow-hidden max-w-4xl mx-auto ring-1 ring-border/5 animate-in fade-in zoom-in-95 duration-500">
            {/* Header / Branding */}
            <div className="bg-slate-50 dark:bg-slate-800/50 px-10 py-12 border-b border-border">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic">CS</div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic">ChartSpark<span className="text-primary not-italic">Billing</span></h1>
                        </div>
                        <div className="text-xs text-muted-foreground font-bold space-y-1">
                            <p>123 Medical Plaza, Health City, ST 12345</p>
                            <p>Phone: (555) 000-1111 | Billing: Ext 402</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-black text-primary uppercase tracking-tighter mb-1">Statement</h2>
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <p>ID: ST-{Math.floor(Math.random() * 999999)}</p>
                            <p>Date: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Patient & Billing Info */}
            <div className="grid grid-cols-2 gap-10 px-10 py-10 bg-card/20">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" /> Bill To
                    </h3>
                    <div className="space-y-1">
                        <p className="text-lg font-black text-foreground">{balance.patientName}</p>
                        <p className="text-xs text-muted-foreground font-medium">456 Resistance Way</p>
                        <p className="text-xs text-muted-foreground font-medium">Los Angeles, CA 90001</p>
                    </div>
                </div>
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 flex flex-col justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Amount Due</h3>
                    <p className="text-4xl font-black text-primary">{format(balance.totalDue)}</p>
                    <p className="text-[10px] font-bold text-primary/60 mt-2">Due by: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Itemized Table */}
            <div className="px-10 py-6">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Billed</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Ins. Paid</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Adj.</th>
                            <th className="py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">You Owe</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {balance.items.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-4 text-xs font-bold text-muted-foreground">{item.date}</td>
                                <td className="py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-foreground">{item.description}</span>
                                        <span className="text-[10px] font-black text-primary/60 uppercase">Insurance Verified</span>
                                    </div>
                                </td>
                                <td className="py-4 text-right text-xs font-medium text-muted-foreground">{format(item.billed)}</td>
                                <td className="py-4 text-right text-xs font-medium text-emerald-600">-{format(item.paidByInsurance)}</td>
                                <td className="py-4 text-right text-xs font-medium text-amber-600">-{format(item.adjustments)}</td>
                                <td className="py-4 text-right text-sm font-black text-foreground">{format(item.patientResponsibility)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer / Actions */}
            <div className="px-10 py-8 border-t border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95">
                        <DollarSign className="h-4 w-4" />
                        Pay Online
                    </button>
                    <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-card border border-border rounded-xl transition-all">
                        <Printer className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-card border border-border rounded-xl transition-all">
                        <Download className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-card border border-border rounded-xl transition-all">
                        <Mail className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40">HIPAA Compliant Electronic Statement</p>
            </div>
        </div>
    );
}
