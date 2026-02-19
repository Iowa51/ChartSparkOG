import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch consent settings for current user's organization
export async function GET() {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch consent settings (RLS will filter by organization)
        const { data, error } = await supabase
            .from('ehr_consent_settings')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('[EHR Consent] Error fetching settings:', error);
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
        console.error('[EHR Consent] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT: Update consent settings
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's organization and role
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (userError || !userData?.organization_id) {
            return NextResponse.json({ error: 'User organization not found' }, { status: 400 });
        }

        // Check admin permission
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            share_diagnoses,
            share_medications,
            share_notes,
            share_labs,
            share_appointments,
            share_assessments
        } = body;

        // Upsert consent settings
        const { data, error } = await supabase
            .from('ehr_consent_settings')
            .upsert({
                organization_id: userData.organization_id,
                share_diagnoses: share_diagnoses ?? true,
                share_medications: share_medications ?? true,
                share_notes: share_notes ?? false,
                share_labs: share_labs ?? true,
                share_appointments: share_appointments ?? true,
                share_assessments: share_assessments ?? false,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id'
            })
            .select()
            .single();

        if (error) {
            console.error('[EHR Consent] Error saving settings:', error);
            return NextResponse.json({ error: 'Failed to save consent settings' }, { status: 500 });
        }

        // Log to audit trail
        await supabase.from('audit_logs').insert({
            action: 'EHR_CONSENT_UPDATED',
            user_id: user.id,
            organization_id: userData.organization_id,
            resource_type: 'ehr_consent_settings',
            resource_id: data.id,
            details: {
                share_diagnoses,
                share_medications,
                share_notes,
                share_labs,
                share_appointments,
                share_assessments
            }
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
        console.error('[EHR Consent] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
