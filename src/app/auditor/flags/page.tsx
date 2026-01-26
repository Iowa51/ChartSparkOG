import { createClient } from "@/lib/supabase/server";
import {
    Flag,
    AlertTriangle,
    Calendar,
    User,
    CheckCircle,
    Clock,
    MessageSquare,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface AuditFlag {
    id: string;
    submission_id: string;
    reason: string;
    notes: string | null;
    status: string;
    created_at: string;
    resolved_at: string | null;
    patient_name: string;
    provider_name: string;
}

function getStatusBadge(status: string) {
    switch (status) {
        case "open":
            return (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex items-center gap-1">
                    <Clock className="h-3 w-3" />Open
                </span>
            );
        case "pending":
            return (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />Pending
                </span>
            );
        case "resolved":
            return (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />Resolved
                </span>
            );
        default:
            return null;
    }
}

export default async function AuditorFlagsPage({
    searchParams,
}: {
    searchParams: { status?: string };
}) {
    const supabase = await createClient();
    const activeTab = searchParams.status || "all";

    let flags: AuditFlag[] = [];
    let statusCounts = { open: 0, pending: 0, resolved: 0, all: 0 };

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get flags created by this auditor
                let query = supabase
                    .from('audit_flags')
                    .select(`
                        id,
                        submission_id,
                        reason,
                        notes,
                        status,
                        created_at,
                        resolved_at,
                        submissions(
                            patients(first_name, last_name),
                            users(first_name, last_name)
                        )
                    `)
                    .eq('auditor_id', user.id)
                    .order('created_at', { ascending: false });

                // Apply status filter if not "all"
                if (activeTab !== "all") {
                    query = query.eq('status', activeTab);
                }

                const { data: flagsData } = await query;

                if (flagsData) {
                    flags = flagsData.map((f: any) => ({
                        id: f.id,
                        submission_id: f.submission_id,
                        reason: f.reason || 'No reason specified',
                        notes: f.notes,
                        status: f.status || 'open',
                        created_at: f.created_at,
                        resolved_at: f.resolved_at,
                        patient_name: f.submissions?.patients
                            ? `${f.submissions.patients.first_name || ''} ${f.submissions.patients.last_name || ''}`.trim() || 'Unknown Patient'
                            : 'Unknown Patient',
                        provider_name: f.submissions?.users
                            ? `${f.submissions.users.first_name || ''} ${f.submissions.users.last_name || ''}`.trim() || 'Unknown Provider'
                            : 'Unknown Provider',
                    }));
                }

                // Get counts for each status
                const { count: openCount } = await supabase
                    .from('audit_flags')
                    .select('*', { count: 'exact', head: true })
                    .eq('auditor_id', user.id)
                    .eq('status', 'open');

                const { count: pendingCount } = await supabase
                    .from('audit_flags')
                    .select('*', { count: 'exact', head: true })
                    .eq('auditor_id', user.id)
                    .eq('status', 'pending');

                const { count: resolvedCount } = await supabase
                    .from('audit_flags')
                    .select('*', { count: 'exact', head: true })
                    .eq('auditor_id', user.id)
                    .eq('status', 'resolved');

                statusCounts = {
                    open: openCount || 0,
                    pending: pendingCount || 0,
                    resolved: resolvedCount || 0,
                    all: (openCount || 0) + (pendingCount || 0) + (resolvedCount || 0),
                };
            }
        } catch (e) {
            console.error("Error fetching flags:", e);
        }
    }

    const tabs = [
        { key: "open", label: "Open", count: statusCounts.open },
        { key: "pending", label: "Pending Review", count: statusCounts.pending },
        { key: "resolved", label: "Resolved", count: statusCounts.resolved },
        { key: "all", label: "All Flags", count: statusCounts.all },
    ];

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Read-Only Access:</strong> Track flags you've created. Resolution requires admin action.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Flags</h1>
                    <p className="text-slate-500 dark:text-slate-400">Track compliance flags you've raised during audits</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {tabs.map(tab => (
                        <Link
                            key={tab.key}
                            href={`/auditor/flags?status=${tab.key}`}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                        >
                            {tab.label}
                            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-xs">
                                {tab.count}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Flags List - Entire row is clickable */}
                <div className="space-y-4">
                    {flags.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                            <Flag className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-slate-500 dark:text-slate-400">
                                {activeTab === "all" ? "No flags created yet." : `No ${activeTab} flags found.`}
                            </p>
                        </div>
                    ) : (
                        flags.map((flag) => (
                            <Link
                                key={flag.id}
                                href={`/auditor/submissions/${flag.submission_id}`}
                                className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-mono text-slate-400 dark:text-slate-500">
                                                FLG-{flag.id.slice(0, 6).toUpperCase()}
                                            </span>
                                            {getStatusBadge(flag.status)}
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                            {flag.reason}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                            <span className="text-slate-400 dark:text-slate-500">Patient:</span> {flag.patient_name}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {flag.provider_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Flagged: {new Date(flag.created_at).toLocaleDateString()}
                                            </span>
                                            {flag.resolved_at && (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Resolved: {new Date(flag.resolved_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {flag.notes && (
                                            <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 text-sm flex items-start gap-2">
                                                <MessageSquare className="h-4 w-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                                                {flag.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-4 flex items-center text-amber-500 group-hover:translate-x-1 transition-transform">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
