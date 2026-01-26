import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
    ArrowLeft,
    AlertTriangle,
    User,
    Building2,
    Calendar,
    FileText,
} from "lucide-react";
import Link from "next/link";
import { AuditWorkspace } from "@/components/auditor/AuditWorkspace";

interface ChecklistItem {
    id: string;
    checklist_item: string;
    category: string;
    is_required: boolean;
}

export default async function SubmissionDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const supabase = await createClient();
    let submission: any = null;
    let checklistItems: ChecklistItem[] = [];
    let auditorId: string | null = null;

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            auditorId = user?.id || null;

            // Get submission details
            const { data: submissionData } = await supabase
                .from('submissions')
                .select(`
                    id,
                    cpt_code,
                    status,
                    created_at,
                    updated_at,
                    notes,
                    patients(id, first_name, last_name, date_of_birth),
                    users!submissions_user_id_fkey(id, first_name, last_name, email),
                    organizations(id, name)
                `)
                .eq('id', params.id)
                .single();

            if (!submissionData) {
                notFound();
            }

            submission = {
                id: submissionData.id,
                cpt_code: submissionData.cpt_code || '',
                status: submissionData.status,
                created_at: submissionData.created_at,
                updated_at: submissionData.updated_at,
                notes: submissionData.notes,
                patient: submissionData.patients ? {
                    id: submissionData.patients.id,
                    name: `${submissionData.patients.first_name || ''} ${submissionData.patients.last_name || ''}`.trim(),
                    dob: submissionData.patients.date_of_birth,
                } : null,
                provider: submissionData.users ? {
                    id: submissionData.users.id,
                    name: `${submissionData.users.first_name || ''} ${submissionData.users.last_name || ''}`.trim(),
                    email: submissionData.users.email,
                } : null,
                organization: submissionData.organizations ? {
                    id: submissionData.organizations.id,
                    name: submissionData.organizations.name,
                } : null,
            };

            // Get CPT-specific checklist
            if (submission.cpt_code) {
                const { data: checklistData } = await supabase
                    .from('cpt_checklists')
                    .select('id, checklist_item, category, is_required')
                    .eq('cpt_code', submission.cpt_code)
                    .order('display_order', { ascending: true });

                checklistItems = checklistData || [];
            }
        } catch (e) {
            console.error("Error fetching submission:", e);
            notFound();
        }
    }

    if (!submission) {
        notFound();
    }

    return (
        <div className="flex-1 overflow-auto">
            {/* Header Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Audit Mode:</strong> Review the documentation carefully. Complete the checklist before taking action.
                </p>
            </div>

            <div className="p-6">
                {/* Back Link */}
                <Link
                    href="/auditor/submissions"
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-amber-600 mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Queue
                </Link>

                {/* Submission Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <FileText className="h-6 w-6 text-amber-500" />
                                Submission Review
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${submission.status === 'pending_audit' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                                        submission.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                                            submission.status === 'flagged' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                                                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}>
                                    {submission.status.replace('_', ' ')}
                                </span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                ID: {submission.id.slice(0, 8)}...
                            </p>
                        </div>
                        <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                            <p>Submitted: {new Date(submission.created_at).toLocaleString()}</p>
                            {submission.updated_at !== submission.created_at && (
                                <p>Updated: {new Date(submission.updated_at).toLocaleString()}</p>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                <User className="h-4 w-4" />
                                Patient
                            </div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {submission.patient?.name || 'Unknown'}
                            </p>
                            {submission.patient?.dob && (
                                <p className="text-sm text-slate-500">DOB: {submission.patient.dob}</p>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                <User className="h-4 w-4" />
                                Provider
                            </div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {submission.provider?.name || 'Unknown'}
                            </p>
                            {submission.provider?.email && (
                                <p className="text-sm text-slate-500">{submission.provider.email}</p>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                <Building2 className="h-4 w-4" />
                                Organization
                            </div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {submission.organization?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-slate-500 font-mono">CPT: {submission.cpt_code || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Notes */}
                    {submission.notes && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Documentation Notes</p>
                            <p className="text-slate-700 dark:text-slate-300">{submission.notes}</p>
                        </div>
                    )}
                </div>

                {/* Audit Workspace with Checklist and Timer */}
                <AuditWorkspace
                    submissionId={submission.id}
                    cptCode={submission.cpt_code}
                    currentStatus={submission.status}
                    checklistItems={checklistItems}
                    auditorId={auditorId || ''}
                />
            </div>
        </div>
    );
}
