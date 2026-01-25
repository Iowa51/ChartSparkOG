// src/app/api/patients/[id]/route.ts
// SEC-009: HIPAA-compliant patient detail API with full audit logging

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/patients/${id}`, method: 'GET' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        const { data: patient, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Verify user has access to this patient's organization
        if (patient.organization_id !== profile?.organization_id) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                userId: user.id,
                userEmail: user.email,
                organizationId: profile?.organization_id,
                ipAddress,
                userAgent,
                resourceType: 'patient',
                resourceId: id,
                details: { reason: 'Cross-organization access attempt' },
                phiAccessed: false,
                riskLevel: 'CRITICAL',
            });
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        // Log PHI access - viewing individual patient record
        await logPHIAccess(
            user.id,
            user.email || '',
            profile?.role || 'USER',
            profile?.organization_id || '',
            'PATIENT',
            id,
            'VIEW',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ patient });
    } catch (error) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/patients/${id}`, method: 'PATCH' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        const updates = await request.json();

        const { data: patient, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', id)
            .eq('organization_id', profile?.organization_id) // Ensure org isolation
            .select()
            .single();

        if (error) throw error;

        // Log PHI update
        await logPHIAccess(
            user.id,
            user.email || '',
            profile?.role || 'USER',
            profile?.organization_id || '',
            'PATIENT',
            id,
            'UPDATE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ patient });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            await logAuditEvent({
                eventType: 'UNAUTHORIZED_ACCESS',
                ipAddress,
                userAgent,
                details: { path: `/api/patients/${id}`, method: 'DELETE' },
                phiAccessed: false,
                riskLevel: 'HIGH',
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, email, role')
            .eq('id', user.id)
            .single();

        // Soft delete - set status to inactive
        const { error } = await supabase
            .from('patients')
            .update({ status: 'inactive' })
            .eq('id', id)
            .eq('organization_id', profile?.organization_id); // Ensure org isolation

        if (error) throw error;

        // Log PHI deletion (high risk event)
        await logPHIAccess(
            user.id,
            user.email || '',
            profile?.role || 'USER',
            profile?.organization_id || '',
            'PATIENT',
            id,
            'DELETE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
    }
}
