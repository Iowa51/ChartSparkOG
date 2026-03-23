// src/app/api/admin/profile-approvals/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF + role enforcement

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { ProfileApprovalSchema, validateRequest } from '@/lib/validation/schemas';

const ALLOWED_PROFILE_FIELDS = ['first_name', 'last_name', 'specialty', 'phone', 'license_number'];

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();

        const body = await context.request.json();
        const validation = validateRequest(ProfileApprovalSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const { changeId, userId, fieldName, newValue, action } = validation.data;

        if (action === 'approve') {
            // SEC-CRITICAL-04: Validate fieldName against whitelist to prevent arbitrary column updates
            if (!userId || !fieldName || !ALLOWED_PROFILE_FIELDS.includes(fieldName)) {
                return NextResponse.json({ message: "Invalid or disallowed field name" }, { status: 400 });
            }

            // Update the user's profile with the new value
            const updateData: Record<string, string | null> = {};
            updateData[fieldName] = newValue ?? null;

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId);

            if (updateError) {
                logError({ action: 'ERROR_UPDATING_USER', error: sanitizeError(updateError) });
                return NextResponse.json({ message: "Failed to update user profile" }, { status: 500 });
            }

            // Mark the change as approved
            const { error: approveError } = await supabase
                .from('pending_profile_changes')
                .update({
                    status: 'approved',
                    reviewed_by: context.user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', changeId);

            if (approveError) {
                logError({ action: 'ERROR_APPROVING_CHANGE', error: sanitizeError(approveError) });
                return NextResponse.json({ message: "Failed to update change status" }, { status: 500 });
            }

            return NextResponse.json({ message: "Profile change approved successfully" });

        } else if (action === 'reject') {
            // Mark the change as rejected
            const { error: rejectError } = await supabase
                .from('pending_profile_changes')
                .update({
                    status: 'rejected',
                    reviewed_by: context.user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', changeId);

            if (rejectError) {
                logError({ action: 'ERROR_REJECTING_CHANGE', error: sanitizeError(rejectError) });
                return NextResponse.json({ message: "Failed to reject change" }, { status: 500 });
            }

            return NextResponse.json({ message: "Profile change rejected" });

        } else {
            return NextResponse.json({ message: "Invalid action" }, { status: 400 });
        }

    } catch (error: unknown) {
        logError({ action: 'PROFILE_APPROVAL_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireMFA: true,
});
