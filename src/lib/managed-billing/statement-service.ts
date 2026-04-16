import { createClient } from '@/lib/supabase/server';

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
        const supabase = await createClient();
        const { data: patient } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', patientId)
            .single();

        const patientName = patient
            ? `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim()
            : 'Unknown Patient';

        // TODO: replace stub items with real query of claim_lines joined with billing_claims
        // where patient_responsibility > 0 AND not yet paid by patient
        return {
            patientId,
            patientName,
            totalDue: 0,
            items: [],
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
