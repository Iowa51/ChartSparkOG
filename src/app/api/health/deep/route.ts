// GET /api/health/deep
//
// Infrastructure health probe. Checks Supabase connectivity, Azure OpenAI
// reachability, memory usage, and process uptime. Intended for uptime
// monitors, load balancer health checks, and on-call dashboards.
//
// Auth: requires X-Health-Key header matching HEALTH_CHECK_KEY env var.
// In development (NODE_ENV !== 'production'), unauthenticated access is
// allowed when HEALTH_CHECK_KEY is not set.

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import safeAzureOpenAI from "@/services/safeAzureOpenAI";

type CheckStatus = "up" | "down";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    supabase: { status: CheckStatus; latencyMs: number };
    azureOpenAI: { status: CheckStatus };
    memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
    uptime: number;
  };
  timestamp: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth gate ──
  const healthKey = process.env.HEALTH_CHECK_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (healthKey) {
    const provided = request.headers.get("x-health-key");
    if (provided !== healthKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (isProduction) {
    // No key configured in production → reject all requests rather than
    // exposing infrastructure internals to the public internet.
    return NextResponse.json({ error: "HEALTH_CHECK_KEY not configured" }, { status: 503 });
  }
  // In non-production with no key configured: allow unauthenticated access.

  // ── Supabase check ──
  let supabaseStatus: CheckStatus = "down";
  let supabaseLatencyMs = 0;

  try {
    const start = Date.now();
    const supabase = createServiceRoleClient();
    if (supabase) {
      // Lightweight probe — fetch a single row PK from a guaranteed-existing
      // table. Exercises the full PostgREST → Postgres round-trip with
      // minimal cost (index-only scan, no payload).
      const { error } = await supabase.from("users").select("id").limit(1).maybeSingle();
      supabaseStatus = error ? "down" : "up";
    }
    supabaseLatencyMs = Date.now() - start;
  } catch {
    supabaseStatus = "down";
  }

  // ── Azure OpenAI check ──
  const azureOpenAIStatus: CheckStatus = safeAzureOpenAI.isAvailable() ? "up" : "down";

  // ── Memory ──
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  // ── Uptime ──
  const uptime = Math.round(process.uptime());

  // ── Overall status ──
  // unhealthy = supabase down (core dependency — auth, data, storage all rely on it)
  // degraded  = supabase up but another check failed
  // healthy   = everything up
  let status: HealthResponse["status"];
  if (supabaseStatus === "down") {
    status = "unhealthy";
  } else if (azureOpenAIStatus === "down") {
    status = "degraded";
  } else {
    status = "healthy";
  }

  const body: HealthResponse = {
    status,
    checks: {
      supabase: { status: supabaseStatus, latencyMs: supabaseLatencyMs },
      azureOpenAI: { status: azureOpenAIStatus },
      memory: {
        heapUsedMB: toMB(mem.heapUsed),
        heapTotalMB: toMB(mem.heapTotal),
        rssMB: toMB(mem.rss),
      },
      uptime,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: status === "healthy" ? 200 : 503,
  });
}
