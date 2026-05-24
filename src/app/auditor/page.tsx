import { createClient } from "@/lib/supabase/server";
import {
    ClipboardCheck,
    CheckCircle2,
    Flag,
    TrendingUp,
    Building2,
    ArrowRight,
    DollarSign,
} from "lucide-react";
import Link from "next/link";
import { CSCard, CSPageHeader } from "@/components/cs";

export default async function AuditorDashboard() {
    const supabase = await createClient();

    // Fetch auditor stats
    let stats = {
        pendingAudits: 0,
        auditedToday: 0,
        flagsRaised: 0,
        passRate: 0,
    };

    let assignedOrgs: { id: string; name: string }[] = [];
    let pendingSubmissions: any[] = [];
    let auditorId: string | null = null;

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                auditorId = user.id;

                // Get assigned organizations
                const { data: orgsData } = await supabase
                    .from('auditor_organizations')
                    .select('organization_id, organizations(id, name)')
                    .eq('auditor_id', user.id)
                    .eq('is_active', true);

                if (orgsData) {
                    assignedOrgs = orgsData.map((ao: any) => ({
                        id: ao.organizations?.id,
                        name: ao.organizations?.name,
                    })).filter((o: any) => o.id);
                }

                const orgIds = assignedOrgs.map(o => o.id);

                if (orgIds.length > 0) {
                    // 1. Get pending audits count
                    const { count: pendingCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .eq('status', 'pending_audit');
                    stats.pendingAudits = pendingCount || 0;

                    // 2. Get audited TODAY (resets at midnight UTC)
                    const today = new Date();
                    today.setUTCHours(0, 0, 0, 0);
                    const todayISO = today.toISOString();

                    const { count: auditedTodayCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .in('status', ['approved', 'rejected', 'flagged'])
                        .gte('updated_at', todayISO);
                    stats.auditedToday = auditedTodayCount || 0;

                    // 3. Get flags raised by this auditor
                    const { count: flagsCount } = await supabase
                        .from('audit_flags')
                        .select('*', { count: 'exact', head: true })
                        .eq('auditor_id', user.id);
                    stats.flagsRaised = flagsCount || 0;

                    // 4. Calculate pass rate (approved / total audited this month)
                    const monthStart = new Date();
                    monthStart.setUTCDate(1);
                    monthStart.setUTCHours(0, 0, 0, 0);
                    const monthStartISO = monthStart.toISOString();

                    const { count: approvedCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .eq('status', 'approved')
                        .gte('updated_at', monthStartISO);

                    const { count: totalAuditedMonth } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .in('status', ['approved', 'rejected', 'flagged'])
                        .gte('updated_at', monthStartISO);

                    if (totalAuditedMonth && totalAuditedMonth > 0) {
                        stats.passRate = Math.round(((approvedCount || 0) / totalAuditedMonth) * 100);
                    }

                    // Get submissions for pending queue preview
                    const { data: submissionsData } = await supabase
                        .from('submissions')
                        .select(`
                            id,
                            cpt_code,
                            status,
                            created_at,
                            patients(first_name, last_name),
                            users(first_name, last_name),
                            organizations(name)
                        `)
                        .in('organization_id', orgIds)
                        .eq('status', 'pending_audit')
                        .order('created_at', { ascending: false })
                        .limit(5);

                    pendingSubmissions = submissionsData || [];
                }
            }
        } catch (e) {
            console.error("Error fetching auditor stats:", e);
        }
    }

    void auditorId;

    const statTiles = [
        { href: "/auditor/submissions?status=pending_audit", icon: ClipboardCheck, value: stats.pendingAudits, label: "Pending Audits" },
        { href: "/auditor/submissions?audited_today=true", icon: CheckCircle2, value: stats.auditedToday, label: "Audited Today" },
        { href: "/auditor/flags", icon: Flag, value: stats.flagsRaised, label: "Flags Raised" },
        { href: "/auditor/reports", icon: TrendingUp, value: `${stats.passRate}%`, label: "Pass Rate" },
        { href: "/auditor/billing", icon: DollarSign, value: "Financial", label: "Billing Compliance" },
    ];

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            <CSPageHeader
                title="Auditor Dashboard"
                subtitle="Review submissions and ensure compliance across assigned organizations"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                            </CSCard>
                        </Link>
                    );
                })}
            </div>

            {/* Assigned Organizations + Queue Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <CSCard>
                    <h3 className="text-sm font-semibold text-[var(--cs-text-primary)] mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[var(--cs-teal)]" />
                        Assigned Organizations
                    </h3>
                    {assignedOrgs.length === 0 ? (
                        <p className="text-sm text-[var(--cs-text-muted)]">No organizations assigned yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {assignedOrgs.map((org) => (
                                <li key={org.id} className="flex items-center gap-2 text-sm text-[var(--cs-text-secondary)]">
                                    <div className="h-2 w-2 rounded-full bg-[var(--cs-success)]" />
                                    {org.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </CSCard>

                {/* Queue Preview */}
                <div className="lg:col-span-2">
                    <CSCard>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[var(--cs-text-primary)]">
                                Pending Audits Queue
                            </h3>
                            <Link
                                href="/auditor/submissions"
                                className="text-sm font-medium text-[var(--cs-teal)] hover:text-[var(--cs-teal-mid)] flex items-center gap-1"
                            >
                                View All <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {pendingSubmissions.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle2 className="h-10 w-10 text-[var(--cs-success)] mx-auto mb-2" />
                                <p className="text-sm text-[var(--cs-text-muted)]">All caught up! No pending audits.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pendingSubmissions.map((sub) => (
                                    <div
                                        key={sub.id}
                                        className="flex items-center justify-between p-3 bg-[var(--cs-teal-xlight)] rounded-md"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-[var(--cs-text-primary)]">
                                                {sub.patients?.first_name?.[0] || '?'}{sub.patients?.last_name?.[0] || '?'} - {sub.cpt_code}
                                            </p>
                                            <p className="text-xs text-[var(--cs-text-muted)]">
                                                {sub.organizations?.name} • {sub.users?.first_name} {sub.users?.last_name}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/auditor/submissions/${sub.id}`}
                                            className="px-3 py-1.5 text-sm font-medium bg-[var(--cs-teal)] text-white rounded-md hover:bg-[var(--cs-teal-mid)] transition-colors"
                                        >
                                            Audit Now
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CSCard>
                </div>
            </div>

            {/* Read-Only Notice */}
            <div className="rounded-[var(--cs-radius-card)] bg-[var(--cs-coral-light)] border border-[var(--cs-coral)]/20 p-4">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center flex-shrink-0">
                        <Flag className="h-4 w-4 text-[var(--cs-coral)]" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--cs-coral)]">Read-Only Access</h4>
                        <p className="text-sm text-[var(--cs-text-secondary)] mt-1">
                            As an auditor, you can view all clinical documentation but cannot edit or delete any records.
                            Use the flagging system to note any compliance concerns for admin review.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
