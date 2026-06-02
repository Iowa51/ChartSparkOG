// GET /api/assessments/scales/[id]
// Proxies to the assessments sidecar to fetch a scale's render-only projection.
// The scale catalog is public-domain instrument metadata — no PHI, so we
// do not call canAccessPatient here. We still require auth + ASSESSMENTS_V1
// feature and audit-log every access for usage tracking.

import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { callSidecar } from "@/lib/assessments/sidecar-proxy";

const SCALE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);
  const scaleId = context.params?.id ?? "";

  if (!SCALE_ID_RE.test(scaleId)) {
    return NextResponse.json({ error: "Invalid scale id" }, { status: 400 });
  }

  const result = await callSidecar(context.user, {
    method: "GET",
    path: `/api/v1/assessments/scales/${encodeURIComponent(scaleId)}`,
  });

  await logAuditEvent({
    eventType: "ASSESSMENT_SCALE_READ",
    userId: context.user.id,
    userEmail: context.user.email,
    userRole: context.user.role,
    organizationId: context.user.organizationId || undefined,
    ipAddress,
    userAgent,
    resourceType: "assessment_scale",
    resourceId: scaleId,
    details: {
      scale_id: scaleId,
      success: result.ok,
      sidecar_status: result.status,
    },
    phiAccessed: false,
    riskLevel: "LOW",
  });

  if (!result.ok) {
    if (result.fallback) {
      logError({ action: "ASSESSMENT_SCALE_READ_FALLBACK", error: result.error });
      return NextResponse.json(
        { success: false, error: "Assessments service unavailable", fallback: true },
        { status: 503 },
      );
    }
    if (result.status === 404) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }
    logError({ action: "ASSESSMENT_SCALE_READ_ERROR", error: sanitizeError(result.error) });
    return NextResponse.json({ error: "Failed to load scale" }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export const GET = withAuth(handleGet, { requiredFeature: "ASSESSMENTS_V1" });
