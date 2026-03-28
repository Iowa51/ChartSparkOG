import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { decryptPHI, encryptPHI } from '@/lib/security/encryption';
import { requireServiceRoleClient } from '@/lib/supabase/service-role-client';

const TELEHEALTH_JOIN_TOKEN_TTL_MS = 5 * 60 * 1000;
const TOKEN_PART_SEPARATOR = '.';

type TelehealthParticipantRole = 'provider' | 'patient';

interface CreateTelehealthJoinSessionParams {
    appointmentId: string;
    organizationId: string;
    participantRole: TelehealthParticipantRole;
    roomUrl: string;
    meetingToken?: string;
}

interface DecodedSessionRef {
    tokenId: string;
    expiresAt: string;
}

export interface TelehealthJoinSessionAccess {
    appointmentId: string;
    organizationId: string;
    participantRole: TelehealthParticipantRole;
    roomUrl: string;
    meetingToken?: string;
}

function getSigningKey(): string {
    const key = process.env.PHI_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!key) {
        throw new Error('Telehealth join signing key is not configured');
    }

    return key;
}

function signSessionRef(tokenId: string, expiresAt: string): string {
    return createHmac('sha256', getSigningKey())
        .update(`${tokenId}:${expiresAt}`)
        .digest('hex');
}

function timingSafeEqualHex(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
}

function buildSessionRef(tokenId: string, expiresAt: string): string {
    return `${tokenId}${TOKEN_PART_SEPARATOR}${expiresAt}${TOKEN_PART_SEPARATOR}${signSessionRef(tokenId, expiresAt)}`;
}

export function decodeTelehealthSessionRef(sessionTokenRef: string): DecodedSessionRef | null {
    const [tokenId, expiresAt, signature] = sessionTokenRef.split(TOKEN_PART_SEPARATOR);

    if (!tokenId || !expiresAt || !signature) {
        return null;
    }

    if (Number.isNaN(Date.parse(expiresAt))) {
        return null;
    }

    const expectedSignature = signSessionRef(tokenId, expiresAt);
    if (!timingSafeEqualHex(signature, expectedSignature)) {
        return null;
    }

    return {
        tokenId,
        expiresAt,
    };
}

export async function createTelehealthJoinSession(params: CreateTelehealthJoinSessionParams): Promise<string> {
    const supabase = requireServiceRoleClient();
    const tokenId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TELEHEALTH_JOIN_TOKEN_TTL_MS).toISOString();

    const { error } = await supabase
        .from('telehealth_session_tokens')
        .insert({
            token_id: tokenId,
            appointment_id: params.appointmentId,
            organization_id: params.organizationId,
            participant_role: params.participantRole,
            encrypted_room_url: await encryptPHI(params.roomUrl),
            encrypted_meeting_token: params.meetingToken ? await encryptPHI(params.meetingToken) : null,
            expires_at: expiresAt,
        });

    if (error) {
        throw error;
    }

    return buildSessionRef(tokenId, expiresAt);
}

/**
 * SEC-SPRINT10: Look up a valid patient session ref by appointment ID.
 * Used by accept-invite to set the cookie without the token ever appearing in a URL.
 */
export async function getPatientSessionRefByAppointment(appointmentId: string): Promise<string | null> {
    const supabase = requireServiceRoleClient();
    const { data, error } = await supabase
        .from('telehealth_session_tokens')
        .select('token_id, expires_at')
        .eq('appointment_id', appointmentId)
        .eq('participant_role', 'patient')
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    return buildSessionRef(data.token_id, data.expires_at);
}

export async function resolveTelehealthJoinSession(sessionTokenRef: string): Promise<TelehealthJoinSessionAccess | null> {
    const decoded = decodeTelehealthSessionRef(sessionTokenRef);
    if (!decoded || Date.parse(decoded.expiresAt) <= Date.now()) {
        return null;
    }

    const supabase = requireServiceRoleClient();

    // SEC-SPRINT8: Atomic single-use claim — UPDATE ... WHERE used = FALSE
    // If zero rows returned, the token was already consumed or does not exist.
    const { data, error } = await supabase
        .from('telehealth_session_tokens')
        .update({ used: true, last_accessed_at: new Date().toISOString() })
        .eq('token_id', decoded.tokenId)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .select('appointment_id, organization_id, participant_role, encrypted_room_url, encrypted_meeting_token')
        .single();

    if (error || !data) {
        return null;
    }

    return {
        appointmentId: data.appointment_id,
        organizationId: data.organization_id,
        participantRole: data.participant_role as TelehealthParticipantRole,
        roomUrl: await decryptPHI(data.encrypted_room_url),
        meetingToken: data.encrypted_meeting_token
            ? await decryptPHI(data.encrypted_meeting_token)
            : undefined,
    };
}
