// Portal session resolution (Sprint 2 / P3, Part A).
//
// The patient authenticates with Supabase Auth (GoTrue) -- httpOnly sb-* cookies
// via @supabase/ssr, the repo convention. That session establishes IDENTITY
// (the auth_user_id). This resolver reads the cookie session, then maps
// auth_user_id -> patient via the patient_portal RLS (own row only). The write
// path then executes as the patient_portal DB role with this auth_user_id.
//
// Fail closed: any missing/invalid session, unmapped auth user, or unconfigured
// Supabase => null (the caller returns 401).

import { createClient } from "@/lib/supabase/server";
import { getPortalPatientMapping } from "@/lib/portal/portal-db";

export interface PortalPatient {
  authUserId: string;
  patientId: string;
  organizationId: string;
}

export async function resolvePortalPatient(): Promise<PortalPatient | null> {
  const supabase = await createClient();
  if (!supabase) return null; // demo mode / unconfigured -> deny

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;

  const mapping = await getPortalPatientMapping(data.user.id);
  if (!mapping) return null;

  return {
    authUserId: data.user.id,
    patientId: mapping.patientId,
    organizationId: mapping.organizationId,
  };
}
