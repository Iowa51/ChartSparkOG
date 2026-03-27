// src/app/api/ehr/configurations/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { EHRConfigurationSchema, validateRequest } from '@/lib/validation/schemas';

// GET: Fetch EHR configurations for current user's organization
async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        // Fetch EHR configurations (RLS will filter by organization)
        const { data, error } = await supabase
            .from('ehr_configurations')
            .select('*')
            .order('display_name');

        if (error) {
            logError({ action: 'EHR_CONFIG_FETCH_ERROR', error: sanitizeError(error) });
            return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
        }

        // If no configurations exist, return default list
        if (!data || data.length === 0) {
            return NextResponse.json({
                configurations: [
                    { id: null, ehr_system: 'chartpath', display_name: 'ChartPath', status: 'not_connected', patients_synced: 0, last_sync_at: null },
                    { id: null, ehr_system: 'epic', display_name: 'Epic', status: 'not_connected', patients_synced: 0, last_sync_at: null },
                    { id: null, ehr_system: 'cerner', display_name: 'Cerner', status: 'not_connected', patients_synced: 0, last_sync_at: null }
                ]
            });
        }

        return NextResponse.json({ configurations: data });
    } catch (error) {
        logError({ action: 'EHR_CONFIG_GET_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create or update EHR connection (admin only)
async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const body = await context.request.json();
        const validation = validateRequest(EHRConfigurationSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const { ehr_system, display_name, api_endpoint, client_id } = validation.data;

        // Upsert EHR configuration
        const { data, error } = await supabase
            .from('ehr_configurations')
            .upsert({
                organization_id: context.user.organizationId,
                ehr_system,
                display_name,
                api_endpoint,
                client_id,
                status: 'pending',
                created_by: context.user.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id,ehr_system'
            })
            .select()
            .single();

        if (error) {
            logError({ action: 'EHR_CONFIG_SAVE_ERROR', error: sanitizeError(error) });
            return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
        }

        await logAuditEvent({
            eventType: 'EHR_CONNECTION_ATTEMPT',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            resourceType: 'ehr_configuration',
            resourceId: data.id,
            details: {
                ehr_system,
                display_name,
            },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json({ configuration: data, message: 'EHR connection initiated' });
    } catch (error) {
        logError({ action: 'EHR_CONFIG_POST_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// SEC-PT1-F7: MFA required on GET to prevent unauthenticated MFA-bypass enumeration of EHR integrations
export const GET = withAuth(handleGet, { requireMFA: true });
export const POST = withAuth(handlePost, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true,
});
