import { createClient } from "@/lib/supabase/server";
import {
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Filter,
    Building2,
} from "lucide-react";
import { SubmissionsTable } from "@/components/auditor/SubmissionsTable";

interface Submission {
    id: string;
    cpt_code: string;
    status: string;
    created_at: string;
    updated_at: string;
    patient_name: string;
    provider_name: string;
    organization_name: string;
    organization_id: string;
}

export default async function AuditorSubmissionsPage({
    searchParams,
}: {
    searchParams: { status?: string; audited_today?: string };
}) {
    const supabase = await createClient();
    const statusFilter = searchParams.status || "pending_audit";
    const auditedToday = searchParams.audited_today === "true";

    let submissions: Submission[] = [];
    let statusCounts = { pending_audit: 0, approved: 0, flagged: 0, rejected: 0, all: 0 };

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get assigned organizations
                const { data: orgsData } = await supabase
                    .from('auditor_organizations')
                    .select('organization_id')
                    .eq('auditor_id', user.id)
                    .eq('is_active', true);

                const orgIds = orgsData?.map((o: any) => o.organization_id) || [];

                if (orgIds.length > 0) {
                    // Build query
                    let query = supabase
                        .from('submissions')
                        .select(`
                            id,
                            cpt_code,
                            status,
                            created_at,
                            updated_at,
                            patients(first_name, last_name),
                            users!submissions_user_id_fkey(first_name, last_name),
                            organizations(id, name)
                        `)
                        .in('organization_id', orgIds)
                        .order('created_at', { ascending: false })
                        .limit(100);

                    // Apply filters
                    if (auditedToday) {
                        const today = new Date();
                        today.setUTCHours(0, 0, 0, 0);
                        query = query
                            .in('status', ['approved', 'rejected', 'flagged'])
                            .gte('updated_at', today.toISOString());
                    } else if (statusFilter !== "all") {
                        query = query.eq('status', statusFilter);
                    }

                    const { data: submissionsData } = await query;

                    if (submissionsData) {
                        submissions = submissionsData.map((s: any) => ({
                            id: s.id,
                            cpt_code: s.cpt_code || '',
                            status: s.status,
                            created_at: s.created_at,
                            updated_at: s.updated_at,
                            patient_name: s.patients ? `${s.patients.first_name || ''} ${s.patients.last_name || ''}`.trim() : 'Unknown',
                            provider_name: s.users ? `${s.users.first_name || ''} ${s.users.last_name || ''}`.trim() : 'Unknown',
                            organization_name: s.organizations?.name || 'Unknown',
                            organization_id: s.organizations?.id || '',
                        }));
                    }

                    // Get counts for each status
                    const statuses = ['pending_audit', 'approved', 'flagged', 'rejected'];
                    for (const status of statuses) {
                        const { count } = await supabase
                            .from('submissions')
                            .select('*', { count: 'exact', head: true })
                            .in('organization_id', orgIds)
                            .eq('status', status);
                        statusCounts[status as keyof typeof statusCounts] = count || 0;
                    }
                    statusCounts.all = statusCounts.pending_audit + statusCounts.approved + statusCounts.flagged + statusCounts.rejected;
                }
            }
        } catch (e) {
            console.error("Error fetching submissions:", e);
        }
    }

    const tabs = [
        { key: "pending_audit", label: "Pending", icon: Clock, count: statusCounts.pending_audit },
        { key: "flagged", label: "Flagged", icon: AlertTriangle, count: statusCounts.flagged },
        { key: "approved", label: "Approved", icon: CheckCircle2, count: statusCounts.approved },
        { key: "all", label: "All", icon: Filter, count: statusCounts.all },
    ];

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Auditor Access:</strong> Review, approve, or flag submissions. Use batch actions for efficiency.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Submissions Queue</h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            {auditedToday ? "Submissions audited today" : "Review insurance submissions from assigned organizations"}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {tabs.map(tab => (
                        <a
                            key={tab.key}
                            href={`/auditor/submissions?status=${tab.key}`}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.key && !auditedToday
                                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-xs">
                                {tab.count}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Submissions Table with Batch Actions */}
                <SubmissionsTable submissions={submissions} />
            </div>
        </div>
    );
}
