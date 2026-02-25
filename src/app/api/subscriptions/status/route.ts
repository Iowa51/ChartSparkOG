/**
 * Subscription Status API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * Returns current subscription status for the logged-in user's organization
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscriptions/subscription-service';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handleGet(context: AuthContext) {
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

        // Use profiles for backward compat, fallback to withAuth context
        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', context.user.id)
            .single();

        const orgId = profile?.organization_id || context.user.organizationId;

        if (!orgId) {
            return NextResponse.json({
                status: 'none',
                tierCode: null,
                canAccess: false,
                canEdit: false,
            });
        }

        const status = await getSubscriptionStatus(orgId);
        return NextResponse.json(status);
    } catch (error) {
        logError({ action: 'SUBSCRIPTION_STATUS_ERROR_FAIL_CLOSED', error: sanitizeError(error) });
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

export const GET = withAuth(handleGet);
