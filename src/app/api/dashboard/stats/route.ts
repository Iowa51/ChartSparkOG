// src/app/api/dashboard/stats/route.ts
// Dashboard statistics endpoint — active patients, today's notes, pending encounters

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

/**
 * GET /api/dashboard/stats
 * Returns aggregate counts for the clinician dashboard
 */
async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        const orgId = context.user.organizationId;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // F-041: Run all three count queries in parallel
        const [patientsResult, notesResult, encountersResult] = await Promise.all([
            supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('status', 'active'),
            supabase
                .from('notes')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .gte('created_at', todayStart.toISOString()),
            supabase
                .from('encounters')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .in('status', ['scheduled', 'in_progress']),
        ]);

        const activePatients = patientsResult.count;
        const todayNotes = notesResult.count;
        const pendingEncounters = encountersResult.count;

        return NextResponse.json({
            stats: {
                activePatients: activePatients ?? 0,
                todayNotes: todayNotes ?? 0,
                pendingEncounters: pendingEncounters ?? 0,
            },
        });
    } catch (error) {
        logError({ action: 'DASHBOARD_STATS_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
