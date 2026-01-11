import { createClient } from "@/lib/supabase/server";
import {
    ClipboardCheck,
    CheckCircle2,
    Flag,
    TrendingUp,
    Building2,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

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

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
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

                // Get pending audits count
                const orgIds = assignedOrgs.map(o => o.id);
                if (orgIds.length > 0) {
                    const { count: pendingCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .eq('status', 'pending_audit');

                    stats.pendingAudits = pendingCount || 0;

                    // Get submissions for preview
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

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Auditor Dashboard
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Review submissions and ensure compliance across assigned organizations
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <ClipboardCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.pendingAudits}
                            </p>
                            <p className="text-sm text-slate-500">Pending Audits</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.auditedToday}
                            </p>
                            <p className="text-sm text-slate-500">Audited Today</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                            <Flag className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.flagsRaised}
                            </p>
                            <p className="text-sm text-slate-500">Flags Raised</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats.passRate}%
                            </p>
                            <p className="text-sm text-slate-500">Pass Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assigned Organizations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Assigned Organizations
                    </h3>
                    {assignedOrgs.length === 0 ? (
                        <p className="text-sm text-slate-500">No organizations assigned yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {assignedOrgs.map((org) => (
                                <li key={org.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {org.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Queue Preview */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Pending Audits Queue
                        </h3>
                        <Link
                            href="/auditor/submissions"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {pendingSubmissions.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                            <p className="text-slate-500">All caught up! No pending audits.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingSubmissions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {sub.patients?.first_name?.[0] || '?'}{sub.patients?.last_name?.[0] || '?'} - {sub.cpt_code}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {sub.organizations?.name} • {sub.users?.first_name} {sub.users?.last_name}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/auditor/submissions/${sub.id}`}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        Audit Now
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Read-Only Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                        <Flag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-200">Read-Only Access</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            As an auditor, you can view all clinical documentation but cannot edit or delete any records.
                            Use the flagging system to note any compliance concerns for admin review.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
