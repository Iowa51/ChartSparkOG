import { createClient } from '@/lib/supabase/server';
import { computePilotState, type PilotState } from './phase';

export async function getPilotStateForOrg(orgId: string): Promise<PilotState> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      phase: 'not_pilot',
      isPilot: false,
      pilotStartedAt: null,
      pilotActiveUntil: null,
      pilotReadonlyUntil: null,
      daysRemainingInActive: null,
      daysRemainingInReadonly: null,
    };
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('is_pilot, pilot_started_at, pilot_active_until, pilot_readonly_until')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    return {
      phase: 'not_pilot',
      isPilot: false,
      pilotStartedAt: null,
      pilotActiveUntil: null,
      pilotReadonlyUntil: null,
      daysRemainingInActive: null,
      daysRemainingInReadonly: null,
    };
  }

  return computePilotState(org);
}

export class PilotPhaseError extends Error {
  code: 'PILOT_READONLY' | 'PILOT_LOCKED';
  status: number;
  constructor(code: 'PILOT_READONLY' | 'PILOT_LOCKED') {
    super(code);
    this.code = code;
    this.status = 423;
    this.name = 'PilotPhaseError';
  }
}

export function assertMutationAllowed(state: PilotState): void {
  if (!state.isPilot) return;
  if (state.phase === 'active') return;
  if (state.phase === 'readonly') {
    throw new PilotPhaseError('PILOT_READONLY');
  }
  if (state.phase === 'locked') {
    throw new PilotPhaseError('PILOT_LOCKED');
  }
}

export function assertReadAllowed(state: PilotState): void {
  if (!state.isPilot) return;
  if (state.phase === 'locked') {
    throw new PilotPhaseError('PILOT_LOCKED');
  }
}
