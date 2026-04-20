// src/app/api/dashboard/stats/route.ts
// Dashboard statistics endpoint — active patients, signed today, unfinished notes

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getTodayStartInTimezone } from '@/lib/utils/timezone';

/**
 * GET /api/dashboard/stats?tz=America/New_York
 *
 * activePatients — organization-scoped (no patient↔provider assignment exists yet)
 * signedToday — clinician-scoped, `signed_at` today in clinician's timezone.
 *   Filters on signed_at (not status) because the sign route at
 *   /api/notes/[id]/sign updates is_signed + signed_at but leaves `status`
 *   unchanged; relying on status would miss notes signed post-creation.
 * unfinishedNotes — clinician-scoped, status IN ('draft','completed')
 *   AND signed_at IS NULL. The signed_at guard compensates for the same
 *   dual-tracking issue — some 'draft'/'completed' rows may already be
 *   signed with signed_at populated.
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
                .from('clinical_notes')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('provider_id', clinicianId)
                .gte('signed_at', todayStart),
            supabase
                .from('clinical_notes')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('provider_id', clinicianId)
                .in('status', ['draft', 'completed'])
                .is('signed_at', null),
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
