/**
 * Check Feature Access API
 * SEC-HIGH-01: Migrated to withAuth wrapper
 * Returns whether user has access to a specific feature
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/subscriptions/subscription-service";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";

const CheckFeatureQuerySchema = z
  .object({
    feature: z.string().min(1).max(100),
  })
  .strict();

async function handleGet(context: AuthContext) {
  try {
    const { searchParams } = new URL(context.request.url);
    const queryParsed = CheckFeatureQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryParsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: queryParsed.error.issues },
        { status: 400 },
      );
    }
    const featureCode = queryParsed.data.feature;

    const supabase = await createClient();
    if (!supabase) {
      // Demo mode - all features enabled
      return NextResponse.json({ hasAccess: true });
    }

    const hasAccess = await checkFeatureAccess(context.user.id, featureCode);
    return NextResponse.json({ hasAccess });
  } catch (error) {
    logError({ action: "FEATURE_CHECK_ERROR", error: sanitizeError(error) });
    // Fail CLOSED - deny access on error (HIPAA safety)
    return NextResponse.json(
      { hasAccess: false, error: "Feature check unavailable" },
      { status: 503 },
    );
  }
}

export const GET = withAuth(handleGet);
