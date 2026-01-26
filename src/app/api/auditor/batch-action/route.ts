import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Check if user is auditor, admin, or super_admin
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!userData || !['auditor', 'admin', 'super_admin'].includes(userData.role)) {
            return NextResponse.json({ message: "Forbidden - Auditor access required" }, { status: 403 });
        }

        const body = await request.json();
        const { action, submissionIds, reason } = body;

        if (!action || !submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        if (action === 'approve') {
            // Batch approve submissions
            const { error: updateError } = await supabase
                .from('submissions')
                .update({
                    status: 'approved',
                    updated_at: new Date().toISOString(),
                })
                .in('id', submissionIds)
                .eq('status', 'pending_audit'); // Only approve pending ones

            if (updateError) {
                console.error('Error approving submissions:', updateError);
                return NextResponse.json({ message: "Failed to approve submissions" }, { status: 500 });
            }

            return NextResponse.json({
                message: `${submissionIds.length} submission(s) approved successfully`
            });

        } else if (action === 'flag') {
            if (!reason) {
                return NextResponse.json({ message: "Flag reason is required" }, { status: 400 });
            }

            // Update submissions to flagged status
            const { error: updateError } = await supabase
                .from('submissions')
                .update({
                    status: 'flagged',
                    updated_at: new Date().toISOString(),
                })
                .in('id', submissionIds)
                .eq('status', 'pending_audit');

            if (updateError) {
                console.error('Error flagging submissions:', updateError);
                return NextResponse.json({ message: "Failed to flag submissions" }, { status: 500 });
            }

            // Create audit flag records for each submission
            const flagRecords = submissionIds.map(submissionId => ({
                submission_id: submissionId,
                auditor_id: user.id,
                reason: reason,
                status: 'open',
                created_at: new Date().toISOString(),
            }));

            const { error: flagError } = await supabase
                .from('audit_flags')
                .insert(flagRecords);

            if (flagError) {
                console.error('Error creating flag records:', flagError);
                // Don't fail the whole operation, flag records are secondary
            }

            return NextResponse.json({
                message: `${submissionIds.length} submission(s) flagged successfully`
            });

        } else {
            return NextResponse.json({ message: "Invalid action" }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Batch action error:', error);
        return NextResponse.json({ message: error.message || "Server error" }, { status: 500 });
    }
}
