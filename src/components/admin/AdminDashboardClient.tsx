"use client";

import { useState, useMemo } from "react";
import {
    Users,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    ArrowRight,
    Plus,
    Zap,
    Shield,
    BarChart3,
    Activity,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FeaturePackageModal } from "./FeaturePackageModal";
import { CSCard, CSPageHeader, CSBadge, CSButton } from "@/components/cs";

interface Submission {
    id: string;
    cpt_code: string;
    status: string;
    billing_amount: number;
    created_at: string;
    patients: {
        first_name: string;
        last_name: string;
    } | null;
    users: {
        first_name: string;
        last_name: string;
    } | null;
}

interface AdminDashboardClientProps {
    stats: {
        totalUsers: number;
        activeUsers: number;
        notesThisMonth: number;
        pendingSubmissions: number;
        approvalRate: number;
    };
    recentSubmissions: Submission[];
}

const statusBadgeVariant = (status: string): 'warning' | 'info' | 'success' | 'danger' | 'muted' => {
    switch (status) {
        case 'pending_audit': return 'warning';
        case 'pending_approval': return 'info';
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        default: return 'muted';
    }
};

const statusLabel = (status: string): string => {
    switch (status) {
        case 'pending_audit': return 'Pending Audit';
        case 'pending_approval': return 'Pending Approval';
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        default: return status;
    }
};

export function AdminDashboardClient({ stats, recentSubmissions }: AdminDashboardClientProps) {
    const [selectedFilter, setSelectedFilter] = useState<"all" | "pending" | "approved" | "thisMonth">("all");
    const [showFeatureModal, setShowFeatureModal] = useState(false);

    const filteredSubmissions = useMemo(() => {
        if (selectedFilter === "all") return recentSubmissions;
        if (selectedFilter === "thisMonth") {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return recentSubmissions.filter(s => new Date(s.created_at) >= startOfMonth);
        }
        if (selectedFilter === "pending") {
            return recentSubmissions.filter(s =>
                ['pending_audit', 'pending_approval'].includes(s.status)
            );
        }
        if (selectedFilter === "approved") {
            return recentSubmissions.filter(s => s.status === 'approved');
        }
        return recentSubmissions;
    }, [selectedFilter, recentSubmissions]);

    const statTiles = [
        { key: "all" as const, label: "Total Users", value: stats.totalUsers, icon: Users, sub: `${stats.activeUsers} active` },
        { key: "thisMonth" as const, label: "Notes This Month", value: stats.notesThisMonth, icon: FileText, sub: null },
        { key: "pending" as const, label: "Pending Submissions", value: stats.pendingSubmissions, icon: Clock, sub: null },
        { key: "approved" as const, label: "Approval Rate", value: `${stats.approvalRate}%`, icon: TrendingUp, sub: null },
    ];

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            <CSPageHeader
                title="Admin Dashboard"
                subtitle="Manage your organization's users and submissions"
            />

            {/* Stats Cards / Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statTiles.map((tile) => {
                    const Icon = tile.icon;
                    const isActive = selectedFilter === tile.key;
                    return (
                        <button
                            key={tile.key}
                            type="button"
                            onClick={() => setSelectedFilter(tile.key)}
                            className="text-left"
                        >
                            <CSCard
                                className={cn(
                                    "transition-colors",
                                    isActive
                                        ? "border-[var(--cs-teal)] ring-1 ring-[var(--cs-teal)]/20"
                                        : "hover:border-[var(--cs-teal)]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-md bg-[var(--cs-teal-light)] flex items-center justify-center">
                                        <Icon className="h-4 w-4 text-[var(--cs-teal)]" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-[var(--cs-text-primary)]">
                                            {tile.value}
                                        </p>
                                        <p className="text-xs text-[var(--cs-text-muted)]">{tile.label}</p>
                                    </div>
                                </div>
                                {tile.sub && (
                                    <p className="text-xs text-[var(--cs-success)] mt-2">{tile.sub}</p>
                                )}
                            </CSCard>
                        </button>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                {[
                    { href: "/admin/invitations", icon: Plus, label: "Invite User" },
                    { href: "/admin/submissions", icon: FileText, label: "Review Submissions" },
                    { href: "/admin/analytics", icon: Activity, label: "Analytics" },
                    { href: "/admin/security/audit-logs", icon: Shield, label: "Security Logs" },
                    { href: "/admin/reports", icon: BarChart3, label: "Reports" },
                ].map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link key={action.href} href={action.href}>
                            <CSButton variant="secondary" className="w-full" leftIcon={<Icon className="h-4 w-4" />}>
                                {action.label}
                            </CSButton>
                        </Link>
                    );
                })}
                <CSButton
                    variant="primary"
                    className="w-full"
                    onClick={() => setShowFeatureModal(true)}
                    leftIcon={<Zap className="h-4 w-4" />}
                >
                    Assign Features
                </CSButton>
            </div>

            {/* Feature Package Modal */}
            <FeaturePackageModal
                isOpen={showFeatureModal}
                onClose={() => setShowFeatureModal(false)}
                users={[]}
            />

            {/* Recent Submissions Table */}
            <CSCard padding="none">
                <div className="px-5 py-4 border-b border-[var(--cs-card-border)] flex items-center justify-between bg-[var(--cs-teal-xlight)]">
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--cs-text-primary)]">
                            {selectedFilter === "all" ? "Recent Submissions" : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Submissions`}
                        </h3>
                        {selectedFilter !== "all" && (
                            <button
                                onClick={() => setSelectedFilter("all")}
                                className="text-xs text-[var(--cs-teal)] font-medium mt-1 hover:underline"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                    <Link href="/admin/submissions" className="text-sm font-medium text-[var(--cs-teal)] hover:text-[var(--cs-teal-mid)] flex items-center gap-1">
                        View All <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--cs-teal-xlight)]">
                            <tr>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Patient</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Provider</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">CPT</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Amount</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Status</th>
                                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--cs-text-muted)] uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--cs-card-border)]">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-[var(--cs-text-muted)] text-sm">
                                        No submissions matching this filter
                                    </td>
                                </tr>
                            ) : (
                                filteredSubmissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-[var(--cs-teal-xlight)] transition-colors">
                                        <td className="px-5 py-3 text-sm font-medium text-[var(--cs-text-primary)]">
                                            {sub.patients?.first_name} {sub.patients?.last_name}
                                        </td>
                                        <td className="px-5 py-3 text-sm text-[var(--cs-text-secondary)]">
                                            {sub.users?.first_name} {sub.users?.last_name}
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-semibold text-[var(--cs-teal)] bg-[var(--cs-teal-light)] px-2 py-0.5 rounded">
                                                {sub.cpt_code}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-sm font-medium text-[var(--cs-text-primary)]">
                                            ${sub.billing_amount?.toFixed(2)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <CSBadge variant={statusBadgeVariant(sub.status)}>
                                                {statusLabel(sub.status)}
                                            </CSBadge>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-[var(--cs-text-muted)]">
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CSCard>

            {/* Organization-Scoped Notice */}
            <CSCard variant="muted" className="mt-6">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-md bg-[var(--cs-info-light)] flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-4 w-4 text-[var(--cs-info)]" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--cs-text-primary)]">Organization-Scoped Access</h4>
                        <p className="text-sm text-[var(--cs-text-secondary)] mt-1">
                            You can only view and manage users and data within your organization.
                            For platform-wide access, contact your Super Admin.
                        </p>
                    </div>
                </div>
            </CSCard>
        </div>
    );
}
