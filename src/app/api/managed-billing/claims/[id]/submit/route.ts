/**
 * Submit Claim to Clearinghouse API
 * POST /api/managed-billing/claims/[id]/submit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitClaimToClearinghouse } from '@/lib/managed-billing/clearinghouse-service';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's organization
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Verify claim belongs to organization
        const { data: claim } = await supabase
            .from('billing_claims')
            .select('id, organization_id, status')
            .eq('id', id)
            .single();

        if (!claim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        if (claim.organization_id !== profile.organization_id && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check claim is ready to submit
        if (!['draft', 'ready', 'rejected'].includes(claim.status)) {
            return NextResponse.json(
                { error: 'Claim cannot be submitted in current status' },
                { status: 400 }
            );
        }

        // Submit to clearinghouse
        const result = await submitClaimToClearinghouse(id);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            submissionId: result.submissionId,
            clearinghouseClaimId: result.clearinghouseClaimId,
        });

    } catch (error) {
        console.error('[Submit Claim] Error:', error);
        return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 });
    }
}
