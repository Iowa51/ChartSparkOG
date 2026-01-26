"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, User, Phone, Mail } from "lucide-react";

interface Props {
    initialData: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string;
        role: string;
    };
    pendingChanges: Array<{
        field_name: string;
        new_value: string;
        status: string;
    }>;
}

export function ProfileEditForm({ initialData, pendingChanges }: Props) {
    const [formData, setFormData] = useState({
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        phone: initialData.phone,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Check if a field has a pending change
    const hasPendingChange = (field: string) => {
        return pendingChanges.some(c => c.field_name === field && c.status === 'pending');
    };

    // Get pending value for a field
    const getPendingValue = (field: string) => {
        const pending = pendingChanges.find(c => c.field_name === field && c.status === 'pending');
        return pending?.new_value;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Not authenticated");
            }

            // Check which fields have changed
            const changes: Array<{ field_name: string; old_value: string | null; new_value: string }> = [];

            if (formData.first_name !== initialData.first_name && !hasPendingChange('first_name')) {
                changes.push({
                    field_name: 'first_name',
                    old_value: initialData.first_name || null,
                    new_value: formData.first_name,
                });
            }

            if (formData.last_name !== initialData.last_name && !hasPendingChange('last_name')) {
                changes.push({
                    field_name: 'last_name',
                    old_value: initialData.last_name || null,
                    new_value: formData.last_name,
                });
            }

            if (formData.phone !== initialData.phone && !hasPendingChange('phone')) {
                changes.push({
                    field_name: 'phone',
                    old_value: initialData.phone || null,
                    new_value: formData.phone,
                });
            }

            if (changes.length === 0) {
                setMessage({ type: 'error', text: 'No changes to submit.' });
                return;
            }

            // Insert pending changes
            const { error } = await supabase
                .from('pending_profile_changes')
                .insert(
                    changes.map(c => ({
                        user_id: user.id,
                        field_name: c.field_name,
                        old_value: c.old_value,
                        new_value: c.new_value,
                        status: 'pending',
                    }))
                );

            if (error) {
                throw error;
            }

            setMessage({
                type: 'success',
                text: `${changes.length} change(s) submitted for admin approval.`
            });

            // Refresh page after short delay to show updated pending changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            console.error("Error saving profile:", error);
            setMessage({ type: 'error', text: error.message || 'Failed to submit changes.' });
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges =
        formData.first_name !== initialData.first_name ||
        formData.last_name !== initialData.last_name ||
        formData.phone !== initialData.phone;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar and Role Badge */}
            <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <User className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                        {initialData.first_name || initialData.last_name
                            ? `${initialData.first_name} ${initialData.last_name}`.trim()
                            : 'Auditor Account'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{initialData.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase">
                        {initialData.role}
                    </span>
                </div>
            </div>

            {/* Email - Read Only */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email Address
                </label>
                <input
                    type="email"
                    value={initialData.email}
                    disabled
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed. Contact Super Admin for assistance.</p>
            </div>

            {/* First Name */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    First Name
                </label>
                <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    disabled={hasPendingChange('first_name')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${hasPendingChange('first_name')
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                    placeholder="Enter your first name"
                />
                {hasPendingChange('first_name') && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Pending change to "{getPendingValue('first_name')}" awaiting approval
                    </p>
                )}
            </div>

            {/* Last Name */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                </label>
                <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    disabled={hasPendingChange('last_name')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${hasPendingChange('last_name')
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                    placeholder="Enter your last name"
                />
                {hasPendingChange('last_name') && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Pending change to "{getPendingValue('last_name')}" awaiting approval
                    </p>
                )}
            </div>

            {/* Phone */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone Number
                </label>
                <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={hasPendingChange('phone')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${hasPendingChange('phone')
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                    placeholder="Enter your phone number"
                />
                {hasPendingChange('phone') && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Pending change to "{getPendingValue('phone')}" awaiting approval
                    </p>
                )}
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSaving || !hasChanges}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Submit for Approval
                        </>
                    )}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                    Profile changes require admin approval before taking effect.
                </p>
            </div>
        </form>
    );
}
