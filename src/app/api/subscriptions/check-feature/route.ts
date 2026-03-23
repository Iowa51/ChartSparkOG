/**
 * Check Feature Access API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * Returns whether user has access to a specific feature
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkFeatureAccess } from '@/lib/subscriptions/subscription-service';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

async function handleGet(context: AuthContext) {
    try {
        const { searchParams } = new URL(context.request.url);
        const featureCode = searchParams.get('feature');

        if (!featureCode) {
            return NextResponse.json({ error: 'Feature code required' }, { status: 400 });
        }

        const supabase = await createClient();
        if (!supabase) {
            // Demo mode - all features enabled
            return NextResponse.json({ hasAccess: true });
        }

        const hasAccess = await checkFeatureAccess(context.user.id, featureCode);
        return NextResponse.json({ hasAccess });
    } catch (error) {
        logError({ action: 'FEATURE_CHECK_ERROR', error: sanitizeError(error) });
        // Fail CLOSED - deny access on error (HIPAA safety)
        return NextResponse.json({ hasAccess: false, error: 'Feature check unavailable' }, { status: 503 });
    }
}

export const GET = withAuth(handleGet);
