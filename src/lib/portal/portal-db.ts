// Portal DB access as the `patient_portal` Postgres role (Sprint 2 / P3, Part A).
//
// PRD-02 architecture: "The portal application code uses the patient_portal
// role's connection string. Even if the app code has a bug, RLS prevents
// cross-patient data leaks." Supabase JS clients only bind anon/authenticated/
// service_role, so portal writes cannot go through them and keep the proven
// `TO patient_portal` RLS. Instead we open a pg connection as patient_portal,
// inject the authenticated patient's auth_user_id as request.jwt.claims.sub so
// auth.uid() resolves, and let RLS scope every row to that patient -- the exact
// mechanism the DB tests exercise (SET LOCAL ROLE patient_portal + jwt claims).
//
// NEVER the service role for patient writes (S4). This module is the only DB
// path the patient-facing write route uses.

import { Pool, type PoolClient } from "pg";
import type { IntakeResponses } from "@/lib/intake/types";

let pool: Pool | null = null;

// Fail closed: no configured portal connection => the write path errors rather
// than silently falling back to a privilege-bypassing path.
function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.PORTAL_DATABASE_URL;
  if (!connectionString) {
    throw new Error("PORTAL_DATABASE_URL is not configured");
  }
  pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 });
  return pool;
}

// Run `fn` in a transaction as patient_portal with auth.uid() = authUserId.
async function withPortalClient<T>(
  authUserId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: authUserId, role: "patient_portal" }),
    ]);
    // Explicit even when the connection role is already patient_portal: it makes
    // the effective role unambiguous and matches the RLS test harness exactly.
    await client.query("SET LOCAL ROLE patient_portal");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

// Run `fn` in a transaction as patient_portal with NO patient identity. Used for
// the pre-session invite flows (validate/claim), which call SECURITY DEFINER
// functions that take explicit arguments and never read auth.uid(). Still least
// privilege: the connection is the patient_portal role, and the definer functions
// are EXECUTE-granted only to it.
async function withPortalRole<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE patient_portal");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export interface PortalPatientMapping {
  patientId: string;
  organizationId: string;
}

/** Resolve the caller's patient + org via portal RLS (own row only). */
export async function getPortalPatientMapping(
  authUserId: string,
): Promise<PortalPatientMapping | null> {
  return withPortalClient(authUserId, async (client) => {
    const { rows } = await client.query<{ patient_id: string; organization_id: string }>(
      `SELECT ppu.patient_id, p.organization_id
         FROM public.patient_portal_users ppu
         JOIN public.patients p ON p.id = ppu.patient_id
        WHERE ppu.auth_user_id = auth.uid()
        LIMIT 1`,
    );
    if (rows.length === 0) return null;
    return { patientId: rows[0]!.patient_id, organizationId: rows[0]!.organization_id };
  });
}

/** Load a template definition the patient may see (active system/own-org only). */
export async function getTemplateDefinition(
  authUserId: string,
  templateId: string,
): Promise<unknown | null> {
  return withPortalClient(authUserId, async (client) => {
    const { rows } = await client.query<{ definition: unknown }>(
      `SELECT definition FROM public.intake_templates WHERE id = $1 LIMIT 1`,
      [templateId],
    );
    return rows.length ? rows[0]!.definition : null;
  });
}

export interface PortalTemplate {
  id: string;
  version: number;
  definition: unknown;
}

/**
 * Load the active template of a specialty for the AUTHENTICATED patient, through
 * the patient_portal role (P3-HIGH-4). The `portal_intake_templates_select` RLS
 * policy scopes this to active system (org NULL) or the patient's own-org
 * template, so a foreign org's template can never be rendered -- no service role.
 */
export async function getActivePortalTemplate(
  authUserId: string,
  specialty: string,
): Promise<PortalTemplate | null> {
  return withPortalClient(authUserId, async (client) => {
    const { rows } = await client.query<PortalTemplate>(
      `SELECT id, version, definition
         FROM public.intake_templates
        WHERE specialty = $1 AND active = TRUE
        ORDER BY version DESC
        LIMIT 1`,
      [specialty],
    );
    return rows.length ? rows[0]! : null;
  });
}

