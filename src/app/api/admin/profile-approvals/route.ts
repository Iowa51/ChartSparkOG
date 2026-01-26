import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin or super_admin
        const { data: adminUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
            return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const { changeId, userId, fieldName, newValue, action } = body;

        if (!changeId || !action) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        if (action === 'approve') {
            // Update the user's profile with the new value
            const updateData: Record<string, string> = {};
            updateData[fieldName] = newValue;

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating user:', updateError);
                return NextResponse.json({ message: "Failed to update user profile" }, { status: 500 });
            }

            // Mark the change as approved
            const { error: approveError } = await supabase
                .from('pending_profile_changes')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', changeId);

            if (approveError) {
                console.error('Error approving change:', approveError);
                return NextResponse.json({ message: "Failed to update change status" }, { status: 500 });
            }

            return NextResponse.json({ message: "Profile change approved successfully" });

        } else if (action === 'reject') {
            // Mark the change as rejected
            const { error: rejectError } = await supabase
                .from('pending_profile_changes')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', changeId);

            if (rejectError) {
                console.error('Error rejecting change:', rejectError);
                return NextResponse.json({ message: "Failed to reject change" }, { status: 500 });
            }

            return NextResponse.json({ message: "Profile change rejected" });

        } else {
            return NextResponse.json({ message: "Invalid action" }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Profile approval error:', error);
        return NextResponse.json({ message: error.message || "Server error" }, { status: 500 });
    }
}
