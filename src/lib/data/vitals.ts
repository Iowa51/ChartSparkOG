/**
 * Vitals Data Layer
 * Read-only helpers for the `vitals` table.
 */

import { createClient } from '@/lib/supabase/server';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export interface LatestVitals {
    bp_systolic: number | null;
    bp_diastolic: number | null;
    heart_rate: number | null;
    temperature: number | null;
    temperature_unit: string | null;
    respiratory_rate: number | null;
    spo2: number | null;
    bmi: number | null;
    recorded_at: string | null;
}

/**
 * Fetch the most recent vitals row for a patient. When encounterId is
 * provided, vitals from that encounter are preferred; if none exist,
 * fall back to the patient's most recent vitals from any encounter.
 * Returns null if the patient has no vitals recorded.
 */
export async function getPatientLatestVitals(
    patientId: string,
    encounterId?: string,
): Promise<LatestVitals | null> {
    const supabase = await createClient();
    if (!supabase) return null;

    const columns =
        'bp_systolic, bp_diastolic, heart_rate, temperature, temperature_unit, respiratory_rate, spo2, bmi, recorded_at:created_at';

    try {
        if (encounterId) {
            const { data } = await supabase
                .from('vitals')
                .select(columns)
                .eq('patient_id', patientId)
                .eq('encounter_id', encounterId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) return data as unknown as LatestVitals;
        }

        const { data } = await supabase
            .from('vitals')
            .select(columns)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return (data as unknown as LatestVitals) || null;
    } catch (err) {
        logError({ action: 'GET_PATIENT_LATEST_VITALS_FAILED', error: sanitizeError(err) });
        return null;
    }
}
