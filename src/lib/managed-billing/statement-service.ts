/**
 * Statement Service
 * 
 * Logic for generating patient responsibility statements based on 
 * claim adjustments and payments recorded from ERAs.
 */

export interface PatientBalance {
    patientId: string;
    patientName: string;
    totalDue: number; // in cents
    items: StatementItem[];
}

export interface StatementItem {
    date: string;
    description: string;
    billed: number;
    paidByInsurance: number;
    adjustments: number;
    patientResponsibility: number;
}

export class StatementService {
    /**
     * Generates a balance report for a patient
     */
    static async getPatientBalance(patientId: string): Promise<PatientBalance> {
        // In a real app, this would query the db (claim_lines joined with billing_claims)
        // for lines where patient_responsibility > 0 AND not yet paid by patient.

        return {
            patientId,
            patientName: "Sarah Connor",
            totalDue: 2500, // $25.00
            items: [
                {
                    date: "Oct 24, 2023",
                    description: "Follow-up Visit (99214)",
                    billed: 18500,
                    paidByInsurance: 15000,
                    adjustments: 1000,
                    patientResponsibility: 2500
                }
            ]
        };
    }

    /**
     * Formats currency for display
     */
    static formatCurrency(cents: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(cents / 100);
    }
}
