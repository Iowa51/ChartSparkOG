/**
 * ERA (835) Electronic Remittance Advice Parser
 * 
 * Extracts payment and adjustment data from HIPAA 835 transaction sets
 * to update claim statuses and patient balances.
 */

export interface ERAMessage {
    payerName: string;
    payerId: string;
    payeeName: string;
    npi: string;
    paymentDate: Date;
    totalPaidAmount: number; // in cents
    checkOrEftTraceNumber: string;
    claims: ERAClaim[];
}

export interface ERAClaim {
    patientFirstName: string;
    patientLastName: string;
    patientMemberId: string;
    claimControlNumber: string; // Our claim_id
    payerClaimControlNumber: string;
    serviceDate: Date;
    totalBilledAmount: number; // in cents
    totalPaidAmount: number; // in cents
    patientResponsibility: number; // in cents
    adjustments: Array<{
        groupCode: string; // e.g., PR, CO, OA
        reasonCode: string; // e.g., 45, 1, 2
        amount: number; // in cents
    }>;
}

export class ERAParser {
    /**
     * Parses 835 EDI content into structured message objects
     */
    static parse(content: string): ERAMessage[] {
        const messages: ERAMessage[] = [];
        const transactions = content.split('ST*835*');

        // Skip the first split if it's empty (pre-ST content)
        for (let i = 1; i < transactions.length; i++) {
            messages.push(this.parseTransaction('ST*835*' + transactions[i]));
        }

        return messages;
    }

    private static parseTransaction(edi: string): ERAMessage {
        const segments = edi.split('~');

        let payerName = '';
        let payerId = '';
        let payeeName = '';
        let npi = '';
        let paymentDate = new Date();
        let totalPaidAmount = 0;
        let traceNumber = '';
        const claims: ERAClaim[] = [];

        let currentClaim: Partial<ERAClaim> | null = null;

        for (const segment of segments) {
            const parts = segment.split('*');
            const tag = parts[0];

            switch (tag) {
                case 'BPR':
                    // BPR*I*150.50*C*CHK************20231028
                    totalPaidAmount = Math.round(parseFloat(parts[2]) * 100);
                    paymentDate = this.parseDate8(parts[16]);
                    break;
                case 'TRN':
                    // TRN*1*TRACE12345
                    traceNumber = parts[2];
                    break;
                case 'NM1':
                    // F-013: Merged both NM1 handlers into single case block
                    if (parts[1] === 'PR') payerName = parts[3];
                    if (parts[1] === 'PE') payeeName = parts[3];
                    if (parts[1] === 'PE' && parts[8] === 'XX') npi = parts[9];
                    if (parts[1] === 'QC' && currentClaim) {
                        currentClaim.patientLastName = parts[3];
                        currentClaim.patientFirstName = parts[4];
                        currentClaim.patientMemberId = parts[9];
                    }
                    break;
                case 'REF':
                    if (parts[1] === '2U') payerId = parts[2];
                    break;
                case 'CLP':
                    // CLP*CLAIM123*1*200.00*150.00*10.00*12*PAYERCLAIM999
                    if (currentClaim) claims.push(currentClaim as ERAClaim);
                    currentClaim = {
                        claimControlNumber: parts[1],
                        totalBilledAmount: Math.round(parseFloat(parts[3]) * 100),
                        totalPaidAmount: Math.round(parseFloat(parts[4]) * 100),
                        patientResponsibility: Math.round(parseFloat(parts[5]) * 100),
                        payerClaimControlNumber: parts[7],
                        adjustments: []
                    };
                    break;
                case 'DTM':
                    if (parts[1] === '232' && currentClaim) {
                        currentClaim.serviceDate = this.parseDate8(parts[2]);
                    }
                    break;
                case 'CAS':
                    // CAS*PR*1*10.00~
                    if (currentClaim && currentClaim.adjustments) {
                        currentClaim.adjustments.push({
                            groupCode: parts[1],
                            reasonCode: parts[2],
                            amount: Math.round(parseFloat(parts[3]) * 100)
                        });
                    }
                    break;
            }
        }

        if (currentClaim) claims.push(currentClaim as ERAClaim);

        return {
            payerName,
            payerId,
            payeeName,
            npi,
            paymentDate,
            totalPaidAmount,
            checkOrEftTraceNumber: traceNumber,
            claims
        };
    }

    private static parseDate8(str: string): Date {
        if (!str || str.length !== 8) return new Date();
        const year = parseInt(str.substring(0, 4));
        const month = parseInt(str.substring(4, 6)) - 1;
        const day = parseInt(str.substring(6, 8));
        return new Date(year, month, day);
    }
}
