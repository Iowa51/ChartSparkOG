import { createClient } from "@/lib/supabase/server";
import {
    Settings,
    AlertTriangle,
    User,
    Bell,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { ProfileEditForm } from "@/components/auditor/ProfileEditForm";

interface PendingChange {
    id: string;
    field_name: string;
    old_value: string | null;
    new_value: string;
    status: string;
    requested_at: string;
    reviewer_notes: string | null;
}

export default async function AuditorSettingsPage() {
    const supabase = await createClient();

    let userProfile = {
        id: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'auditor',
    };

    let pendingChanges: PendingChange[] = [];

    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get user profile from users table
                const { data: profileData } = await supabase
                    .from('users')
                    .select('id, email, first_name, last_name, phone, role')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    userProfile = {
                        id: profileData.id,
                        email: profileData.email || user.email || '',
                        first_name: profileData.first_name || '',
                        last_name: profileData.last_name || '',
                        phone: profileData.phone || '',
                        role: profileData.role || 'auditor',
                    };
                }

                // Get pending profile changes
                const { data: changesData } = await supabase
                    .from('pending_profile_changes')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('requested_at', { ascending: false });

                if (changesData) {
                    pendingChanges = changesData;
                }
            }
        } catch (e) {
            console.error("Error fetching settings:", e);
        }
    }

    const hasPendingChanges = pendingChanges.filter(c => c.status === 'pending').length > 0;

    return (
        <div className="flex-1 overflow-auto">
            {/* Read-only Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2">
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Profile Changes Require Approval:</strong> Edits to your name or contact info need admin or super-admin approval.
                </p>
            </div>

            <div className="p-6 space-y-6 max-w-3xl">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your auditor account preferences</p>
                </div>

                {/* Pending Changes Alert */}
                {hasPendingChanges && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
                        <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">Profile Changes Pending</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                You have {pendingChanges.filter(c => c.status === 'pending').length} pending profile change(s) awaiting admin approval.
                            </p>
                        </div>
                    </div>
                )}

                {/* Profile Section - Editable */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <User className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-900 dark:text-white">Profile</h2>
                    </div>
                    <div className="p-5">
                        <ProfileEditForm
                            initialData={userProfile}
                            pendingChanges={pendingChanges}
                        />
                    </div>
                </div>

                {/* Change History */}
                {pendingChanges.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-slate-400" />
                            <h2 className="font-semibold text-slate-900 dark:text-white">Change History</h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {pendingChanges.slice(0, 5).map((change) => (
                                <div key={change.id} className="px-5 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white capitalize">
                                            {change.field_name.replace('_', ' ')}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {change.old_value ? `"${change.old_value}"` : '(empty)'} → "{change.new_value}"
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(change.requested_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        {change.status === 'pending' && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Pending
                                            </span>
                                        )}
                                        {change.status === 'approved' && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Approved
                                            </span>
                                        )}
                                        {change.status === 'rejected' && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex items-center gap-1">
                                                <XCircle className="h-3 w-3" />
                                                Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Security Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-900 dark:text-white">Security</h2>
                    </div>
                    <div className="p-5">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Add an extra layer of security to your account</p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                Enabled
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                            Security settings are managed by your organization's Super Admin.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
