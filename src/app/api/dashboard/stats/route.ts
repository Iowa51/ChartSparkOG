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
 * signedToday — clinician-scoped, signed today in clinician's timezone.
 *   Accepts EITHER signal:
 *     - signed_at >= todayStart (correct path: sign route + submit-to-insurance
 *       after 2026-04-20 fix), OR
 *     - status = 'signed' AND updated_at >= todayStart (legacy broken path
 *       from the pre-fix submit-to-insurance flow that wrote status='signed'
 *       without populating signed_at — ~8 rows in prod as of 2026-04-20).
 *   PostgREST OR is deduped by the COUNT; a row satisfying both clauses
 *   is still counted once.
 * unfinishedNotes — clinician-scoped, status IN ('draft','completed')
 *   AND signed_at IS NULL. The signed_at guard compensates for the
 *   dual-tracking issue — some 'draft'/'completed' rows may already be
 *   signed via the post-creation sign route, which updates signed_at
 *   but leaves `status` alone.
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
                .or(
                    `signed_at.gte.${todayStart},and(status.eq.signed,updated_at.gte.${todayStart})`,
                ),
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
