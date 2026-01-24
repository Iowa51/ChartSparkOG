/**
 * Clearinghouse Configuration API
 * GET/PUT /api/managed-billing/admin/clearinghouse
 * Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    getAllClearinghouseConfigs,
    updateClearinghouseConfig
} from '@/lib/managed-billing/clearinghouse-service';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Auth check - Super Admin only
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const configs = await getAllClearinghouseConfigs();

        return NextResponse.json({ configs });

    } catch (error) {
        console.error('[Clearinghouse Config] GET Error:', error);
        return NextResponse.json({ error: 'Failed to get configs' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Auth check - Super Admin only
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const config = await request.json();
        const result = await updateClearinghouseConfig(config);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Clearinghouse Config] PUT Error:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
