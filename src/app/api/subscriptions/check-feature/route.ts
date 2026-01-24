/**
 * Check Feature Access API
 * Returns whether user has access to a specific feature
 * 
 * NOTE: This is a NEW API route. It READS from existing user_features table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkFeatureAccess } from '@/lib/subscriptions/subscription-service';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const featureCode = searchParams.get('feature');

        if (!featureCode) {
            return NextResponse.json({ error: 'Feature code required' }, { status: 400 });
        }

        const supabase = await createClient();

        if (!supabase) {
            // Demo mode - all features enabled
            return NextResponse.json({ hasAccess: true });
        }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ hasAccess: false });
        }

        const hasAccess = await checkFeatureAccess(user.id, featureCode);

        return NextResponse.json({ hasAccess });

    } catch (error) {
        console.error('[Feature Check] Error:', error);
        // Fail open - allow access on error
        return NextResponse.json({ hasAccess: true });
    }
}
