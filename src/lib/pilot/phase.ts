export type PilotPhase = 'not_pilot' | 'active' | 'readonly' | 'locked';

export interface PilotState {
  phase: PilotPhase;
  isPilot: boolean;
  pilotStartedAt: Date | null;
  pilotActiveUntil: Date | null;
  pilotReadonlyUntil: Date | null;
  daysRemainingInActive: number | null;
  daysRemainingInReadonly: number | null;
}

export function computePilotState(org: {
  is_pilot: boolean;
  pilot_started_at: string | null;
  pilot_active_until: string | null;
  pilot_readonly_until: string | null;
}, now: Date = new Date()): PilotState {
  if (!org.is_pilot || !org.pilot_active_until || !org.pilot_readonly_until) {
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

  const activeUntil = new Date(org.pilot_active_until);
  const readonlyUntil = new Date(org.pilot_readonly_until);
  const startedAt = org.pilot_started_at ? new Date(org.pilot_started_at) : null;

  const msPerDay = 1000 * 60 * 60 * 24;

  let phase: PilotPhase;
  let daysRemainingInActive: number | null = null;
  let daysRemainingInReadonly: number | null = null;

  if (now < activeUntil) {
    phase = 'active';
    daysRemainingInActive = Math.ceil((activeUntil.getTime() - now.getTime()) / msPerDay);
  } else if (now < readonlyUntil) {
    phase = 'readonly';
    daysRemainingInReadonly = Math.ceil((readonlyUntil.getTime() - now.getTime()) / msPerDay);
  } else {
    phase = 'locked';
  }

  return {
    phase,
    isPilot: true,
    pilotStartedAt: startedAt,
    pilotActiveUntil: activeUntil,
    pilotReadonlyUntil: readonlyUntil,
    daysRemainingInActive,
    daysRemainingInReadonly,
  };
}
