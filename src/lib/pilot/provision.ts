import { createClient } from '@/lib/supabase/server';

export interface PilotProvisionInput {
  organizationId: string;
  activeDays: number;
  readonlyDays: number;
  startAt?: Date;
}

export async function startPilot(input: PilotProvisionInput): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error('Supabase client unavailable');
  const startedAt = input.startAt ?? new Date();
  const activeUntil = new Date(startedAt.getTime() + input.activeDays * 86_400_000);
  const readonlyUntil = new Date(activeUntil.getTime() + input.readonlyDays * 86_400_000);

  const { error } = await supabase
    .from('organizations')
    .update({
      is_pilot: true,
      pilot_started_at: startedAt.toISOString(),
      pilot_active_until: activeUntil.toISOString(),
      pilot_readonly_until: readonlyUntil.toISOString(),
    })
    .eq('id', input.organizationId);

  if (error) throw error;
}

export async function endPilot(organizationId: string): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error('Supabase client unavailable');
  const now = new Date();
  const { error } = await supabase
    .from('organizations')
    .update({
      pilot_active_until: now.toISOString(),
      pilot_readonly_until: now.toISOString(),
    })
    .eq('id', organizationId);
  if (error) throw error;
}

export async function extendPilot(organizationId: string, additionalActiveDays: number): Promise<void> {
  const supabase = await createClient();
  if (!supabase) throw new Error('Supabase client unavailable');
  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('pilot_active_until, pilot_readonly_until')
    .eq('id', organizationId)
    .single();
  if (fetchErr || !org) throw fetchErr ?? new Error('Org not found');

  const newActiveUntil = new Date(
    new Date(org.pilot_active_until).getTime() + additionalActiveDays * 86_400_000
  );
  const newReadonlyUntil = new Date(
    new Date(org.pilot_readonly_until).getTime() + additionalActiveDays * 86_400_000
  );

  const { error } = await supabase
    .from('organizations')
    .update({
      pilot_active_until: newActiveUntil.toISOString(),
      pilot_readonly_until: newReadonlyUntil.toISOString(),
    })
    .eq('id', organizationId);
  if (error) throw error;
}
