"use client";

import { useState } from "react";
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
function UserBillingView() {
    const stats = currentUserBillingStats;
    const topCodes = Object.entries(stats.codes_used)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

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

            {/* CPT Codes Used */}
            <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Most Used Billing Codes
                </h3>
                <div className="space-y-3">
                    {topCodes.map(([code, count]) => (
                        <div key={code} className="flex items-center gap-4">
                            <span className="font-mono text-sm font-semibold text-foreground w-16">{code}</span>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{ width: `${(count / Math.max(...Object.values(stats.codes_used))) * 100}%` }}
                                />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ADMIN View Component
function AdminBillingView() {
    const stats = orgBillingStats;

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
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h3 className="font-bold text-foreground">Team Billing Breakdown</h3>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg flex items-center gap-1">
                            <Filter className="h-4 w-4" /> Filter
                        </button>
                        <button className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg flex items-center gap-1">
                            <Download className="h-4 w-4" /> Export
                        </button>
                    </div>
                </div>
                <table className="min-w-full text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Provider</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Notes</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Billing</th>
                            <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase">Fees</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.users.map((user) => (
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
    );
}

// SUPER_ADMIN View Component
function SuperAdminBillingView() {
    const stats = platformBillingStats;

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
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-5 w-5" /> Organization Billing
                    </h3>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg flex items-center gap-1">
                            <Filter className="h-4 w-4" /> Filter
                        </button>
                        <button className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg flex items-center gap-1">
                            <Download className="h-4 w-4" /> Export
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
                        {stats.organizations.map((org) => (
                            <tr key={org.organization_id} className="hover:bg-muted/30 cursor-pointer">
                                <td className="px-6 py-4 font-medium text-foreground">{org.organization_name}</td>
                                <td className="px-6 py-4 text-muted-foreground">{org.total_users}</td>
                                <td className="px-6 py-4 text-muted-foreground">{org.total_notes}</td>
                                <td className="px-6 py-4 font-semibold text-foreground">{formatCurrency(org.total_billing)}</td>
                                <td className="px-6 py-4 text-emerald-600 font-medium">{formatCurrency(org.total_fees)}</td>
                            </tr>
                        ))}
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
                                    <span className="px-2 py-1 bg-primary/10 text-primary font-mono font-bold rounded">
                                        {config.fee_percentage}%
                                    </span>
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
                                    <button className="text-primary hover:underline text-sm font-medium">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function BillingPage() {
    const [currentRole, setCurrentRole] = useState<Role>(DEMO_ROLE);

    return (
        <>
            <Header
                title="Billing Dashboard"
                description="Track revenue, billing codes, and platform fees."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Billing" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full">
                {/* Demo Role Switcher */}
                <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Demo Mode - View as:</span>
                        </div>
                        <div className="flex gap-2">
                            {(["USER", "ADMIN", "SUPER_ADMIN"] as Role[]).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setCurrentRole(role)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentRole === role
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                                        }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Role-based Content */}
                {currentRole === "USER" && <UserBillingView />}
                {currentRole === "ADMIN" && <AdminBillingView />}
                {currentRole === "SUPER_ADMIN" && <SuperAdminBillingView />}
            </div>
        </>
    );
}
