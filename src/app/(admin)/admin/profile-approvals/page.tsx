import { createClient } from "@/lib/supabase/server";
import {
    UserCog,
    Clock,
    CheckCircle,
    XCircle,
    User,
    AlertTriangle,
} from "lucide-react";
import { ProfileApprovalActions } from "@/components/admin/ProfileApprovalActions";

interface PendingChange {
    id: string;
    user_id: string;
    field_name: string;
    old_value: string | null;
    new_value: string;
    status: string;
    requested_at: string;
    user_name: string;
    user_email: string;
    user_role: string;
}

export default async function ProfileApprovalsPage() {
    const supabase = await createClient();

    let pendingChanges: PendingChange[] = [];
    let recentChanges: PendingChange[] = [];

    if (supabase) {
        try {
            // Get pending profile changes with user info
            const { data: pendingData } = await supabase
                .from('pending_profile_changes')
                .select(`
                    id,
                    user_id,
                    field_name,
                    old_value,
                    new_value,
                    status,
                    requested_at,
                    users!pending_profile_changes_user_id_fkey(first_name, last_name, email, role)
                `)
                .eq('status', 'pending')
                .order('requested_at', { ascending: false });

            if (pendingData) {
                pendingChanges = pendingData.map((c: any) => ({
                    id: c.id,
                    user_id: c.user_id,
                    field_name: c.field_name,
                    old_value: c.old_value,
                    new_value: c.new_value,
                    status: c.status,
                    requested_at: c.requested_at,
                    user_name: c.users ? `${c.users.first_name || ''} ${c.users.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
                    user_email: c.users?.email || '',
                    user_role: c.users?.role || 'unknown',
                }));
            }

            // Get recent approved/rejected changes
            const { data: recentData } = await supabase
                .from('pending_profile_changes')
                .select(`
                    id,
                    user_id,
                    field_name,
                    old_value,
                    new_value,
                    status,
                    requested_at,
                    users!pending_profile_changes_user_id_fkey(first_name, last_name, email, role)
                `)
                .in('status', ['approved', 'rejected'])
                .order('requested_at', { ascending: false })
                .limit(10);

            if (recentData) {
                recentChanges = recentData.map((c: any) => ({
                    id: c.id,
                    user_id: c.user_id,
                    field_name: c.field_name,
                    old_value: c.old_value,
                    new_value: c.new_value,
                    status: c.status,
                    requested_at: c.requested_at,
                    user_name: c.users ? `${c.users.first_name || ''} ${c.users.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
                    user_email: c.users?.email || '',
                    user_role: c.users?.role || 'unknown',
                }));
            }
        } catch (e) {
            console.error("Error fetching profile changes:", e);
        }
    }

    return (
        <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserCog className="h-6 w-6" />
                        Profile Change Approvals
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Review and approve profile changes requested by auditors
                    </p>
                </div>

                {/* Pending Changes */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-500" />
                            Pending Requests
                        </h2>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            {pendingChanges.length} pending
                        </span>
                    </div>

                    {pendingChanges.length === 0 ? (
                        <div className="p-12 text-center">
                            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                            <p className="text-slate-500 dark:text-slate-400">No pending profile change requests</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {pendingChanges.map((change) => (
                                <div key={change.id} className="p-5 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <User className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {change.user_name}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {change.user_email}
                                            </p>
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase">
                                                {change.user_role}
                                            </span>
                                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                <p className="text-xs text-slate-400 uppercase mb-1">Requested Change</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                                    <span className="font-medium capitalize">{change.field_name.replace('_', ' ')}</span>:
                                                    <span className="text-slate-400 line-through ml-2">{change.old_value || '(empty)'}</span>
                                                    <span className="mx-2">→</span>
                                                    <span className="text-green-600 dark:text-green-400 font-medium">{change.new_value}</span>
                                                </p>
                                                <p className="text-xs text-slate-400 mt-2">
                                                    Requested: {new Date(change.requested_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <ProfileApprovalActions
                                        changeId={change.id}
                                        userId={change.user_id}
                                        fieldName={change.field_name}
                                        newValue={change.new_value}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent History */}
                {recentChanges.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Decisions</h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {recentChanges.map((change) => (
                                <div key={change.id} className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {change.status === 'approved' ? (
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {change.user_name}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {change.field_name.replace('_', ' ')}: {change.new_value}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${change.status === 'approved'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                        }`}>
                                        {change.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
