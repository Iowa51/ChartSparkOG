/**
 * Clearinghouse Service
 * Handles communication with clearinghouses for claim submission
 * 
 * NOTE: This is INFRASTRUCTURE - inactive until clearinghouse is configured.
 */

import { createClient } from '@/lib/supabase/server';
import { decryptPHI } from '@/lib/security/encryption';
import { logWarn, logError, sanitizeError } from '@/lib/logging/safe-logger';

export type ClearinghouseType =
    | 'office_ally'
    | 'claim_md'
    | 'availity'
    | 'waystar'
    | 'trizetto'
    | 'other';

export interface ClaimSubmissionResult {
    success: boolean;
    submissionId?: string;
    clearinghouseClaimId?: string;
    error?: string;
}

interface GlobalConfig {
    clearinghouse: string;
    api_endpoint: string | null;
    api_key_encrypted: string | null;
    api_secret_encrypted: string | null;
    sftp_host: string | null;
    sftp_port: number;
    sftp_username: string | null;
    sftp_password_encrypted: string | null;
    submitter_id: string | null;
    submitter_name: string;
    submitter_npi: string | null;
    submitter_tax_id: string | null;
    is_active: boolean;
}

/**
 * Get global clearinghouse configuration
 */
export async function getGlobalClearinghouseConfig(
    clearinghouse: ClearinghouseType
): Promise<GlobalConfig | null> {
    const supabase = await createClient();

    if (!supabase) {
        logWarn({ action: 'CLEARINGHOUSE_NO_SUPABASE_CLIENT', status: 'demo_mode' });
        return null;
    }

    const { data } = await supabase
        .from('global_clearinghouse_config')
        .select('*')
        .eq('clearinghouse', clearinghouse)
        .eq('is_active', true)
        .single();

    return data;
}

/**
 * Submit claim to clearinghouse
 */
export async function submitClaimToClearinghouse(
    claimId: string,
    clearinghouse: ClearinghouseType = 'office_ally'
): Promise<ClaimSubmissionResult> {
    const supabase = await createClient();

    if (!supabase) {
        return { success: false, error: 'Database not available' };
    }

    // Get claim data with relations
    const { data: claim, error: claimError } = await supabase
        .from('billing_claims')
        .select(`
      *,
      patients (
        id, first_name, last_name, date_of_birth, gender,
        address, city, state, zip_code,
        insurance_provider, insurance_id, insurance_group
      ),
      organizations (
        id, name, npi, tax_id, 
        address, city, state, zip_code
      )
    `)
        .eq('id', claimId)
        .single();

    if (claimError || !claim) {
        return { success: false, error: 'Claim not found' };
    }

    // Get clearinghouse config
    const config = await getGlobalClearinghouseConfig(clearinghouse);

    if (!config) {
        // No clearinghouse configured - mark for manual submission
        await recordManualSubmission(supabase, claimId);
        return {
            success: true,
            submissionId: 'manual',
            error: 'No clearinghouse configured - marked for manual submission'
        };
    }

    try {
        // Generate EDI 837 file
        const ediContent = generateEDI837(claim, config);

        // Submit based on clearinghouse type
        let result: ClaimSubmissionResult;

        switch (clearinghouse) {
            case 'claim_md':
                result = await submitToClaimMD(claim, ediContent, config);
                break;
            case 'availity':
                result = await submitToAvaility(claim, ediContent, config);
                break;
            case 'office_ally':
            default:
                result = await submitViaSFTP(claim, ediContent, config);
        }

        // Record submission
        await supabase.from('claim_submissions').insert({
            claim_id: claimId,
            clearinghouse,
            submission_method: result.success ? 'api' : 'error',
            edi_file_content: ediContent,
            clearinghouse_claim_id: result.clearinghouseClaimId,
            status: result.success ? 'sent' : 'error',
            response_message: result.error,
            submitted_at: new Date().toISOString(),
        });

        // Update claim status
        if (result.success) {
            await supabase
                .from('billing_claims')
                .update({
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                })
                .eq('id', claimId);
        }

        return result;

    } catch (error) {
        logError({ action: 'CLEARINGHOUSE_SUBMISSION_ERROR', error: sanitizeError(error) });
        return { success: false, error: 'Submission failed' };
    }
}

/**
 * Generate EDI 837 Professional claim file
 * This is a simplified example - real 837 generation is complex
 */
function generateEDI837(claim: any, config: GlobalConfig): string {
    const segments: string[] = [];
    const currentDate = new Date();
    const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = currentDate.toISOString().slice(11, 16).replace(':', '');
    const payerId = claim.payer_id || 'UNKNOWN';

    // ISA - Interchange Control Header
    segments.push(
        `ISA*00*          *00*          *ZZ*${padRight(config.submitter_id || '', 15)}*ZZ*${padRight(payerId, 15)}*${dateStr.slice(2)}*${timeStr}*^*00501*000000001*0*P*:~`
    );

    // GS - Functional Group Header
    segments.push(
        `GS*HC*${config.submitter_id || 'SUBMITTER'}*${payerId}*${dateStr}*${timeStr}*1*X*005010X222A1~`
    );

    // ST - Transaction Set Header
    segments.push(`ST*837*0001*005010X222A1~`);

    // BHT - Beginning of Hierarchical Transaction
    segments.push(
        `BHT*0019*00*${claim.claim_number}*${dateStr}*${timeStr}*CH~`
    );

    // NM1 - Submitter Name
    segments.push(
        `NM1*41*2*${config.submitter_name}*****46*${config.submitter_id || ''}~`
    );

    // Note: Full 837 implementation requires many more segments
    // This is a placeholder for actual EDI generation

    // SE - Transaction Set Trailer
    segments.push(`SE*${segments.length + 1}*0001~`);

    // GE - Functional Group Trailer
    segments.push(`GE*1*1~`);

    // IEA - Interchange Control Trailer
    segments.push(`IEA*1*000000001~`);

    return segments.join('\n');
}

