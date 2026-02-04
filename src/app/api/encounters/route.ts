// src/app/api/encounters/route.ts
// HIPAA-compliant encounters API with full audit logging
// Uses production data layer

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { getEncounters } from '@/lib/data';

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

        const searchParams = request.nextUrl.searchParams;
        const patientId = searchParams.get('patient_id');
        const status = searchParams.get('status');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        // Get encounters using data layer
        const result = await getEncounters(profile.organization_id, {
            page,
            pageSize,
            patientId: patientId || undefined,
            status: status === 'all' ? undefined : (status as any),
        });

        // Fire-and-forget audit logging
        logAuditEventAsync({
            eventType: 'PATIENT_LIST',
            userId: user.id,
            userEmail: user.email,
            userRole: profile.role,
            organizationId: profile.organization_id,
            ipAddress,
            userAgent,
            resourceType: 'encounter',
            details: {
                action: 'list_encounters',
                patientId: patientId || null,
                statusFilter: status || 'all',
                resultCount: result.data.length,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({
            encounters: result.data,
            pagination: {
                page: result.page,
                limit: result.pageSize,
                total: result.count,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        logError({
            action: 'FETCH_ENCOUNTERS_ERROR',
            error: sanitizeError(error),
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch encounters' },
            { status: 500 }
        );
    }
}
