/**
 * Claim Validation API Route
 * POST /api/managed-billing/claims/[id]/validate - Validate claim before submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateClaimForSubmission, getValidationSummary } from '@/lib/managed-billing/claim-validator';
import { createClient } from '@/lib/supabase/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: claimId } = await params;
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate claim
        const result = await validateClaimForSubmission(claimId);
        const summary = getValidationSummary(result);

        return NextResponse.json({
            ...result,
            summary,
        });
    } catch (error) {
        console.error('[API] Validate claim error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
