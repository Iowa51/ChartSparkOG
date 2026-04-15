// src/app/api/ehr/consent/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { EHRConsentSchema, validateRequest } from '@/lib/validation/schemas';

// GET: Fetch consent settings for current user's organization
async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        // Fetch consent settings (RLS will filter by organization)
        const { data, error } = await supabase
            .from('ehr_consent_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            logError({ action: 'EHR_CONSENT_FETCH_ERROR', error: sanitizeError(error) });
            return NextResponse.json({ error: 'Failed to fetch consent settings' }, { status: 500 });
        }

        // Return defaults if no settings exist
        if (!data) {
            return NextResponse.json({
                consents: {
                    share_diagnoses: true,
                    share_medications: true,
                    share_notes: false,
                    share_labs: true,
                    share_appointments: true,
                    share_assessments: false
                }
            });
        }

        return NextResponse.json({
            consents: {
                share_diagnoses: data.share_diagnoses,
                share_medications: data.share_medications,
                share_notes: data.share_notes,
                share_labs: data.share_labs,
                share_appointments: data.share_appointments,
                share_assessments: data.share_assessments
            }
        });
    } catch (error) {
        logError({ action: 'EHR_CONSENT_GET_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update consent settings (admin only)
async function handlePut(context: AuthContext) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const body = await context.request.json();
        const validation = validateRequest(EHRConsentSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }
        const {
            share_diagnoses,
            share_medications,
            share_notes,
            share_labs,
            share_appointments,
            share_assessments
        } = validation.data;

        // Upsert consent settings
        const { data, error } = await supabase
            .from('ehr_consent_settings')
            .upsert({
                organization_id: context.user.organizationId,
                share_diagnoses: share_diagnoses ?? true,
                share_medications: share_medications ?? true,
                share_notes: share_notes ?? false,
                share_labs: share_labs ?? true,
                share_appointments: share_appointments ?? true,
                share_assessments: share_assessments ?? false,
                updated_by: context.user.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id'
            })
            .select()
            .single();

        if (error) {
            logError({ action: 'EHR_CONSENT_SAVE_ERROR', error: sanitizeError(error) });
            return NextResponse.json({ error: 'Failed to save consent settings' }, { status: 500 });
        }

        await logAuditEvent({
            eventType: 'EHR_CONSENT_UPDATED',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            resourceType: 'ehr_consent_settings',
            resourceId: data.id,
            details: {
                consent_fields_updated: [
                    'share_diagnoses',
                    'share_medications',
                    'share_notes',
                    'share_labs',
                    'share_appointments',
                    'share_assessments',
                ],
            },
            phiAccessed: false,
            riskLevel: 'LOW',
        });

        return NextResponse.json({
            message: 'Consent settings saved',
            consents: {
                share_diagnoses: data.share_diagnoses,
                share_medications: data.share_medications,
                share_notes: data.share_notes,
                share_labs: data.share_labs,
                share_appointments: data.share_appointments,
                share_assessments: data.share_assessments
            }
        });
    } catch (error) {
        logError({ action: 'EHR_CONSENT_PUT_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// SEC-PT2-F8: Consent settings restricted to ADMIN/SUPER_ADMIN (was accessible to any authenticated user)
export const GET = withAuth(handleGet, { requiredRole: ['ADMIN', 'SUPER_ADMIN'], requireMFA: true });
export const PUT = withAuth(handlePut, {
    requiredRole: ['ADMIN', 'SUPER_ADMIN'],
    requireOrganization: true,
    requireMFA: true
});
