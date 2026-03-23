// src/app/api/appointments/[id]/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection
// SEC-HIGH-07: Added org isolation checks and Zod validation for PATCH

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext, canAccessOrganization } from '@/lib/auth/api-auth';
import { logAuditEvent } from '@/lib/security/audit-log';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { z } from 'zod';
import { validateRequest } from '@/lib/validation/schemas';

const AppointmentUpdateSchema = z.object({
    appointment_datetime: z.string().max(50).optional(),
    appointment_type: z.string().max(100).optional(),
    status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
    notes: z.string().max(2000).optional().nullable(),
    duration_minutes: z.number().int().min(1).max(480).optional(),
    is_telehealth: z.boolean().optional(),
    reason: z.string().max(500).optional().nullable(),
}).strict();

async function handleGet(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const supabase = await createClient();
        const { data: appointment, error } = await supabase.from('appointments').select(`
      *,
      patient:patients(id, first_name, last_name),
      provider:profiles(id, first_name, last_name)
    `).eq('id', id).eq('organization_id', context.user.organizationId).single();
        if (error) throw error;

        await logAuditEvent({
            eventType: 'phi_read',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            resourceType: 'appointment',
            resourceId: id,
            details: {
                record_id: id,
                organization_id: context.user.organizationId,
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ appointment });
    } catch (error) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
}

async function handlePatch(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const supabase = await createClient();

        // Fetch existing appointment to verify org ownership
        const { data: existing, error: fetchError } = await supabase
            .from('appointments').select('organization_id').eq('id', id).eq('organization_id', context.user.organizationId).single();
        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        if (existing.organization_id && !canAccessOrganization(context.user, existing.organization_id)) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                resourceType: 'appointment',
                resourceId: id,
                details: { reason: 'Cross-organization appointment update attempt' },
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        // Validate update payload
        const rawBody = await context.request.json();
        const validation = validateRequest(AppointmentUpdateSchema, rawBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
        }

        const { data: appointment, error } = await supabase.from('appointments').update(validation.data).eq('id', id).select().single();
        if (error) throw error;

        await logAuditEvent({
            eventType: 'APPOINTMENT_UPDATE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            resourceType: 'appointment',
            resourceId: id,
            details: {
                record_id: id,
                organization_id: context.user.organizationId,
                updated_fields: Object.keys(validation.data),
            },
            phiAccessed: true,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json({ appointment });
    } catch (error) {
        logError({ action: 'ERROR_UPDATING_APPOINTMENT', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }
}

async function handleDelete(context: AuthContext) {
    try {
        const id = context.params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const supabase = await createClient();

        // Fetch existing appointment to verify org ownership
        const { data: existing, error: fetchError } = await supabase
            .from('appointments').select('organization_id').eq('id', id).eq('organization_id', context.user.organizationId).single();
        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        if (existing.organization_id && !canAccessOrganization(context.user, existing.organization_id)) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: context.user.role,
                organizationId: context.user.organizationId ?? undefined,
                resourceType: 'appointment',
                resourceId: id,
                details: { reason: 'Cross-organization appointment delete attempt' },
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        const { error } = await supabase.from('appointments').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;

        await logAuditEvent({
            eventType: 'APPOINTMENT_DELETE',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId ?? undefined,
            resourceType: 'appointment',
            resourceId: id,
            details: {
                record_id: id,
                organization_id: context.user.organizationId,
                status: 'cancelled',
            },
            phiAccessed: true,
            riskLevel: 'HIGH',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({ action: 'ERROR_CANCELLING_APPOINTMENT', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true, requireMFA: true });
export const PATCH = withAuth(handlePatch, { requireOrganization: true, requireMFA: true });
export const DELETE = withAuth(handleDelete, { requireOrganization: true, requireMFA: true });
