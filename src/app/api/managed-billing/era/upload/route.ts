/**
 * Upload ERA/835 File API
 * POST /api/managed-billing/era/upload
 * Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processERAFile } from '@/lib/managed-billing/era-service';

export async function POST(request: NextRequest) {
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

        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const organizationId = formData.get('organizationId') as string;

        if (!file || !organizationId) {
            return NextResponse.json(
                { error: 'File and organizationId required' },
                { status: 400 }
            );
        }

        const content = await file.text();
        const result = await processERAFile(organizationId, file.name, content);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            matched: result.matched,
            unmatched: result.unmatched,
        });

    } catch (error) {
        console.error('[ERA Upload] Error:', error);
        return NextResponse.json({ error: 'Failed to process ERA file' }, { status: 500 });
    }
}
