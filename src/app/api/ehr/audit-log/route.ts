import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch EHR-related audit log entries
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            // Demo mode fallback
            return NextResponse.json({
                auditLog: [
                    { id: '1', timestamp: new Date().toISOString(), system: 'ChartPath', action: 'Data Sync', user: 'System', records: 127, status: 'success' },
                    { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), system: 'ChartPath', action: 'Patient Record Access', user: 'Dr. Sarah Johnson', records: 1, status: 'success' },
                    { id: '3', timestamp: new Date(Date.now() - 86400000).toISOString(), system: 'ChartPath', action: 'Data Export', user: 'Admin', records: 50, status: 'success' },
                    { id: '4', timestamp: new Date(Date.now() - 172800000).toISOString(), system: 'Epic', action: 'Connection Test', user: 'Admin', records: 0, status: 'failed' }
                ]
            });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Fetch EHR-related audit logs (RLS will filter by organization for non-super-admins)
        // Join with users table to get real names
        const { data, error } = await supabase
            .from('audit_logs')
            .select(`
                id, 
                created_at, 
                action, 
                details,
                user_id,
                users (
                    first_name,
                    last_name,
                    email
                )
            `)
            .like('action', 'EHR_%')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[EHR Audit] Error fetching logs:', error);
            return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
        }

        // Transform to match UI expectations
        const auditLog = (data || []).map((log: any) => {
            const user = log.users;
            const userName = user
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
                : 'System';

            return {
                id: log.id,
                timestamp: log.created_at,
                system: log.details?.ehr_system || log.details?.display_name || 'ChartSpark',
                action: formatEventType(log.action),
                user: userName,
                records: log.details?.records_affected || 0,
                status: 'success'
            };
        });

        return NextResponse.json({ auditLog });
    } catch (error) {
        console.error('[EHR Audit] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Helper to format event types into readable actions
function formatEventType(eventType: string): string {
    const mappings: Record<string, string> = {
        'EHR_CONNECTION_ATTEMPT': 'Connection Attempt',
        'EHR_CONNECTION_SUCCESS': 'Connection Established',
        'EHR_CONNECTION_FAILED': 'Connection Failed',
        'EHR_CONSENT_UPDATED': 'Consent Settings Updated',
        'EHR_DATA_SYNC': 'Data Sync',
        'EHR_DATA_EXPORT': 'Data Export',
        'EHR_PATIENT_ACCESS': 'Patient Record Access',
        'EHR_DISCONNECT': 'System Disconnected'
    };
    return mappings[eventType] || eventType.replace('EHR_', '').replace(/_/g, ' ');
}
