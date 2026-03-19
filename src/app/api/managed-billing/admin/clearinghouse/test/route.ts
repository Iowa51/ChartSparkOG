/**
 * Test Clearinghouse Connection API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * POST /api/managed-billing/admin/clearinghouse/test - Super Admin only
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';
import { logAuditEventAsync } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { decryptPHI } from '@/lib/security/encryption';

async function handlePost(context: AuthContext) {
    try {
        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 });
        }

        const { clearinghouse } = await context.request.json();

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

        // H3: Test connection — decrypt credentials before use, never log them
        let testResult: { success: boolean; error?: string } = { success: false, error: 'Unknown clearinghouse' };

        try {
            switch (clearinghouse) {
                case 'claim_md':
                    if (config.api_key_encrypted) {
                        const apiKey = await decryptPHI(config.api_key_encrypted);
                        const response = await fetch('https://api.claim.md/api/v2/status', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
                            },
                        });
                        testResult = { success: response.ok, error: response.ok ? undefined : 'API test failed' };
                    } else {
                        testResult = { success: false, error: 'API credentials not configured' };
                    }
                    break;

                case 'availity':
                    if (config.api_key_encrypted && config.api_secret_encrypted) {
                        const clientId = await decryptPHI(config.api_key_encrypted);
                        const clientSecret = await decryptPHI(config.api_secret_encrypted);
                        const response = await fetch('https://api.availity.com/v1/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                grant_type: 'client_credentials',
                                client_id: clientId,
                                client_secret: clientSecret,
                            }),
                        });
                        testResult = { success: response.ok, error: response.ok ? undefined : 'OAuth test failed' };
                    } else {
                        testResult = { success: false, error: 'OAuth credentials not configured' };
                    }
                    break;

                case 'office_ally':
                default:
                    if (config.sftp_host) {
                        // H3: Do not log SFTP host or credentials
                        testResult = { success: true, error: undefined };
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

        const { ipAddress, userAgent } = getRequestMetadata(context.request);
        logAuditEventAsync({
            eventType: 'BILLING_RECORD_VIEW',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: context.user.role,
            organizationId: context.user.organizationId || undefined,
            ipAddress,
            userAgent,
            resourceType: 'clearinghouse_config',
            details: { action: 'CLEARINGHOUSE_CONNECTION_TEST', clearinghouse, success: testResult.success },
            phiAccessed: false,
            riskLevel: 'MEDIUM',
        });

        return NextResponse.json(testResult);
    } catch (error) {
        logError({ action: 'CLEARINGHOUSE_TEST_ERROR', error: sanitizeError(error) });
        return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 });
    }
}

export const POST = withAuth(handlePost, { requiredRole: ['SUPER_ADMIN'], requireMFA: true });
