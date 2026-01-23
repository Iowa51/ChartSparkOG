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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FeaturePackageModal } from "./FeaturePackageModal";

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

export function AdminDashboardClient({ stats, recentSubmissions }: AdminDashboardClientProps) {
    const [selectedFilter, setSelectedFilter] = useState<"all" | "pending" | "approved">("all");
    const [showFeatureModal, setShowFeatureModal] = useState(false);

    const filteredSubmissions = useMemo(() => {
        if (selectedFilter === "all") return recentSubmissions;
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_audit':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Pending Audit</span>;
            case 'pending_approval':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Pending Approval</span>;
            case 'approved':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Approved</span>;
            case 'rejected':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">Rejected</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Admin Dashboard
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage your organization's users and submissions
                </p>
            </div>

            {/* Stats Cards / Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <button
                    onClick={() => setSelectedFilter("all")}
                    className={cn(
                        "text-left bg-white dark:bg-slate-900 rounded-2xl border p-6 transition-all duration-200",
                        selectedFilter === "all"
                            ? "border-blue-500 ring-2 ring-blue-500/10 shadow-lg scale-[1.02]"
                            : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.totalUsers}
                            </p>
                            <p className="text-sm text-slate-500 font-bold">Total Users</p>
                        </div>
                    </div>
                    <p className="text-xs text-emerald-600 mt-3 font-bold">{stats.activeUsers} active</p>
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 opacity-80">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.notesThisMonth}
                            </p>
                            <p className="text-sm text-slate-500 font-bold">Notes This Month</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setSelectedFilter("pending")}
                    className={cn(
                        "text-left bg-white dark:bg-slate-900 rounded-2xl border p-6 transition-all duration-200",
                        selectedFilter === "pending"
                            ? "border-amber-500 ring-2 ring-amber-500/10 shadow-lg scale-[1.02]"
                            : "border-slate-200 dark:border-slate-800 hover:border-amber-300"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.pendingSubmissions}
                            </p>
                            <p className="text-sm text-slate-500 font-bold">Pending Submissions</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => setSelectedFilter("approved")}
                    className={cn(
                        "text-left bg-white dark:bg-slate-900 rounded-2xl border p-6 transition-all duration-200",
                        selectedFilter === "approved"
                            ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-lg scale-[1.02]"
                            : "border-slate-200 dark:border-slate-800 hover:border-emerald-300"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.approvalRate}%
                            </p>
                            <p className="text-sm text-slate-500 font-bold">Approval Rate</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <Link
                    href="/admin/users?action=create"
                    className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-bold">Add User</span>
                </Link>
                <Link
                    href="/admin/submissions"
                    className="flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                >
                    <FileText className="h-5 w-5" />
                    <span className="font-bold">Review Submissions</span>
                </Link>
                <button
                    onClick={() => setShowFeatureModal(true)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-teal-500/20"
                >
                    <Zap className="h-5 w-5" />
                    <span className="font-bold">Assign Features</span>
                </button>
            </div>

            {/* Feature Package Modal */}
            <FeaturePackageModal
                isOpen={showFeatureModal}
                onClose={() => setShowFeatureModal(false)}
                users={[]}
            />

            {/* Recent Submissions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                            {selectedFilter === "all" ? "Recent Submissions" : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Submissions`}
                        </h3>
                        {selectedFilter !== "all" && (
                            <button
                                onClick={() => setSelectedFilter("all")}
                                className="text-[10px] text-primary font-black uppercase tracking-widest mt-1 hover:underline"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                    <Link href="/admin/submissions" className="text-xs font-black uppercase tracking-[0.2em] text-primary hover:underline flex items-center gap-1">
                        View All <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Provider</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">CPT</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredSubmissions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">
                                        No submissions matching this filter
                                    </td>
                                </tr>
                            ) : (
                                filteredSubmissions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                            {sub.patients?.first_name} {sub.patients?.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                            {sub.users?.first_name} {sub.users?.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-primary bg-primary/5 rounded-lg w-fit">
                                            {sub.cpt_code}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                            ${sub.billing_amount?.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(sub.status)}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Important Notice */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-black text-blue-800 dark:text-blue-200 uppercase tracking-wider text-sm">Organization-Scoped Access</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 font-medium italic">
                            You can only view and manage users and data within your organization.
                            For platform-wide access, contact your Super Admin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
