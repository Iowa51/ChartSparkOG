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
 *
 * `organizationId` scopes the read to the caller's org (F-033 / SEC-CODEX-2):
 * the org-scoped `vitals` RLS policy already blocks cross-org reads, and this
 * explicit filter keeps the query correct independent of RLS. It is REQUIRED
 * (fail-closed): pass the caller's org id to scope the read, or pass `null`
 * ONLY for a principal without an org (e.g. SUPER_ADMIN) where cross-org access
 * is intentional and RLS enforces it. Making it required prevents a future
 * caller from silently dropping the org filter by omitting the argument.
 */
export async function getPatientLatestVitals(
    patientId: string,
    organizationId: string | null,
    encounterId?: string,
): Promise<LatestVitals | null> {
    const supabase = await createClient();
    if (!supabase) return null;

    const columns =
        'bp_systolic, bp_diastolic, heart_rate, temperature, temperature_unit, respiratory_rate, spo2, bmi, recorded_at:created_at';

    try {
        if (encounterId) {
            let query = supabase
                .from('vitals')
                .select(columns)
                .eq('patient_id', patientId)
                .eq('encounter_id', encounterId);
            if (organizationId) query = query.eq('organization_id', organizationId);
            const { data } = await query
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (data) return data as unknown as LatestVitals;
        }

        let query = supabase.from('vitals').select(columns).eq('patient_id', patientId);
        if (organizationId) query = query.eq('organization_id', organizationId);
        const { data } = await query
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return (data as unknown as LatestVitals) || null;
    } catch (err) {
        logError({ action: 'GET_PATIENT_LATEST_VITALS_FAILED', error: sanitizeError(err) });
        return null;
    }
}
