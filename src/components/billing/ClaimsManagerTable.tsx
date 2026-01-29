"use client";

import { useState } from "react";
import {
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Eye,
    MoreHorizontal,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    FileText,
    DollarSign
} from "lucide-react";

export interface Claim {
    id: string;
    patientName: string;
    provider: string;
    payer: string;
    date: string;
    amount: number;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Paid' | 'Denied' | 'Closed';
}

const statusConfig = {
    Draft: { color: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText },
    Sent: { color: "bg-blue-50 text-blue-700 border-blue-100", icon: Clock },
    Accepted: { color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
    Rejected: { color: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertCircle },
    Paid: { color: "bg-emerald-500 text-white border-transparent", icon: CheckCircle2 },
    Denied: { color: "bg-red-50 text-red-700 border-red-100", icon: XCircle },
    Closed: { color: "bg-slate-500 text-white border-transparent", icon: Lock },
};

const mockClaims: Claim[] = [
    { id: "CLM-00124", patientName: "Sarah Connor", provider: "Dr. Sarah K.", payer: "Aetna", date: "Oct 28, 2023", amount: 15000, status: "Accepted" },
    { id: "CLM-00125", patientName: "Michael Reese", provider: "Dr. Sarah K.", payer: "BCBS", date: "Oct 27, 2023", amount: 22500, status: "Sent" },
    { id: "CLM-00126", patientName: "John Smith", provider: "Dr. Robert S.", payer: "Cigna", date: "Oct 26, 2023", amount: 18500, status: "Rejected" },
    { id: "CLM-00127", patientName: "Linda Hamilton", provider: "Dr. Sarah K.", payer: "Medicare", date: "Oct 25, 2023", amount: 9500, status: "Paid" },
    { id: "CLM-00128", patientName: "James Cameron", provider: "Dr. Robert S.", payer: "United", date: "Oct 24, 2023", amount: 31000, status: "Denied" },
];

export function ClaimsManagerTable() {
    const [claims, setClaims] = useState<Claim[]>(mockClaims);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const handleWriteOff = (id: string) => {
        if (!confirm("Are you sure you want to manually write off this claim? This will close the balance permanently.")) return;
        setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'Closed' } : c));
    };

    const filteredClaims = claims.filter(c => {
        const matchesSearch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Search & Filter Bar */}
            <div className="bg-card rounded-2xl border border-border p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm ring-1 ring-border/5">
                <div className="relative flex-1 w-full">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by Claim ID, Patient, or Payer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-muted/20 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
                        {['All', 'Sent', 'Accepted', 'Rejected', 'Paid'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s === 'All' ? null : s)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${(s === 'All' && !statusFilter) || statusFilter === s
                                    ? "bg-card text-primary shadow-sm ring-1 ring-border/10"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <button className="p-2 text-muted-foreground hover:text-primary transition-colors hover:bg-muted rounded-xl">
                        <Filter className="h-4 w-4" />
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap">
                        <Download className="h-3.5 w-3.5" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Claim Info</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Provider / Payer</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredClaims.map((claim) => {
                                const config = statusConfig[claim.status];
                                const StatusIcon = config.icon as any;

                                return (
                                    <tr key={claim.id} className="group hover:bg-primary/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black font-mono text-muted-foreground uppercase opacity-60 mb-0.5">{claim.id}</span>
                                                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{claim.patientName}</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{claim.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground">{claim.provider}</span>
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{claim.payer}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {claim.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-foreground">${(claim.amount / 100).toFixed(2)}</span>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                                    <DollarSign className="h-3 w-3" />
                                                    <span>837P Generated</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => handleWriteOff(claim.id)}
                                                    className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                                    title="Manual Write-off"
                                                >
                                                    <DollarSign className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-all">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/10">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Showing <span className="text-foreground">{filteredClaims.length}</span> of <span className="text-foreground">{claims.length}</span> Claims
                    </p>
                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-white disabled:opacity-40 transition-all shadow-sm" disabled>
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-white transition-all shadow-sm">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
