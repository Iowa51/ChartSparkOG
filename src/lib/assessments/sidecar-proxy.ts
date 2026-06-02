// Server-only helper for proxying requests to the chartspark-assessments
// sidecar (default port 3301). Authenticated via shared secret. The sidecar
// trusts X-User-Id / X-Organization-Id headers in lieu of the user JWT.

import type { AuthenticatedUser } from "@/lib/auth/api-auth";

const TIMEOUT_MS = 60_000;

export interface SidecarRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Path on the sidecar, including any query string (e.g. "/api/v1/assessments/scales/phq-9") */
  path: string;
  body?: unknown;
}

export interface SidecarSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export interface SidecarFailure {
  ok: false;
  status: number;
  error: string;
  /** True when the sidecar is unreachable, timed out, or misconfigured */
  fallback: boolean;
  /** Original sidecar response body, if any */
  body?: unknown;
}

export type SidecarResult<T = unknown> = SidecarSuccess<T> | SidecarFailure;

interface SidecarConfig {
  baseUrl: string;
  secret: string;
}

function readConfig(): SidecarConfig | null {
  const baseUrl = process.env.ASSESSMENTS_SIDECAR_URL;
  const secret = process.env.ASSESSMENTS_SIDECAR_SECRET;
  if (!baseUrl || !secret) {
    return null;
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), secret };
}

export async function callSidecar<T = unknown>(
  user: AuthenticatedUser,
  opts: SidecarRequestOptions,
): Promise<SidecarResult<T>> {
  const config = readConfig();
  if (!config) {
    return {
      ok: false,
      status: 503,
      error: "Assessments service not configured",
      fallback: true,
    };
  }

  const url = `${config.baseUrl}${opts.path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.secret}`,
    "X-User-Id": user.id,
    "X-Organization-Id": user.organizationId ?? "",
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const resp = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const contentType = resp.headers.get("content-type") ?? "";
    let parsed: unknown = null;
    if (contentType.includes("application/json")) {
      parsed = await resp.json().catch(() => null);
    } else {
      const text = await resp.text().catch(() => "");
      parsed = text || null;
    }

    if (!resp.ok) {
      const errorMessage =
        parsed && typeof parsed === "object" && parsed !== null && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : `Assessments service returned ${resp.status}`;
      return {
        ok: false,
        status: resp.status,
        error: errorMessage,
        fallback: false,
        body: parsed,
      };
    }

    return { ok: true, status: resp.status, data: parsed as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sidecar request failed";
    return {
      ok: false,
      status: 503,
      error: message,
      fallback: true,
    };
  }
}
