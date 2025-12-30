"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import {
    Search,
    DollarSign,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    FileText,
    ArrowRight,
    Users,
    Building2,
    Filter,
    Download,
    BarChart3,
    Percent,
    X,
} from "lucide-react";
import {
    currentUserBillingStats,
    orgBillingStats,
    platformBillingStats,
    feeConfigurations,
} from "@/lib/demo-data/billing";
import { Role } from "@/types/database";

// Demo: Toggle role to see different views
const DEMO_ROLE: Role = "USER"; // Change to "ADMIN" or "SUPER_ADMIN" to test

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

// USER View Component
function UserBillingView({ isPendingOnly }: { isPendingOnly: boolean }) {
    const stats = currentUserBillingStats;
    const topCodes = Object.entries(stats.codes_used)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const [statusFilter, setStatusFilter] = useState<string | null>(isPendingOnly ? "Pending" : null);
    const [searchQuery, setSearchQuery] = useState("");

    const allClaims = [
        { id: "C-1004", patient: "Arthur Smith", service: "T2DM Management", date: "Oct 24, 2023", amount: 185.00, status: "Ready to Submit", type: "Pending" },
        { id: "C-1005", patient: "John Doe", service: "Acute Pharyngitis", date: "Today", amount: 165.00, status: "Missing ICD-10", type: "Pending" },
        { id: "C-1001", patient: "Maria Rodriguez", service: "Hypertension F/U", date: "Oct 20, 2023", amount: 150.00, status: "Paid", type: "Paid" },
        { id: "C-1002", patient: "James Wilson", service: "Mental Health Session", date: "Oct 15, 2023", amount: 200.00, status: "Overdue", type: "Overdue" },
        { id: "C-1003", patient: "Linda Blane", service: "Initial Consultation", date: "Oct 12, 2023", amount: 250.00, status: "Paid", type: "Paid" },
    ];

    const filteredClaims = allClaims.filter(c => {
        const matchesStatus = !statusFilter || c.type === statusFilter;
        const matchesSearch = c.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const exportToCSV = () => {
        const headers = ["Invoice ID", "Patient", "Service", "Date", "Amount", "Status"];
        const rows = filteredClaims.map(c => [
            c.id,
            c.patient,
            c.service,
            c.date,
            c.amount,
            c.status
        ]);

        const csv = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `billing_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Notes Generated</p>
                            <p className="text-2xl font-bold text-foreground">{stats.notes_generated}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Billing</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_billing)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Per Note</p>
                            <p className="text-2xl font-bold text-foreground">
                                {formatCurrency(stats.total_billing / stats.notes_generated)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CPT Codes Used */}
                <div className="bg-card rounded-xl p-6 border border-border h-full">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Top Codes
                    </h3>
                    <div className="space-y-4">
                        {topCodes.map(([code, count]) => (
                            <div key={code} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span>{code}</span>
                                    <span>{count} uses</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full"
                                        style={{ width: `${(count / Math.max(...Object.values(stats.codes_used))) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Claims Filter & List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                        <div className="relative flex-1 w-full">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search claims or patients..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-muted/20 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
                                {["Pending", "Paid", "Overdue"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s
                                            ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-border/10"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            {(statusFilter || searchQuery) && (
                                <button
                                    onClick={() => { setStatusFilter(null); setSearchQuery(""); }}
                                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                                    title="Reset filters"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </button>
                        </div>
                    </div>

                    <div className={`bg-card rounded-xl border border-border overflow-hidden shadow-sm`}>
                        <div className="overflow-x-auto text-sm">
                            <table className="min-w-full text-left">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">ID</th>
                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Patient</th>
                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground text-right">Amount</th>
                                        <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredClaims.length > 0 ? filteredClaims.map((claim) => (
                                        <tr key={claim.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{claim.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground">{claim.patient}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase">{claim.service}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-foreground">{formatCurrency(claim.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${claim.type === "Pending" ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" :
                                                    claim.type === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" :
                                                        "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                                    }`}>
                                                    {claim.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                                No claims found matching these filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ADMIN View Component
function AdminBillingView() {
    const [stats, setStats] = useState(orgBillingStats);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);

    const filteredUsers = stats.users.filter(u => {
        const matchesSearch = u.user_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? u.notes_generated > 0 : u.notes_generated === 0);
        return matchesSearch && matchesStatus;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        const valA = a[key as keyof typeof a];
        const valB = b[key as keyof typeof b];

        if (typeof valA === "string" && typeof valB === "string") {
            return direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return direction === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const handleExport = () => {
        const headers = ["Provider", "Notes", "Billing Amount", "Fee Amount"];
        const rows = sortedUsers.map(u => [
            u.user_name,
            u.notes_generated,
            formatCurrency(u.billing_amount).replace('$', ''),
            formatCurrency(u.fee_amount).replace('$', '')
        ]);

        const csv = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `admin_billing_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Org Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Team Members</p>
                            <p className="text-2xl font-bold text-foreground">{stats.total_users}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Notes</p>
                            <p className="text-2xl font-bold text-foreground">{stats.total_notes}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Org Revenue</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_billing)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <Percent className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Platform Fees</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_fees)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Breakdown Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-muted/30">
                    <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground mr-auto">Team Billing Breakdown</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search provider..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none w-48"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                            {["all", "active"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        {(searchQuery || statusFilter !== "all") && (
                            <button
                                onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            <Download className="h-3.5 w-3.5" /> Export CSV
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-muted/50">
                            <tr>
                                <th onClick={() => handleSort("user_name")} className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary">Provider</th>
                                <th onClick={() => handleSort("notes_generated")} className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary">Notes</th>
                                <th onClick={() => handleSort("billing_amount")} className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary">Billing</th>
                                <th onClick={() => handleSort("fee_amount")} className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase cursor-pointer hover:text-primary">Fees</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedUsers.map((user) => (
                                <tr key={user.user_id} className="hover:bg-muted/30">
                                    <td className="px-6 py-4 font-medium text-foreground">{user.user_name}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{user.notes_generated}</td>
                                    <td className="px-6 py-4 font-semibold text-foreground">{formatCurrency(user.billing_amount)}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{formatCurrency(user.fee_amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// SUPER_ADMIN View Component
function SuperAdminBillingView() {
    const [stats, setStats] = useState(platformBillingStats);
    const [searchQuery, setSearchQuery] = useState("");
    const [orgStatusFilter, setOrgStatusFilter] = useState("all");
    const [editingFee, setEditingFee] = useState<string | null>(null);
    const [newFee, setNewFee] = useState<number>(0);

    const filteredOrgs = stats.organizations.filter(org => {
        const matchesSearch = org.organization_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = orgStatusFilter === "all" || (orgStatusFilter === "high_volume" ? org.total_notes > 300 : org.total_notes <= 300);
        return matchesSearch && matchesStatus;
    });

    const handleEditFee = (orgId: string, currentFee: number) => {
        setEditingFee(orgId);
        setNewFee(currentFee);
    };

    const handleSaveFee = (orgId: string) => {
        alert(`Fee for org ${orgId} updated to ${newFee}%`);
        setEditingFee(null);
    };

    const handleExport = () => {
        const headers = ["Organization", "Users", "Notes", "Billing", "Fees"];
        const rows = filteredOrgs.map(org => [
            org.organization_name,
            org.total_users,
            org.total_notes,
            formatCurrency(org.total_billing).replace('$', ''),
            formatCurrency(org.total_fees).replace('$', '')
        ]);

        const csv = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `platform_billing_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Platform-wide Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground">
                    <p className="text-sm opacity-80">Platform Revenue</p>
                    <p className="text-3xl font-bold">{formatCurrency(stats.total_billing)}</p>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <p className="text-sm text-muted-foreground">Fees Collected</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.total_fees_collected)}</p>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <p className="text-sm text-muted-foreground">Organizations</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total_organizations}</p>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total_users}</p>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border">
                    <p className="text-sm text-muted-foreground">Total Notes</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total_notes.toLocaleString()}</p>
                </div>
            </div>

            {/* Organizations Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shardow-sm">
                <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-muted/30">
                    <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground mr-auto flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" /> Organization Billing
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter organizations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-sm bg-card border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none w-48"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
                            {["all", "high_volume"].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setOrgStatusFilter(s)}
                                    className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${orgStatusFilter === s
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {s === "all" ? "All" : "High Vol"}
                                </button>
                            ))}
                        </div>
                        {(searchQuery || orgStatusFilter !== "all") && (
                            <button
                                onClick={() => { setSearchQuery(""); setOrgStatusFilter("all"); }}
                                className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            <Download className="h-3.5 w-3.5" /> Export CSV
                        </button>
                    </div>
                </div>
                <table className="min-w-full text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Organization</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Users</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Notes</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Billing</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Fees</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredOrgs.length > 0 ? filteredOrgs.map((org) => (
                            <tr key={org.organization_id} className="hover:bg-muted/30 cursor-pointer group transition-colors">
                                <td className="px-6 py-4 font-bold text-foreground group-hover:text-primary transition-colors">{org.organization_name}</td>
                                <td className="px-6 py-4 text-muted-foreground">{org.total_users}</td>
                                <td className="px-6 py-4 text-muted-foreground">{org.total_notes}</td>
                                <td className="px-6 py-4 font-black text-foreground">{formatCurrency(org.total_billing)}</td>
                                <td className="px-6 py-4 text-emerald-600 font-black">{formatCurrency(org.total_fees)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                    No organizations matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Fee Configuration */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary" /> Platform Fee Configuration
                    </h3>
                </div>
                <table className="min-w-full text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Organization</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Fee %</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Collection Method</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {feeConfigurations.map((config) => (
                            <tr key={config.org_id} className="hover:bg-muted/30">
                                <td className="px-6 py-4 font-medium text-foreground">{config.org_name}</td>
                                <td className="px-6 py-4">
                                    {editingFee === config.org_id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={newFee}
                                                onChange={(e) => setNewFee(Number(e.target.value))}
                                                className="w-16 px-2 py-1 bg-card border border-border rounded text-sm"
                                            />
                                            <span className="text-sm">%</span>
                                        </div>
                                    ) : (
                                        <span className="px-2 py-1 bg-primary/10 text-primary font-mono font-bold rounded">
                                            {config.fee_percentage}%
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.method === "deduct_from_billing"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        }`}>
                                        {config.method === "deduct_from_billing" ? "Deduct from Billing" : "Charge Separately"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingFee === config.org_id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleSaveFee(config.org_id)}
                                                className="text-emerald-600 font-bold text-xs"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingFee(null)}
                                                className="text-muted-foreground font-medium text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEditFee(config.org_id, config.fee_percentage)}
                                            className="text-primary hover:underline text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Organizations Table (Secondary for Super Admin) */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-5 w-5" /> Detailed Org Revenue
                    </h3>
                </div>
                <table className="min-w-full text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Organization</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Users</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Notes</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Billing</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Fees</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredOrgs.map((org) => (
                            <tr key={org.organization_id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-bold text-foreground">{org.organization_name}</td>
                                <td className="px-6 py-4 text-muted-foreground">{org.total_users}</td>
                                <td className="px-6 py-4 text-muted-foreground">{org.total_notes}</td>
                                <td className="px-6 py-4 font-black text-foreground">{formatCurrency(org.total_billing)}</td>
                                <td className="px-6 py-4 text-emerald-600 font-black">{formatCurrency(org.total_fees)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BillingContent() {
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get("status");
    const isPendingOnly = statusFilter === "pending";
    const [currentRole, setCurrentRole] = useState<Role>(DEMO_ROLE);

    return (
        <>
            <Header
                title="Financial Governance Hub"
                description="Manage billing cycles, verify CPT compliance, and oversee revenue distributions."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
                {/* Demo Role Switcher */}
                <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white shadow-xl shadow-slate-200 dark:shadow-none">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Demo Simulation Environment</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold mr-2 text-slate-400">IMPERSONATE ROLE:</span>
                            <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                                {(["USER", "ADMIN", "SUPER_ADMIN"] as Role[]).map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => setCurrentRole(role)}
                                        className={`px-4 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all ${currentRole === role
                                            ? "bg-primary text-primary-foreground shadow-lg"
                                            : "text-slate-400 hover:text-white hover:bg-slate-700"
                                            }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Role-based Content */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {currentRole === "USER" && <UserBillingView isPendingOnly={isPendingOnly} />}
                    {currentRole === "ADMIN" && <AdminBillingView />}
                    {currentRole === "SUPER_ADMIN" && <SuperAdminBillingView />}
                </div>
            </div>
        </>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div>Loading billing...</div>}>
            <BillingContent />
        </Suspense>
    );
}
