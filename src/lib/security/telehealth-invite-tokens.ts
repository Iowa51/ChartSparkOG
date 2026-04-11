// SEC-AUDIT-2026-04-10: Opaque invite token model for telehealth.
//
// The invite URL the provider shares with the patient carries an opaque
// randomly-generated token, NOT the appointment ID. On acceptance the token is
// SHA-256 hashed, looked up, verified unused + unexpired, and atomically
// consumed. The plaintext token is never persisted.

import { createHash, randomBytes } from 'crypto';
import { requireServiceRoleClient } from '@/lib/supabase/service-role-client';

const INVITE_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes — ample for the patient to click the link
const INVITE_TOKEN_BYTES = 32;

type TelehealthParticipantRole = 'provider' | 'patient';

interface CreateTelehealthInviteTokenParams {
    appointmentId: string;
    organizationId: string;
    participantRole: TelehealthParticipantRole;
}

export interface TelehealthInviteTokenRecord {
    appointmentId: string;
    organizationId: string;
    participantRole: TelehealthParticipantRole;
}

function hashInviteToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Issue a new opaque invite token. Returns the plaintext token — the caller
 * must include it in the patient-facing invite URL and then discard it.
 */
export async function createTelehealthInviteToken(
    params: CreateTelehealthInviteTokenParams
): Promise<string> {
    const supabase = requireServiceRoleClient();
    const token = randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS).toISOString();

    const { error } = await supabase
        .from('telehealth_invite_tokens')
        .insert({
            token_hash: tokenHash,
            appointment_id: params.appointmentId,
            organization_id: params.organizationId,
            participant_role: params.participantRole,
            expires_at: expiresAt,
        });

    if (error) {
        throw error;
    }

    return token;
}

/**
 * Atomically consume an invite token. Hashes the presented plaintext token,
 * looks up the record, and on a single row update marks it used. Returns the
 * record data on success, or null if the token is invalid/expired/consumed.
 */
export async function consumeTelehealthInviteToken(
    presentedToken: string
): Promise<TelehealthInviteTokenRecord | null> {
    if (!presentedToken || typeof presentedToken !== 'string') {
        return null;
    }

    const tokenHash = hashInviteToken(presentedToken);
    const supabase = requireServiceRoleClient();
    const nowIso = new Date().toISOString();

    // Atomic single-use claim: UPDATE ... WHERE used_at IS NULL AND expires_at > NOW()
    // If the update affects zero rows, the token is invalid/expired/already consumed.
    const { data, error } = await supabase
        .from('telehealth_invite_tokens')
        .update({ used_at: nowIso })
        .eq('token_hash', tokenHash)
        .is('used_at', null)
        .gt('expires_at', nowIso)
        .select('appointment_id, organization_id, participant_role')
        .single();

    if (error || !data) {
        return null;
    }

    return {
        appointmentId: data.appointment_id,
        organizationId: data.organization_id,
        participantRole: data.participant_role as TelehealthParticipantRole,
    };
}
