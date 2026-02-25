// src/app/api/ehr/audit-log/route.ts
// SEC-HIGH-01: Migrated to withAuth wrapper for centralized auth + CSRF protection

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

// GET: Fetch EHR-related audit log entries
async function handleGet(context: AuthContext) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
        }

        // Parse query params
        const { searchParams } = new URL(context.request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Fetch EHR-related audit logs (RLS will filter by organization for non-super-admins)
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
            logError({ action: 'EHR_AUDIT_LOG_FETCH_ERROR', error: sanitizeError(error) });
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
        logError({ action: 'EHR_AUDIT_LOG_ERROR', error: sanitizeError(error) });
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

export const GET = withAuth(handleGet);
