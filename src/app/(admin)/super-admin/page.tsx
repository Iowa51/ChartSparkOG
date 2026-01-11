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
} from "lucide-react";
import Link from "next/link";

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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Platform Command Center
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage organizations, users, and platform-wide settings
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
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

                <Card>
                    <div className="p-6">
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
                        <div className="flex gap-2 mt-3 text-xs">
                            <span className="text-purple-600">{stats.usersByRole.SUPER_ADMIN} SA</span>
                            <span className="text-blue-600">{stats.usersByRole.ADMIN} Admin</span>
                            <span className="text-amber-600">{stats.usersByRole.AUDITOR} Auditor</span>
                            <span className="text-teal-600">{stats.usersByRole.USER} Users</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
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

                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
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
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                <Link
                    href="/super-admin/organizations?action=create"
                    className="flex items-center gap-3 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Create Organization</span>
                </Link>
                <Link
                    href="/super-admin/users?action=create"
                    className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Create User</span>
                </Link>
                <Link
                    href="/super-admin/auditors"
                    className="flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors"
                >
                    <UserCheck className="h-5 w-5" />
                    <span className="font-medium">Assign Auditor</span>
                </Link>
                <Link
                    href="/super-admin/financials"
                    className="flex items-center gap-3 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                >
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">View Financials</span>
                </Link>
            </div>

            {/* Main Content Grid */}
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
