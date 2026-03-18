import { createClient } from '@supabase/supabase-js';
import { decryptPHI } from '@/lib/security/encryption';

/**
 * Office Ally SFTP Adapter
 * 
 * Handles batch file transfers (837P Claims and 835 ERAs) 
 * for the medical billing module.
 */

export interface SFTPConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    path: string;
}

export class OfficeAllySFTPAdapter {
    private config: SFTPConfig;
    private isMock: boolean;

    constructor(config: SFTPConfig, isMock: boolean = false) {
        this.config = config;
        this.isMock = isMock;
    }

    /**
     * Upload an 837P claim file to Office Ally
     * Filename for test mode MUST include 'OATEST'
     */
    async uploadClaim(fileName: string, content: string): Promise<{ success: boolean; message: string }> {
        console.log(`[SFTP] Preparation: Uploading ${fileName} to ${this.config.host}`);

        if (this.isMock) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                success: true,
                message: `MOCK: File ${fileName} successfully uploaded to ${this.config.path}`
            };
        }

        try {
            // TODO: Implementation with 'ssh2-sftp-client' once dependency is finalized
            // const sftp = new Client();
            // await sftp.connect(this.config);
            // await sftp.put(Buffer.from(content), `${this.config.path}/${fileName}`);
            // await sftp.end();

            throw new Error('SFTP Client dependency not yet installed. Use isMock=true for now.');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'SFTP upload failed';
            console.error(`[SFTP] Upload Error: ${msg}`);
            return { success: false, message: msg };
        }
    }

    /**
     * Download 835 ERAs from Office Ally
     */
    async downloadERAs(): Promise<Array<{ fileName: string; content: string }>> {
        if (this.isMock) {
            return [
                {
                    fileName: 'ERA_TEST_001.txt',
                    content: 'ISA*00*...ERA_PAYMENT_DATA...~'
                }
            ];
        }

        // TODO: Implementation for ERA retrieval
        return [];
    }

    /**
     * Check for acknowledgements (999/277CA) in the outbound folder
     */
    async getAcknowledgements(): Promise<Array<{ fileName: string; content: string }>> {
        if (this.isMock) {
            return [
                {
                    fileName: '999_ACK_OATEST.txt',
                    content: 'ISA*00*...ACK_SUCCESS...~'
                }
            ];
        }

        // TODO: Implementation for Ack retrieval
        return [];
    }
}

/**
 * Service Factory
 * Resolves the SFTP credentials for a specific organization
 */
export async function getOfficeAllyAdapter(organizationId: string, supabase: any) {
    const { data: config, error } = await supabase
        .from('clearinghouse_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('clearinghouse', 'office_ally')
        .single();

    if (error || !config) {
        // Return a mock adapter if no config exists (for demo/testing)
        return new OfficeAllySFTPAdapter({
            host: 'ftp10officeally.com',
            port: 22,
            username: 'MOCK_USER',
            path: '/inbound'
        }, true);
    }

    return new OfficeAllySFTPAdapter({
        host: config.sftp_host || 'ftp10officeally.com',
        port: 22,
        username: config.sftp_username,
        password: await decryptPHI(config.sftp_password), // F-035: Real AES-256-GCM decryption
        path: config.sftp_path || '/inbound'
    }, false);
}

// F-035: Removed fake base64 decrypt() — now uses decryptPHI with real AES-256-GCM