export interface OwnedSubmission {
  submittedAt: string | null;
  status: string;
  templateId: string | null;
}

/** Fetch a submission the caller owns (portal RLS); null if not theirs/absent. */
export async function getOwnedSubmission(
  authUserId: string,
  submissionId: string,
): Promise<OwnedSubmission | null> {
  return withPortalClient(authUserId, async (client) => {
    const { rows } = await client.query<{
      submitted_at: string | null;
      status: string;
      template_id: string | null;
    }>(
      `SELECT submitted_at, status, template_id FROM public.intake_submissions WHERE id = $1 LIMIT 1`,
      [submissionId],
    );
    if (rows.length === 0) return null;
    return {
      submittedAt: rows[0]!.submitted_at,
      status: rows[0]!.status,
      templateId: rows[0]!.template_id,
    };
  });
}

export interface NewSubmissionArgs {
  organizationId: string;
  patientId: string;
  templateId: string | null;
  responses: IntakeResponses;
}

/** Create a fresh patient_entered submission (RLS WITH CHECK pins ownership). */
export async function insertSubmission(
  authUserId: string,
  args: NewSubmissionArgs,
): Promise<string> {
  return withPortalClient(authUserId, async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO public.intake_submissions (organization_id, patient_id, template_id, status, responses)
         VALUES ($1, $2, $3, 'patient_entered', $4::jsonb)
         RETURNING id`,
      [args.organizationId, args.patientId, args.templateId, JSON.stringify(args.responses)],
    );
    return rows[0]!.id;
  });
}

/** Save-and-resume: overwrite responses while unsubmitted. Returns rows updated. */
export async function updateSubmissionResponses(
  authUserId: string,
  submissionId: string,
  args: { templateId: string | null; responses: IntakeResponses },
): Promise<number> {
  return withPortalClient(authUserId, async (client) => {
    const { rowCount } = await client.query(
      `UPDATE public.intake_submissions
          SET responses = $2::jsonb, template_id = COALESCE($3, template_id)
        WHERE id = $1`,
      [submissionId, JSON.stringify(args.responses), args.templateId],
    );
    return rowCount ?? 0;
  });
}

/** Final submit: materialize + lock via the SECURITY DEFINER RPC. */
export async function submitIntake(
  authUserId: string,
  submissionId: string,
): Promise<Record<string, unknown>> {
  return withPortalClient(authUserId, async (client) => {
    const { rows } = await client.query<{ r: Record<string, unknown> }>(
      `SELECT public.portal_submit_intake($1) AS r`,
      [submissionId],
    );
    return rows[0]!.r;
  });
}

// --- Invite flows (P3-HIGH-4/MED-6): read + claim via SECURITY DEFINER functions
//     over the patient_portal role -- never the service role. ---

export interface PortalInviteValidation {
  status: "valid" | "invalid" | "expired" | "claimed";
  invite?: { id: string; patientId: string; orgId: string; email: string };
}

/** Read-only invite validation (public.validate_portal_invite). */
export async function validatePortalInvite(tokenHash: string): Promise<PortalInviteValidation> {
  return withPortalRole(async (client) => {
    const { rows } = await client.query<{ r: PortalInviteValidation }>(
      `SELECT public.validate_portal_invite($1) AS r`,
      [tokenHash],
    );
    return rows[0]!.r;
  });
}

export interface PortalInviteClaim {
  ok: boolean;
  reason?: "invalid" | "expired" | "claimed" | "account_exists";
  patientId?: string;
  orgId?: string;
  email?: string;
}

/**
 * Atomic single-use invite claim (public.claim_portal_invite). Links the given
 * Supabase Auth id and marks the invite claimed in one transactional unit; a
 * non-ok result or a throw means the claim did NOT happen (the caller compensates
 * the Auth user).
 */
export async function claimPortalInviteTx(
  tokenHash: string,
  authUserId: string,
  email: string,
): Promise<PortalInviteClaim> {
  return withPortalRole(async (client) => {
    const { rows } = await client.query<{ r: PortalInviteClaim }>(
      `SELECT public.claim_portal_invite($1, $2, $3) AS r`,
      [tokenHash, authUserId, email],
    );
    return rows[0]!.r;
  });
}
