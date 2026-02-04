// src/app/api/dashboard/stats/route.ts
// Dashboard statistics API - real-time counts for organization

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function GET(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const today = new Date().toISOString().split('T')[0];

        // Get patient counts
        const { count: totalPatients } = await supabase
            .from('patients')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)
            .eq('status', 'active');

        // Get today's encounters
        const { count: todayEncounters } = await supabase
            .from('encounters')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)
            .gte('encounter_date', today);

        // Get today's completed notes
        const { count: todayNotes } = await supabase
            .from('clinical_notes')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)
            .eq('note_date', today);

        // Get pending encounters (scheduled or in_progress)
        const { count: pendingEncounters } = await supabase
            .from('encounters')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)
            .in('status', ['scheduled', 'in_progress']);

        // Fire-and-forget audit log
        logAuditEventAsync({
            eventType: 'PATIENT_LIST',
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
            ipAddress,
            userAgent,
            resourceType: 'dashboard',
            details: { action: 'view_stats' },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json({
            stats: {
                activePatients: totalPatients || 0,
                todayEncounters: todayEncounters || 0,
                todayNotes: todayNotes || 0,
                pendingEncounters: pendingEncounters || 0,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logError({
            action: 'DASHBOARD_STATS_ERROR',
            error: sanitizeError(error),
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
