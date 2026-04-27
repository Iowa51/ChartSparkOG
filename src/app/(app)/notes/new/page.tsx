// Build 1.5: server shell for the new-note page. Loads the caller's
// organization pilot state and forwards an `isReadonly` flag to the
// (client) NewNoteForm so it can render disabled inputs + an in-form
// readonly banner.
//
// Pilot phase determination is server-side only — clients must never
// query the API to decide whether to allow editing. The API guards
// (assertMutationAllowed in /api/notes mutations) remain the source
// of truth; this page is defense-in-depth UI.

import { createClient } from '@/lib/supabase/server';
import { computePilotState } from '@/lib/pilot/phase';
import { logWarn } from '@/lib/logging/safe-logger';
import NewNoteForm from '@/components/notes/new-note-form';

export default async function NewNotePage() {
    const supabase = await createClient();

    let isReadonly = false;
    let pilotReadonlyUntil: string | null = null;
    let pilotPhase: 'not_pilot' | 'active' | 'readonly' | 'locked' = 'not_pilot';

    if (supabase) {
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
            const { data: userRow } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', authUser.id)
                .single();

            if (userRow?.organization_id) {
                const { data: org } = await supabase
                    .from('organizations')
                    .select(
                        'is_pilot, pilot_started_at, pilot_active_until, pilot_readonly_until',
                    )
                    .eq('id', userRow.organization_id)
                    .single();

                if (org) {
                    const state = computePilotState(org);
                    pilotPhase = state.phase;
                    pilotReadonlyUntil = org.pilot_readonly_until;
                    isReadonly = state.phase === 'readonly' || state.phase === 'locked';

                    if (state.phase === 'locked') {
                        // Reaching this page in 'locked' phase means middleware
                        // didn't redirect to /pilot-ended. Render the readonly
                        // UI as a fail-safe and surface the bug condition.
                        logWarn({
                            action: 'PILOT_LOCKED_PAGE_REACHED',
                            resourceType: 'note_create_page',
                            userId: authUser.id,
                        });
                    }
                }
            }
        }
    }

    return (
        <NewNoteForm
            isReadonly={isReadonly}
            pilotReadonlyUntil={pilotReadonlyUntil}
            pilotPhase={pilotPhase}
        />
    );
}
