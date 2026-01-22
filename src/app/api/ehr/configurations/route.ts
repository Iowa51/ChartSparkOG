import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch EHR configurations for current user's organization
export async function GET() {
    try {
        const supabase = await createClient();

        if (!supabase) {
            // Demo mode fallback
            return NextResponse.json({
                configurations: [
                    { id: '1', ehr_system: 'chartpath', display_name: 'ChartPath', status: 'connected', patients_synced: 127, last_sync_at: new Date().toISOString() },
                    { id: '2', ehr_system: 'epic', display_name: 'Epic', status: 'not_connected', patients_synced: 0, last_sync_at: null },
                    { id: '3', ehr_system: 'cerner', display_name: 'Cerner', status: 'not_connected', patients_synced: 0, last_sync_at: null }
                ]
            });
        }

        // Get current user's organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch EHR configurations (RLS will filter by organization)
        const { data, error } = await supabase
            .from('ehr_configurations')
            .select('*')
            .order('display_name');

        if (error) {
            console.error('[EHR Config] Error fetching configurations:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
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
        console.error('[EHR Config] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create or update EHR connection
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's organization
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
        const { ehr_system, display_name, api_endpoint, client_id } = body;

        if (!ehr_system || !display_name) {
            return NextResponse.json({ error: 'ehr_system and display_name are required' }, { status: 400 });
        }

        // Upsert EHR configuration
        const { data, error } = await supabase
            .from('ehr_configurations')
            .upsert({
                organization_id: userData.organization_id,
                ehr_system,
                display_name,
                api_endpoint,
                client_id,
                status: 'pending',
                created_by: user.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id,ehr_system'
            })
            .select()
            .single();

        if (error) {
            console.error('[EHR Config] Error saving configuration:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log to audit trail
        await supabase.from('audit_logs').insert({
            action: 'EHR_CONNECTION_ATTEMPT',
            user_id: user.id,
            organization_id: userData.organization_id,
            resource_type: 'ehr_configuration',
            resource_id: data.id,
            details: { ehr_system, display_name }
        });

        return NextResponse.json({ configuration: data, message: 'EHR connection initiated' });
    } catch (error) {
        console.error('[EHR Config] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
