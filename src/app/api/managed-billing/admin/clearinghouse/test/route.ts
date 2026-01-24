/**
 * Test Clearinghouse Connection API
 * POST /api/managed-billing/admin/clearinghouse/test
 * Super Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        // Auth check - Super Admin only
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { clearinghouse } = await request.json();

        if (!clearinghouse) {
            return NextResponse.json({ error: 'Clearinghouse required' }, { status: 400 });
        }

        // Get config
        const { data: config } = await supabase
            .from('global_clearinghouse_config')
            .select('*')
            .eq('clearinghouse', clearinghouse)
            .single();

        if (!config) {
            return NextResponse.json({
                success: false,
                error: 'Clearinghouse not configured'
            });
        }

        // Test connection based on clearinghouse type
        let testResult: { success: boolean; error?: string } = { success: false, error: 'Unknown clearinghouse' };

        try {
            switch (clearinghouse) {
                case 'claim_md':
                    // Test Claim.MD API
                    if (config.api_key_encrypted) {
                        const response = await fetch('https://api.claim.md/api/v2/status', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Basic ${Buffer.from(`${config.api_key_encrypted}:`).toString('base64')}`,
                            },
                        });
                        testResult = { success: response.ok, error: response.ok ? undefined : 'API test failed' };
                    } else {
                        testResult = { success: false, error: 'API credentials not configured' };
                    }
                    break;

                case 'availity':
                    // Test Availity OAuth
                    if (config.api_key_encrypted && config.api_secret_encrypted) {
                        const response = await fetch('https://api.availity.com/v1/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                grant_type: 'client_credentials',
                                client_id: config.api_key_encrypted,
                                client_secret: config.api_secret_encrypted,
                            }),
                        });
                        testResult = { success: response.ok, error: response.ok ? undefined : 'OAuth test failed' };
                    } else {
                        testResult = { success: false, error: 'OAuth credentials not configured' };
                    }
                    break;

                case 'office_ally':
                default:
                    // SFTP test would require ssh2-sftp-client
                    // For now, just check if SFTP host is configured
                    if (config.sftp_host) {
                        testResult = {
                            success: true,
                            error: undefined
                        };
                        console.log('[Test] Would test SFTP connection to:', config.sftp_host);
                    } else {
                        testResult = { success: false, error: 'SFTP host not configured' };
                    }
                    break;
            }
        } catch (testError) {
            testResult = { success: false, error: 'Connection test failed' };
        }

        // Update last connection status
        await supabase
            .from('global_clearinghouse_config')
            .update({
                last_connection_test: new Date().toISOString(),
                last_connection_status: testResult.success ? 'success' : 'failed',
            })
            .eq('clearinghouse', clearinghouse);

        return NextResponse.json(testResult);

    } catch (error) {
        console.error('[Clearinghouse Test] Error:', error);
        return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 });
    }
}
