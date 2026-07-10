// Sprint 2 / P3 (Part A) -- patient portal invite claim.
// Unauthenticated (token-guarded): validate invite -> create account -> link
// patient_portal_users -> establish a Supabase Auth session (httpOnly cookies).
// INTAKE_V1-gated (404), CSRF-checked (403), fail-closed rate limited (invite
// token-guessing surface). Never returns whether an email exists.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateOrigin } from "@/lib/security/csrf";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { checkRateLimitByKey } from "@/lib/security/rate-limit";
import { validateRequest } from "@/lib/validation/schemas";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { isIntakeV1Enabled } from "@/lib/config/environment";
import { claimPortalInvite } from "@/lib/portal/portal-invites";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler-client";

const PortalClaimSchema = z
  .object({
    token: z.string().min(10).max(200),
    password: z.string().min(1).max(200),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!isIntakeV1Enabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const { ipAddress } = getRequestMetadata(request);
  const rateLimit = await checkRateLimitByKey(ipAddress, "invitationAccept", "/api/portal/claim");
  if (!rateLimit.success && rateLimit.response) return rateLimit.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const validation = validateRequest(PortalClaimSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    const result = await claimPortalInvite(validation.data.token, validation.data.password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Establish the patient session (httpOnly GoTrue cookies via @supabase/ssr).
    const { supabase, applyCookies } = createRouteHandlerClient(request);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: result.email,
      password: validation.data.password,
    });
    if (signInError) {
      // Account was created but auto-sign-in failed; the patient can log in.
      return NextResponse.json({ success: true, signedIn: false });
    }
    return applyCookies(NextResponse.json({ success: true, signedIn: true }));
  } catch (error) {
    logError({ action: "PORTAL_CLAIM_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Unable to accept invite" }, { status: 500 });
  }
}
