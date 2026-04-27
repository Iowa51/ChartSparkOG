import { describe, it, expect } from 'vitest';
import { computePilotState } from './phase';

const day = 86_400_000;

describe('computePilotState', () => {
  it('returns not_pilot for non-pilot org', () => {
    const state = computePilotState({
      is_pilot: false,
      pilot_started_at: null,
      pilot_active_until: null,
      pilot_readonly_until: null,
    });
    expect(state.phase).toBe('not_pilot');
    expect(state.isPilot).toBe(false);
    expect(state.daysRemainingInActive).toBeNull();
    expect(state.daysRemainingInReadonly).toBeNull();
  });

  it('returns active with days remaining when now < pilot_active_until', () => {
    const now = new Date('2026-04-01T00:00:00Z');
    const startedAt = new Date(now.getTime() - 1 * day);
    const activeUntil = new Date(now.getTime() + 4 * day);
    const readonlyUntil = new Date(activeUntil.getTime() + 7 * day);

    const state = computePilotState({
      is_pilot: true,
      pilot_started_at: startedAt.toISOString(),
      pilot_active_until: activeUntil.toISOString(),
      pilot_readonly_until: readonlyUntil.toISOString(),
    }, now);

    expect(state.phase).toBe('active');
    expect(state.isPilot).toBe(true);
    expect(state.daysRemainingInActive).toBe(4);
    expect(state.daysRemainingInReadonly).toBeNull();
  });

  it('returns readonly when exactly at pilot_active_until', () => {
    const now = new Date('2026-04-05T00:00:00Z');
    const startedAt = new Date(now.getTime() - 5 * day);
    const activeUntil = new Date(now.getTime());
    const readonlyUntil = new Date(activeUntil.getTime() + 7 * day);

    const state = computePilotState({
      is_pilot: true,
      pilot_started_at: startedAt.toISOString(),
      pilot_active_until: activeUntil.toISOString(),
      pilot_readonly_until: readonlyUntil.toISOString(),
    }, now);

    expect(state.phase).toBe('readonly');
    expect(state.daysRemainingInActive).toBeNull();
    expect(state.daysRemainingInReadonly).toBe(7);
  });

  it('returns readonly when now > pilot_active_until and now < pilot_readonly_until', () => {
    const now = new Date('2026-04-08T00:00:00Z');
    const startedAt = new Date(now.getTime() - 8 * day);
    const activeUntil = new Date(now.getTime() - 3 * day);
    const readonlyUntil = new Date(now.getTime() + 4 * day);

    const state = computePilotState({
      is_pilot: true,
      pilot_started_at: startedAt.toISOString(),
      pilot_active_until: activeUntil.toISOString(),
      pilot_readonly_until: readonlyUntil.toISOString(),
    }, now);

    expect(state.phase).toBe('readonly');
    expect(state.daysRemainingInReadonly).toBe(4);
  });

  it('returns locked when exactly at pilot_readonly_until', () => {
    const now = new Date('2026-04-12T00:00:00Z');
    const startedAt = new Date(now.getTime() - 12 * day);
    const activeUntil = new Date(now.getTime() - 7 * day);
    const readonlyUntil = new Date(now.getTime());

    const state = computePilotState({
      is_pilot: true,
      pilot_started_at: startedAt.toISOString(),
      pilot_active_until: activeUntil.toISOString(),
      pilot_readonly_until: readonlyUntil.toISOString(),
    }, now);

    expect(state.phase).toBe('locked');
    expect(state.daysRemainingInActive).toBeNull();
    expect(state.daysRemainingInReadonly).toBeNull();
  });

  it('returns locked when now > pilot_readonly_until', () => {
    const now = new Date('2026-04-20T00:00:00Z');
    const startedAt = new Date(now.getTime() - 20 * day);
    const activeUntil = new Date(now.getTime() - 15 * day);
    const readonlyUntil = new Date(now.getTime() - 8 * day);

    const state = computePilotState({
      is_pilot: true,
      pilot_started_at: startedAt.toISOString(),
      pilot_active_until: activeUntil.toISOString(),
      pilot_readonly_until: readonlyUntil.toISOString(),
    }, now);

    expect(state.phase).toBe('locked');
  });

  it('returns not_pilot when is_pilot true but timestamps are NULL (data integrity)', () => {
    const state = computePilotState({
      is_pilot: true,
      pilot_started_at: null,
      pilot_active_until: null,
      pilot_readonly_until: null,
    });
    expect(state.phase).toBe('not_pilot');
    expect(state.isPilot).toBe(false);
  });
});
