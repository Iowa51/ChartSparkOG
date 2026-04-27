import { createClient } from '@/lib/supabase/server';
import { computePilotState } from '@/lib/pilot/phase';
import { PilotReadOnlyBannerClient } from './pilot-readonly-banner';

export async function PilotReadOnlyBanner() {
    const supabase = await createClient();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userRow } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();
    if (!userRow?.organization_id) return null;

    const { data: orgRow } = await supabase
        .from('organizations')
        .select('is_pilot, pilot_started_at, pilot_active_until, pilot_readonly_until')
        .eq('id', userRow.organization_id)
        .single();
    if (!orgRow) return null;

    const state = computePilotState(orgRow);
    if (state.phase !== 'readonly' || state.daysRemainingInReadonly === null) {
        return null;
    }

    return <PilotReadOnlyBannerClient daysRemaining={state.daysRemainingInReadonly} />;
}
