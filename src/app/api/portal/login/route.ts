// Sprint 2 / P3 (Part A) -- returning patient portal login.
// INTAKE_V1-gated (404), CSRF-checked (403), fail-closed rate limited (login
// bucket). Establishes a Supabase Auth session; returns a generic 401 on any
// failure (no credential enumeration).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateOrigin } from "@/lib/security/csrf";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { checkRateLimitByKey } from "@/lib/security/rate-limit";
import { validateRequest } from "@/lib/validation/schemas";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { isIntakeV1Enabled } from "@/lib/config/environment";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler-client";

const PortalLoginSchema = z
  .object({
    email: z.string().email().max(320),
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
  const rateLimit = await checkRateLimitByKey(ipAddress, "login", "/api/portal/login");
  if (!rateLimit.success && rateLimit.response) return rateLimit.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const validation = validateRequest(PortalLoginSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    const { supabase, applyCookies } = createRouteHandlerClient(request);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email.toLowerCase(),
      password: validation.data.password,
    });
    if (error || !data?.user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    return applyCookies(NextResponse.json({ success: true }));
  } catch (error) {
    logError({ action: "PORTAL_LOGIN_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
