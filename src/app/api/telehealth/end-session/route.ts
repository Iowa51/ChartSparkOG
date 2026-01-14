// src/app/api/telehealth/end-session/route.ts
// SEC-005: Secured telehealth end session with authentication

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';

async function handler(context: AuthContext) {
    try {
        const body = await context.request.json();
        const { appointmentId, roomName } = body;

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'appointmentId required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        if (supabase) {
            // Verify appointment belongs to user's organization
            const { data: appointment, error: appointmentError } = await supabase
                .from('appointments')
                .select('id, organization_id')
                .eq('id', appointmentId)
                .single();

            if (appointmentError || !appointment) {
                return NextResponse.json(
                    { error: 'Appointment not found' },
                    { status: 404 }
                );
            }

            // Verify organization access (unless demo mode or super admin)
            if (context.user.organizationId &&
                appointment.organization_id !== context.user.organizationId &&
                context.user.role !== 'SUPER_ADMIN') {
                return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 }
                );
            }

            // Update appointment status
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'completed' })
                .eq('id', appointmentId);

            if (error) {
                throw error;
            }

            // Audit log
            await supabase.from('audit_logs').insert({
                event_type: 'TELEHEALTH_SESSION_ENDED',
                user_id: context.user.id,
                user_email: context.user.email,
                user_role: context.user.role,
                organization_id: context.user.organizationId,
                resource_type: 'telehealth_room',
                resource_id: appointmentId,
                ip_address: context.request.headers.get('x-forwarded-for') || 'unknown',
                user_agent: context.request.headers.get('user-agent') || 'unknown',
                risk_level: 'LOW',
            }).catch(() => { });
        }

        // Delete Daily.co room if configured
        const dailyApiKey = process.env.DAILY_API_KEY;
        if (dailyApiKey && roomName) {
            try {
                await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${dailyApiKey}`,
                    },
                });
            } catch (deleteError) {
                console.warn('Failed to delete Daily.co room:', deleteError);
            }
        }

        console.log(`✅ Session ended for appointment ${appointmentId}`);

        return NextResponse.json({
            success: true,
            message: 'Session ended. Recording will be available shortly.'
        });

    } catch (error: unknown) {
        console.error('Error ending session:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to end session', details: message },
            { status: 500 }
        );
    }
}

// SEC-005: Export with authentication
export const POST = withAuth(handler, {
    requiredRole: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    requiredFeature: 'TELEHEALTH',
});
