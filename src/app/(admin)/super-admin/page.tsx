import { createClient } from "@/lib/supabase/server";
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    FileText,
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
import { CSCard, CSPageHeader, CSBadge } from "@/components/cs";

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
                    event_type,
                    resource_type,
                    timestamp,
                    users(first_name, last_name)
                `)
                .order('timestamp', { ascending: false })
                .limit(10);
            recentActivity = logsData || [];

        } catch (e) {
            console.error("Error fetching super admin stats:", e);
        }
    }

    const statTiles = [
        { href: "/super-admin/organizations", icon: Building2, value: stats.totalOrganizations, label: "Organizations", sub: `${stats.activeOrganizations} active` },
        { href: "/super-admin/users", icon: Users, value: stats.totalUsers, label: "Total Users", sub: null },
        { href: "/super-admin/managed-billing/claims", icon: FileText, value: stats.pendingSubmissions, label: "Pending Submissions", sub: null },
        { href: "/super-admin/financials", icon: DollarSign, value: `$${stats.totalRevenue.toLocaleString()}`, label: "Total Revenue", sub: `$${stats.platformFees.toLocaleString()} in fees` },
    ];

    const managedBillingLinks = [
        { href: "/super-admin/managed-billing", icon: DollarSign, title: "Billing Dashboard", desc: "Overview & stats" },
        { href: "/super-admin/managed-billing/claims", icon: ClipboardList, title: "All Claims", desc: "View & manage claims" },
        { href: "/super-admin/managed-billing/era", icon: Receipt, title: "ERA Payments", desc: "Payment remittances" },
        { href: "/super-admin/managed-billing/clearinghouse", icon: Settings, title: "Clearinghouse", desc: "API configuration" },
        { href: "/super-admin/managed-billing/unmatched", icon: FileText, title: "Unmatched", desc: "Reconcile payments" },
        { href: "/pricing", icon: CreditCard, title: "Pricing Page", desc: "View subscription tiers" },
        { href: "/super-admin/financials", icon: TrendingUp, title: "Financials", desc: "Platform revenue" },
        { href: "/super-admin/fees", icon: DollarSign, title: "Platform Fees", desc: "Configure fees" },
    ];

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            <CSPageHeader
                title="Platform Command Center"
                subtitle="Manage organizations, users, and platform-wide settings"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statTiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                        <Link key={tile.href} href={tile.href} className="group">
                            <CSCard className="hover:border-[var(--cs-teal)] transition-colors">
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
                                {tile.label === "Total Users" && (
                                    <div className="flex gap-3 mt-2 text-xs text-[var(--cs-text-muted)]">
                                        <span>{stats.usersByRole.SUPER_ADMIN} SA</span>
                                        <span>{stats.usersByRole.ADMIN} Admin</span>
                                        <span>{stats.usersByRole.AUDITOR} Auditor</span>
                                        <span>{stats.usersByRole.USER} Users</span>
                                    </div>
                                )}
                            </CSCard>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions with Feature Assignment Modal */}
            <SuperAdminQuickActions users={[]} />

            {/* Managed Billing & Subscriptions Section */}
            <div className="mb-6">
                <CSCard padding="none">
                    <div className="px-5 py-4 border-b border-[var(--cs-card-border)] bg-[var(--cs-teal-xlight)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-md bg-[var(--cs-teal-light)] flex items-center justify-center">
                                <Banknote className="h-4 w-4 text-[var(--cs-teal)]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--cs-text-primary)]">
                                    Managed Billing & Subscriptions
                                </h3>
                                <p className="text-xs text-[var(--cs-text-muted)]">
                                    Platform billing, claims processing, and subscription management
                                </p>
                            </div>
                        </div>
                        <CSBadge variant="coral">NEW</CSBadge>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {managedBillingLinks.map((mb) => {
                                const Icon = mb.icon;
                                return (
                                    <Link
                                        key={mb.href}
                                        href={mb.href}
                                        className="group p-3 rounded-md border border-[var(--cs-border)] bg-white hover:bg-[var(--cs-teal-xlight)] hover:border-[var(--cs-teal)] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-md bg-[var(--cs-teal-light)] flex items-center justify-center">
                                                <Icon className="h-4 w-4 text-[var(--cs-teal)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--cs-text-primary)] group-hover:text-[var(--cs-teal)] transition-colors">{mb.title}</p>
                                                <p className="text-xs text-[var(--cs-text-muted)]">{mb.desc}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </CSCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Organizations */}
                <div className="lg:col-span-2">
                    <CSCard padding="none">
                        <div className="px-5 py-4 border-b border-[var(--cs-card-border)] bg-[var(--cs-teal-xlight)] flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[var(--cs-text-primary)]">Recent Organizations</h3>
                            <Link href="/super-admin/organizations" className="text-sm font-medium text-[var(--cs-teal)] hover:text-[var(--cs-teal-mid)] flex items-center gap-1">
                                View All <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                        <div className="p-5">
                            {organizations.length === 0 ? (
                                <p className="text-sm text-[var(--cs-text-muted)] text-center py-8">No organizations yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {organizations.map((org) => (
                                        <div key={org.id} className="flex items-center justify-between p-3 bg-[var(--cs-teal-xlight)] rounded-md">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-md bg-[var(--cs-teal-light)] flex items-center justify-center">
                                                    <Building2 className="h-4 w-4 text-[var(--cs-teal)]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[var(--cs-text-primary)]">{org.name}</p>
                                                    <p className="text-xs text-[var(--cs-text-muted)]">{org.slug} • {org.subscription_tier}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <CSBadge variant={org.is_active ? 'success' : 'muted'}>
                                                    {org.is_active ? 'Active' : 'Inactive'}
                                                </CSBadge>
                                                <p className="text-xs text-[var(--cs-text-muted)] mt-1">{org.platform_fee_percentage}% fee</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CSCard>
                </div>

                {/* Recent Activity */}
                <div>
                    <CSCard padding="none">
                        <div className="px-5 py-4 border-b border-[var(--cs-card-border)] bg-[var(--cs-teal-xlight)]">
                            <h3 className="text-sm font-semibold text-[var(--cs-text-primary)] flex items-center gap-2">
                                <Activity className="h-4 w-4 text-[var(--cs-teal)]" />
                                Recent Activity
                            </h3>
                        </div>
                        <div className="p-5">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-[var(--cs-text-muted)] text-center py-8">No recent activity</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentActivity.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-full bg-[var(--cs-teal-light)] flex items-center justify-center flex-shrink-0">
                                                <Activity className="h-3.5 w-3.5 text-[var(--cs-teal)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-[var(--cs-text-primary)]">
                                                    <span className="font-medium">
                                                        {log.users?.first_name || 'System'}
                                                    </span>{' '}
                                                    {log.event_type} {log.resource_type || 'system'}
                                                </p>
                                                <p className="text-xs text-[var(--cs-text-muted)]">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CSCard>
                </div>
            </div>

        </div>
    );
}
