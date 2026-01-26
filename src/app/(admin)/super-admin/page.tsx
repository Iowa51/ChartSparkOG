import { createClient } from "@/lib/supabase/server";
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    FileText,
    UserCheck,
    Plus,
    ArrowRight,
    Activity,
    CreditCard,
    Receipt,
    Settings,
    Banknote,
    ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { SuperAdminQuickActions } from "@/components/admin/SuperAdminQuickActions";

// Local Card components for consistency
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>
);

export default async function SuperAdminDashboard() {
    const supabase = await createClient();

    // Initialize stats
    let stats = {
        totalOrganizations: 0,
        activeOrganizations: 0,
        totalUsers: 0,
        usersByRole: { SUPER_ADMIN: 0, ADMIN: 0, AUDITOR: 0, USER: 0 },
        pendingSubmissions: 0,
        totalRevenue: 0,
        platformFees: 0,
    };

    let recentActivity: any[] = [];
    let organizations: any[] = [];

    if (supabase) {
        try {
            // Get organizations count
            const { count: orgCount } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true });
            stats.totalOrganizations = orgCount || 0;

            const { count: activeOrgCount } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);
            stats.activeOrganizations = activeOrgCount || 0;

            // Get users count by role
            const { data: usersData } = await supabase
                .from('users')
                .select('role')
                .eq('is_active', true);

            if (usersData) {
                stats.totalUsers = usersData.length;
                usersData.forEach((u: any) => {
                    if (u.role && stats.usersByRole[u.role as keyof typeof stats.usersByRole] !== undefined) {
                        stats.usersByRole[u.role as keyof typeof stats.usersByRole]++;
                    }
                });
            }

            // Get pending submissions
            const { count: pendingCount } = await supabase
                .from('submissions')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending_audit', 'pending_approval']);
            stats.pendingSubmissions = pendingCount || 0;

            // Get recent organizations
            const { data: orgsData } = await supabase
                .from('organizations')
                .select('id, name, slug, subscription_tier, is_active, created_at, platform_fee_percentage')
                .order('created_at', { ascending: false })
                .limit(5);
            organizations = orgsData || [];

            // Get recent audit logs
            const { data: logsData } = await supabase
                .from('audit_logs')
                .select(`
                    id,
                    action,
                    entity_type,
                    created_at,
                    users(first_name, last_name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);
            recentActivity = logsData || [];

        } catch (e) {
            console.error("Error fetching super admin stats:", e);
        }
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Platform Command Center
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage organizations, users, and platform-wide settings
                    </p>
                </div>
                <img
                    src="/assets/logo.svg"
                    alt="ChartSpark"
                    className="h-12 w-auto hidden md:block"
                />
            </div>

            {/* Stats Cards - Now Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Link href="/super-admin/organizations" className="group">
                    <Card className="transition-all hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer">
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/60 transition-colors">
                                    <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {stats.totalOrganizations}
                                    </p>
                                    <p className="text-sm text-slate-500">Organizations</p>
                                </div>
                            </div>
                            <p className="text-xs text-emerald-600 mt-3">{stats.activeOrganizations} active</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/super-admin/users" className="group">
                    <Card className="transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer">
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors">
                                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {stats.totalUsers}
                                    </p>
                                    <p className="text-sm text-slate-500">Total Users</p>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3 text-xs">
                                <span className="text-purple-600">{stats.usersByRole.SUPER_ADMIN} SA</span>
                                <span className="text-blue-600">{stats.usersByRole.ADMIN} Admin</span>
                                <span className="text-amber-600">{stats.usersByRole.AUDITOR} Auditor</span>
                                <span className="text-teal-600">{stats.usersByRole.USER} Users</span>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/super-admin/managed-billing/claims" className="group">
                    <Card className="transition-all hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-700 cursor-pointer">
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/60 transition-colors">
                                    <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {stats.pendingSubmissions}
                                    </p>
                                    <p className="text-sm text-slate-500">Pending Submissions</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link href="/super-admin/financials" className="group">
                    <Card className="transition-all hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer">
                        <div className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition-colors">
                                    <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        ${stats.totalRevenue.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-slate-500">Total Revenue</p>
                                </div>
                            </div>
                            <p className="text-xs text-emerald-600 mt-3">${stats.platformFees.toLocaleString()} in fees</p>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Quick Actions with Feature Assignment Modal */}
            <SuperAdminQuickActions users={[]} />

            {/* NEW: Managed Billing & Subscriptions Section */}
            <div className="mb-8">
                <Card>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                                    <Banknote className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                        Managed Billing & Subscriptions
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Platform billing, claims processing, and subscription management
                                    </p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 text-xs font-bold rounded-full">
                                NEW
                            </span>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Managed Billing Dashboard */}
                            <Link
                                href="/super-admin/managed-billing"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all border border-transparent hover:border-teal-200 dark:hover:border-teal-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center group-hover:bg-teal-500 transition-colors">
                                        <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-teal-600">Billing Dashboard</p>
                                        <p className="text-xs text-slate-500">Overview & stats</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Claims */}
                            <Link
                                href="/super-admin/managed-billing/claims"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                        <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600">All Claims</p>
                                        <p className="text-xs text-slate-500">View & manage claims</p>
                                    </div>
                                </div>
                            </Link>

                            {/* ERA Payments */}
                            <Link
                                href="/super-admin/managed-billing/era"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                                        <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600">ERA Payments</p>
                                        <p className="text-xs text-slate-500">Payment remittances</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Clearinghouse Settings */}
                            <Link
                                href="/super-admin/managed-billing/clearinghouse"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                                        <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600">Clearinghouse</p>
                                        <p className="text-xs text-slate-500">API configuration</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Unmatched Payments */}
                            <Link
                                href="/super-admin/managed-billing/unmatched"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                                        <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600">Unmatched</p>
                                        <p className="text-xs text-slate-500">Reconcile payments</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Subscriptions */}
                            <Link
                                href="/pricing"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all border border-transparent hover:border-pink-200 dark:hover:border-pink-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center group-hover:bg-pink-500 transition-colors">
                                        <CreditCard className="h-5 w-5 text-pink-600 dark:text-pink-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-pink-600">Pricing Page</p>
                                        <p className="text-xs text-slate-500">View subscription tiers</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Financials */}
                            <Link
                                href="/super-admin/financials"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                                        <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600">Financials</p>
                                        <p className="text-xs text-slate-500">Platform revenue</p>
                                    </div>
                                </div>
                            </Link>

                            {/* Fees */}
                            <Link
                                href="/super-admin/fees"
                                className="group p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                                        <DollarSign className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600">Platform Fees</p>
                                        <p className="text-xs text-slate-500">Configure fees</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Organizations */}
                <div className="lg:col-span-2">
                    <Card>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white">Recent Organizations</h3>
                            <Link href="/super-admin/organizations" className="text-sm text-primary hover:underline flex items-center gap-1">
                                View All <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="p-6">
                            {organizations.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No organizations yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {organizations.map((org) => (
                                        <div key={org.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
                                                    <p className="text-xs text-slate-500">{org.slug} • {org.subscription_tier}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${org.is_active
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                                    }`}>
                                                    {org.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                <p className="text-xs text-slate-500 mt-1">{org.platform_fee_percentage}% fee</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div>
                    <Card>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-6">
                            {recentActivity.length === 0 ? (
                                <p className="text-slate-500 text-center py-8 text-sm">No recent activity</p>
                            ) : (
                                <div className="space-y-4">
                                    {recentActivity.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                <Activity className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-900 dark:text-white">
                                                    <span className="font-medium">
                                                        {log.users?.first_name || 'System'}
                                                    </span>{' '}
                                                    {log.action} {log.entity_type}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
