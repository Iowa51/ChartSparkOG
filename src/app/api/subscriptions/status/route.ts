/**
 * Subscription Status API
 * Returns current subscription status for the logged-in user's organization
 * 
 * NOTE: This is a NEW API route.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscriptions/subscription-service';

export async function GET() {
    try {
        const supabase = await createClient();

        if (!supabase) {
            // Demo mode - return full access
            return NextResponse.json({
                status: 'active',
                tierCode: 'ELITE',
                canAccess: true,
                canEdit: true,
            });
        }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's organization (using profiles table to match existing pattern)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.organization_id) {
            // No organization - return no subscription
            return NextResponse.json({
                status: 'none',
                tierCode: null,
                canAccess: false,
                canEdit: false,
            });
        }

        // Get subscription status
        const status = await getSubscriptionStatus(profile.organization_id);

        return NextResponse.json(status);

    } catch (error) {
        console.error('[Subscription Status] Error (fail-closed):', error);
        // SECURITY: Fail-closed - return 503 Service Unavailable on errors
        return NextResponse.json(
            {
                error: 'Subscription service temporarily unavailable',
                status: 'none',
                tierCode: null,
                canAccess: false,
                canEdit: false,
            },
            { status: 503 }
        );
    }
}