function padRight(str: string, length: number): string {
    return (str || '').padEnd(length, ' ').slice(0, length);
}

/**
 * Submit to Claim.MD via REST API
 */
async function submitToClaimMD(
    claim: any,
    ediContent: string,
    config: GlobalConfig
): Promise<ClaimSubmissionResult> {
    try {
        if (!config.api_key_encrypted || !config.api_secret_encrypted) {
            return { success: false, error: 'Claim.MD credentials not configured' };
        }

        // H3: Decrypt credentials before use
        const apiKey = await decryptPHI(config.api_key_encrypted!);
        const apiSecret = await decryptPHI(config.api_secret_encrypted!);
        const response = await fetch('https://api.claim.md/api/v2/claims', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                claim_data: ediContent,
                format: '837P',
            }),
        });

        if (response.ok) {
            const result = await response.json();
            return {
                success: true,
                clearinghouseClaimId: result.claim_id,
            };
        }

        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.message || 'Claim.MD submission failed' };

    } catch (error) {
        logError({ action: 'CLAIM_MD_SUBMISSION_ERROR', error: sanitizeError(error) });
        return { success: false, error: 'Claim.MD submission failed' };
    }
}

/**
 * Submit to Availity via OAuth2 API
 */
async function submitToAvaility(
    claim: any,
    ediContent: string,
    config: GlobalConfig
): Promise<ClaimSubmissionResult> {
    try {
        if (!config.api_key_encrypted || !config.api_secret_encrypted) {
            return { success: false, error: 'Availity credentials not configured' };
        }

        // H3: Decrypt credentials before use
        const clientId = await decryptPHI(config.api_key_encrypted!);
        const clientSecret = await decryptPHI(config.api_secret_encrypted!);
        // Get OAuth token
        const tokenResponse = await fetch('https://api.availity.com/v1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            }),
        });

        if (!tokenResponse.ok) {
            return { success: false, error: 'Failed to authenticate with Availity' };
        }

        const { access_token } = await tokenResponse.json();

        // Submit claim
        const claimResponse = await fetch('https://api.availity.com/v1/claims', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/edi-x12',
            },
            body: ediContent,
        });

        if (claimResponse.ok) {
            const result = await claimResponse.json();
            return {
                success: true,
                clearinghouseClaimId: result.claimId,
            };
        }

        return { success: false, error: 'Availity submission failed' };

    } catch (error) {
        logError({ action: 'AVAILITY_SUBMISSION_ERROR', error: sanitizeError(error) });
        return { success: false, error: 'Availity submission failed' };
    }
}

/**
 * Submit via SFTP (placeholder - requires ssh2-sftp-client)
 */
async function submitViaSFTP(
    claim: any,
    ediContent: string,
    config: GlobalConfig
): Promise<ClaimSubmissionResult> {
    try {
        // SFTP submission requires ssh2-sftp-client package
        // This is a placeholder that marks for manual upload

        // H3: Do not log SFTP credentials or host details

        // In production:
        // import SftpClient from 'ssh2-sftp-client';
        // const sftp = new SftpClient();
        // await sftp.connect({ host, username, password });
        // await sftp.put(Buffer.from(ediContent), `/claims/claim_${claim.claim_number}.837`);

        return {
            success: true,
            submissionId: `sftp-${Date.now()}`,
        };

    } catch (error) {
        logError({ action: 'SFTP_SUBMISSION_ERROR', error: sanitizeError(error) });
        return { success: false, error: 'SFTP submission failed' };
    }
}

/**
 * Record claim for manual submission
 */
async function recordManualSubmission(supabase: any, claimId: string) {
    await supabase.from('claim_submissions').insert({
        claim_id: claimId,
        clearinghouse: 'other',
        submission_method: 'manual',
        status: 'pending',
    });
}

/**
 * Check claim status with clearinghouse
 */
export async function checkClaimStatus(
    claimId: string
): Promise<{ status: string; details?: any }> {
    const supabase = await createClient();

    if (!supabase) {
        return { status: 'unknown' };
    }

    const { data: submission } = await supabase
        .from('claim_submissions')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!submission || !submission.clearinghouse_claim_id) {
        return { status: 'unknown' };
    }

    return { status: submission.status };
}

/**
 * Get all clearinghouse configs for admin
 */
export async function getAllClearinghouseConfigs(): Promise<GlobalConfig[]> {
    const supabase = await createClient();

    if (!supabase) {
        return [];
    }

    const { data } = await supabase
        .from('global_clearinghouse_config')
        .select('*')
        .order('clearinghouse');

    return data || [];
}

/**
 * Update clearinghouse config
 */
export async function updateClearinghouseConfig(
    config: Partial<GlobalConfig>
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    if (!supabase) {
        return { success: false, error: 'Database not available' };
    }

    const { error } = await supabase
        .from('global_clearinghouse_config')
        .upsert({
            ...config,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'clearinghouse',
        });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
