import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API Route to track clinical encounter states and maintain a secure audit trail.
 * Logs transitions like 'started', 'paused', 'resumed', 'captured', and 'completed'.
 */

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { encounterId, action, metadata, patientId } = await request.json();

        if (!encounterId || !action) {
            return NextResponse.json({ error: 'Missing encounterId or action' }, { status: 400 });
        }

        // 1. Get current user/org context
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: userData } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (!userData?.organization_id) {
            return NextResponse.json({ error: 'User organization not found' }, { status: 403 });
        }

        // 2. Log the encounter tracking event
        const { error: trackingError } = await supabase
            .from('encounter_tracking')
            .insert({
                encounter_id: encounterId,
                user_id: user.id,
                organization_id: userData.organization_id,
                action: action,
                metadata: metadata || {},
                client_timestamp: new Date().toISOString()
            });

        if (trackingError) throw trackingError;

        // 3. Create a high-level security audit log entry
        const { error: auditError } = await supabase
            .from('audit_logs')
            .insert({
                organization_id: userData.organization_id,
                user_id: user.id,
                action: `encounter_${action}`,
                resource_type: 'encounter',
                resource_id: encounterId,
                details: {
                    msg: `Encounter status changed to ${action}`,
                    patient_id: patientId,
                    ...metadata
                },
                ip_address: request.headers.get('x-forwarded-for') || 'unknown'
            });

        if (auditError) throw auditError;

        // 4. Update the encounter status if necessary
        if (action === 'completed') {
            await supabase
                .from('encounters')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', encounterId);
        }

        return NextResponse.json({ success: true, action, timestamp: new Date().toISOString() });

    } catch (error: any) {
        console.error('Error in encounter tracking API:', error);
        return NextResponse.json({
            error: 'Failed to track encounter session',
            details: error.message
        }, { status: 500 });
    }
}
