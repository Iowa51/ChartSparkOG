/**
 * Collections API Route
 * GET /api/managed-billing/collections - Get collection summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCollectionSummary } from '@/lib/managed-billing/collection-service';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.organization_id) {
            return NextResponse.json({ error: 'No organization' }, { status: 403 });
        }

        const summary = await getCollectionSummary(profile.organization_id);

        return NextResponse.json(summary);
    } catch (error) {
        console.error('[API] Collections error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
