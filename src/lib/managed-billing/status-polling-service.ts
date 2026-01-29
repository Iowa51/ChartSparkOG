/**
 * Status Polling Service
 * 
 * Orchestrates the automated retrieval and processing of EDI files (999, 277CA, 835)
 * from the Office Ally SFTP server.
 */

import { OfficeAllySFTPAdapter, getOfficeAllyAdapter } from "./office-ally-sftp";
import { ERAParser } from "./era-parser";
import { createClient } from "@supabase/supabase-js";

export class StatusPollingService {
    /**
     * Main execution loop for picking up new files for a specific organization
     */
    static async pollOrganization(orgId: string): Promise<{ processed: number; errors: number }> {
        // In a real background job, we'd use a service role client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const adapter = await getOfficeAllyAdapter(orgId, supabase);
        let processedCount = 0;
        let errorCount = 0;

        try {
            // 1. Get Acknowledgements (999/277CA)
            const acks = await adapter.getAcknowledgements();
            for (const ack of acks) {
                try {
                    if (ack.fileName.includes('.277') || ack.fileName.includes('ACK')) {
                        await this.handleStatusAck(ack.content, orgId, ack.fileName);
                    } else {
                        await this.handleFunctionalAck(ack.content, orgId, ack.fileName);
                    }
                    processedCount++;
                } catch (e) {
                    errorCount++;
                }
            }

            // 2. Get ERAs (835)
            const eras = await adapter.downloadERAs();
            for (const era of eras) {
                try {
                    await this.handleERA(era.content, orgId, era.fileName);
                    processedCount++;
                } catch (e) {
                    errorCount++;
                }
            }

            return { processed: processedCount, errors: errorCount };
        } catch (err) {
            console.error(`Status Polling failed for org ${orgId}:`, err);
            throw err;
        }
    }

    /**
     * Handle 835 Electronic Remittance Advice
     */
    private static async handleERA(content: string, orgId: string, fileName: string) {
        const messages = ERAParser.parse(content);
        console.log(`[StatusPolling] Processing ERA ${fileName} with ${messages.length} payments`);
        // Logic for database updates would go here
    }

    /**
     * Handle 277CA Claim Acknowledgement
     */
    private static async handleStatusAck(content: string, orgId: string, fileName: string) {
        console.log(`[StatusPolling] Processing Claim Ack (277CA) ${fileName}`);
    }

    /**
     * Handle 999 Functional Acknowledgement
     */
    private static async handleFunctionalAck(content: string, orgId: string, fileName: string) {
        console.log(`[StatusPolling] Processing Functional Ack (999) ${fileName}`);
    }
}
