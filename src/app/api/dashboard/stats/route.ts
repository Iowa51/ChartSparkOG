// src/app/api/dashboard/stats/route.ts
// Dashboard statistics endpoint — active patients, signed today, unfinished notes

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getTodayStartInTimezone } from '@/lib/utils/timezone';

/**
 * GET /api/dashboard/stats?tz=America/New_York
 * Returns aggregate counts for the clinician dashboard.
 *
 * activePatients — organization-scoped (no patient↔provider assignment exists yet)
 * signedToday — clinician-scoped, counts notes signed since midnight in tz
 * unfinishedNotes — clinician-scoped draft notes, no time filter
 */
async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        const orgId = context.user.organizationId;
        const clinicianId = context.user.id;
        const tz = context.request.nextUrl.searchParams.get('tz') || 'UTC';
        const todayStart = getTodayStartInTimezone(tz);

        const [patientsResult, signedTodayResult, unfinishedResult] = await Promise.all([
            supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('status', 'active'),
            supabase
                .from('notes')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('provider_id', clinicianId)
                .eq('status', 'signed')
                .gte('signed_at', todayStart),
            supabase
                .from('notes')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('provider_id', clinicianId)
                .eq('status', 'draft'),
        ]);

        return NextResponse.json({
            stats: {
                activePatients: patientsResult.count ?? 0,
                signedToday: signedTodayResult.count ?? 0,
                unfinishedNotes: unfinishedResult.count ?? 0,
            },
        });
    } catch (error) {
        logError({ action: 'DASHBOARD_STATS_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
