import { createClient } from "@/lib/supabase/server";
import {
    Users,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    ArrowRight,
    Plus,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
    const supabase = await createClient();

    let stats = {
        totalUsers: 0,
        activeUsers: 0,
        notesThisMonth: 0,
        pendingSubmissions: 0,
        approvalRate: 0,
    };

    let recentSubmissions: any[] = [];
    let organizationId: string | null = null;

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get admin's organization
                const { data: profile } = await supabase
                    .from('users')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();

                organizationId = profile?.organization_id;

                if (organizationId) {
                    // Get users count for this organization
                    const { count: userCount } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId);
                    stats.totalUsers = userCount || 0;

                    const { count: activeCount } = await supabase
                        .from('users')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId)
                        .eq('is_active', true);
                    stats.activeUsers = activeCount || 0;

                    // Get pending submissions
                    const { count: pendingCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', organizationId)
                        .in('status', ['pending_audit', 'pending_approval']);
                    stats.pendingSubmissions = pendingCount || 0;

                    // Get recent submissions
                    const { data: subsData } = await supabase
                        .from('submissions')
                        .select(`
                            id,
                            cpt_code,
                            status,
                            billing_amount,
                            created_at,
                            patients(first_name, last_name),
                            users(first_name, last_name)
                        `)
                        .eq('organization_id', organizationId)
                        .order('created_at', { ascending: false })
                        .limit(10);
                    recentSubmissions = subsData || [];
                }
            }
        } catch (e) {
            console.error("Error fetching admin stats:", e);
        }
    }

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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.totalUsers}
                            </p>
                            <p className="text-sm text-slate-500">Total Users</p>
                        </div>
                    </div>
                    <p className="text-xs text-emerald-600 mt-3">{stats.activeUsers} active</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.notesThisMonth}
                            </p>
                            <p className="text-sm text-slate-500">Notes This Month</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.pendingSubmissions}
                            </p>
                            <p className="text-sm text-slate-500">Pending Submissions</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.approvalRate}%
                            </p>
                            <p className="text-sm text-slate-500">Approval Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                <Link
                    href="/admin/users?action=create"
                    className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add User</span>
                </Link>
                <Link
                    href="/admin/submissions"
                    className="flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors"
                >
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">Review Submissions</span>
                </Link>
                <Link
                    href="/admin/features"
                    className="flex items-center gap-3 p-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                >
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Assign Features</span>
                </Link>
            </div>

            {/* Recent Submissions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">Recent Submissions</h3>
                    <Link href="/admin/submissions" className="text-sm text-primary hover:underline flex items-center gap-1">
                        View All <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Provider</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">CPT</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentSubmissions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No submissions yet
                                </td>
                            </tr>
                        ) : (
                            recentSubmissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                        {sub.patients?.first_name} {sub.patients?.last_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        {sub.users?.first_name} {sub.users?.last_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                                        {sub.cpt_code}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                        ${sub.billing_amount?.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(sub.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(sub.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Important Notice */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-800 dark:text-blue-200">Organization-Scoped Access</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            You can only view and manage users and data within your organization.
                            For platform-wide access, contact your Super Admin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
