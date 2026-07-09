// src/app/api/terminology/[system]/route.ts
// Sprint 1 / P2 -- thin server-side proxy for the intake coded pickers. Forwards
// ONLY a sanitized search string to free public NLM terminology APIs (RxNorm via
// RxNav, ICD-10-CM via NIH Clinical Tables) or the curated allergen list. No
// patient identifiers, no PHI, ever leave here.
//
// Gated behind INTAKE_V1 (404 when off), IP rate-limited, input-sanitized. On
// upstream failure it returns 200 with empty results (degraded=true) so the
// picker degrades to free text and a patient is never blocked.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIP } from "@/lib/utils/get-client-ip";
import { checkRateLimitByKey } from "@/lib/security/rate-limit";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { isIntakeV1Enabled } from "@/lib/config/environment";
import { sanitizeSearchQuery } from "@/lib/validation/schemas";
import { isTerminologySystem } from "@/lib/terminology/types";
import { searchRxNorm } from "@/lib/terminology/rxnav";
import { searchIcd10 } from "@/lib/terminology/clinical-tables";
import { searchAllergens } from "@/lib/terminology/allergens";

const QuerySchema = z.object({ q: z.string().min(2).max(200) }).strip();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ system: string }> },
) {
  if (!isIntakeV1Enabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { system } = await params;
  if (!isTerminologySystem(system)) {
    return NextResponse.json({ error: "Unknown terminology system" }, { status: 404 });
  }

  const rateLimit = await checkRateLimitByKey(
    getClientIP(request),
    "terminology",
    `/api/terminology/${system}`,
  );
  if (!rateLimit.success && rateLimit.response) return rateLimit.response;

  const sanitized = sanitizeSearchQuery(request.nextUrl.searchParams.get("q") ?? "");
  const parsed = QuerySchema.safeParse({ q: sanitized });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query must be 2-200 characters", results: [] },
      { status: 400 },
    );
  }
  const q = parsed.data.q;

  try {
    const result =
      system === "rxnorm"
        ? await searchRxNorm(q)
        : system === "icd10"
          ? await searchIcd10(q)
          : searchAllergens(q);

    if (!result.ok) {
      return NextResponse.json({ results: [], degraded: true });
    }
    return NextResponse.json({ results: result.results });
  } catch (error) {
    logError({
      action: "TERMINOLOGY_PROXY_ERROR",
      error: sanitizeError(error),
      resourceType: system,
    });
    return NextResponse.json({ results: [], degraded: true });
  }
}
