import { createClient } from "@/lib/supabase/server";
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    FileText,
    Building2,
    Download,
} from "lucide-react";
import Link from "next/link";
import { ReportsExportButton } from "@/components/auditor/ReportsExportButton";

interface OrgReport {
    id: string;
    name: string;
    compliance: number;
    audited: number;
    approved: number;
    flagged: number;
}

interface CommonIssue {
    reason: string;
    count: number;
    severity: "high" | "medium" | "low";
}

export default async function AuditorReportsPage() {
    const supabase = await createClient();

    let stats = {
        overall: 0,
        totalAudited: 0,
        approved: 0,
        flagged: 0,
    };

    let organizationReports: OrgReport[] = [];
    let commonIssues: CommonIssue[] = [];

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

                const assignedOrgs = orgsData?.map((ao: any) => ({
                    id: ao.organizations?.id,
                    name: ao.organizations?.name,
                })).filter((o: any) => o.id) || [];

                const orgIds = assignedOrgs.map((o: { id: string; name: string }) => o.id);

                if (orgIds.length > 0) {
                    // Get this month's date range
                    const monthStart = new Date();
                    monthStart.setUTCDate(1);
                    monthStart.setUTCHours(0, 0, 0, 0);
                    const monthStartISO = monthStart.toISOString();

                    // Overall stats - this month
                    const { count: totalAudited } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .in('status', ['approved', 'rejected', 'flagged'])
                        .gte('updated_at', monthStartISO);

                    const { count: approvedCount } = await supabase
                        .from('submissions')
                        .select('*', { count: 'exact', head: true })
                        .in('organization_id', orgIds)
                        .eq('status', 'approved')
                        .gte('updated_at', monthStartISO);

                    const { count: flaggedCount } = await supabase
                        .from('audit_flags')
                        .select('*', { count: 'exact', head: true })
                        .eq('auditor_id', user.id)
                        .gte('created_at', monthStartISO);

                    stats.totalAudited = totalAudited || 0;
                    stats.approved = approvedCount || 0;
                    stats.flagged = flaggedCount || 0;
                    stats.overall = stats.totalAudited > 0
                        ? Math.round((stats.approved / stats.totalAudited) * 100)
                        : 0;

                    // Per-organization breakdown
                    for (const org of assignedOrgs) {
                        const { count: orgAudited } = await supabase
                            .from('submissions')
                            .select('*', { count: 'exact', head: true })
                            .eq('organization_id', org.id)
                            .in('status', ['approved', 'rejected', 'flagged'])
                            .gte('updated_at', monthStartISO);

                        const { count: orgApproved } = await supabase
                            .from('submissions')
                            .select('*', { count: 'exact', head: true })
                            .eq('organization_id', org.id)
                            .eq('status', 'approved')
                            .gte('updated_at', monthStartISO);

                        const { count: orgFlagged } = await supabase
                            .from('submissions')
                            .select('*', { count: 'exact', head: true })
                            .eq('organization_id', org.id)
                            .eq('status', 'flagged')
                            .gte('updated_at', monthStartISO);

                        organizationReports.push({
                            id: org.id,
                            name: org.name,
                            audited: orgAudited || 0,
                            approved: orgApproved || 0,
                            flagged: orgFlagged || 0,
                            compliance: (orgAudited || 0) > 0
                                ? Math.round(((orgApproved || 0) / (orgAudited || 1)) * 100)
                                : 0,
                        });
                    }

                    // Common issues - aggregate flag reasons
                    const { data: flagsData } = await supabase
                        .from('audit_flags')
                        .select('reason')
                        .eq('auditor_id', user.id)
                        .gte('created_at', monthStartISO);

                    if (flagsData && flagsData.length > 0) {
                        const reasonCounts: Record<string, number> = {};
                        flagsData.forEach((f: any) => {
                            const reason = f.reason || 'Unspecified';
                            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                        });

                        commonIssues = Object.entries(reasonCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([reason, count]) => ({
                                reason,
                                count,
                                severity: count >= 4 ? 'high' : count >= 2 ? 'medium' : 'low',
                            }));
                    }
                }
            }
        } catch (e) {
            console.error("Error fetching reports data:", e);
        }
    }

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Read-Only Access:</strong> You can view compliance reports but cannot modify any data.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Reports</h1>
                        <p className="text-slate-500 dark:text-slate-400">Documentation compliance analytics across assigned organizations</p>
                    </div>
                    <ReportsExportButton stats={stats} organizations={organizationReports} issues={commonIssues} />
                </div>

                {/* Overall Stats - Clickable */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Overall Compliance</span>
                            <div className={`flex items-center gap-1 text-sm ${stats.overall >= 90 ? "text-green-600" : "text-red-600"}`}>
                                {stats.overall >= 90 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {stats.overall}%
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.overall}%</p>
                        <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${stats.overall >= 95 ? 'bg-green-500' : stats.overall >= 90 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${stats.overall}%` }}
                            />
                        </div>
                    </div>

                    <Link href="/auditor/submissions?status=audited" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Total Audited</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalAudited}</p>
                        <p className="text-sm text-slate-400 mt-1">This month</p>
                    </Link>

                    <Link href="/auditor/submissions?status=approved" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-green-400 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Approved</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                        <p className="text-sm text-slate-400 mt-1">Passed review</p>
                    </Link>

                    <Link href="/auditor/flags" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-red-400 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                            <span className="text-slate-500 dark:text-slate-400 text-sm">Flagged</span>
                        </div>
                        <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
                        <p className="text-sm text-slate-400 mt-1">Needs attention</p>
                    </Link>
                </div>

                {/* Organization Breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-slate-400" />
                            Organization Compliance
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {organizationReports.length === 0 ? (
                            <div className="px-5 py-8 text-center text-slate-500">
                                No organization data available yet.
                            </div>
                        ) : (
                            organizationReports.map((org) => (
                                <div key={org.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
                                        <p className="text-sm text-slate-500">{org.audited} audited · {org.flagged} flagged</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">{org.compliance}%</p>
                                            <p className={`text-xs ${org.approved > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                {org.approved} approved
                                            </p>
                                        </div>
                                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${org.compliance >= 95 ? 'bg-green-500' : org.compliance >= 90 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${org.compliance}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Common Issues */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Common Compliance Issues
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {commonIssues.length === 0 ? (
                            <div className="px-5 py-8 text-center text-slate-500">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                                <p>No compliance issues flagged this month. Great work!</p>
                            </div>
                        ) : (
                            commonIssues.map((issue, i) => (
                                <div key={i} className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${issue.severity === 'high' ? 'bg-red-500' :
                                            issue.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                                            }`} />
                                        <p className="text-slate-700 dark:text-slate-300">{issue.reason}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {issue.count} occurrence{issue.count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
