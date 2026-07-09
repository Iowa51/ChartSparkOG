// RxNorm medication search via the NLM RxNav public API (free, no key).
// P2 data source; replaced by Weno data in P4. Only the search string leaves the
// system -- never any patient identifier.

import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout";
import type { TerminologyResult, CodedValue } from "./types";

const RXNAV_HOST = "https://rxnav.nlm.nih.gov";
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 20;

interface DrugConceptProperty {
  rxcui?: string;
  name?: string;
  tty?: string;
}
interface DrugsResponse {
  drugGroup?: { conceptGroup?: { tty?: string; conceptProperties?: DrugConceptProperty[] }[] };
}

export async function searchRxNorm(query: string): Promise<TerminologyResult> {
  const url = `${RXNAV_HOST}/REST/drugs.json?name=${encodeURIComponent(query)}`;
  try {
    const resp = await fetchWithTimeout(url, {
      timeoutMs: TIMEOUT_MS,
      headers: { accept: "application/json" },
    });
    if (!resp.ok) return { ok: false, status: 502, error: `rxnav responded ${resp.status}` };
    const body = (await resp.json().catch(() => null)) as DrugsResponse | null;
    const groups = body?.drugGroup?.conceptGroup ?? [];

    const seen = new Set<string>();
    const results: CodedValue[] = [];
    for (const group of groups) {
      for (const c of group.conceptProperties ?? []) {
        if (!c.rxcui || !c.name) continue;
        if (seen.has(c.rxcui)) continue;
        seen.add(c.rxcui);
        results.push({ code: c.rxcui, display: c.name, system: "rxnorm" });
        if (results.length >= MAX_RESULTS) return { ok: true, results };
      }
    }
    return { ok: true, results };
  } catch {
    // Timeout / network error -- fail soft; the picker still offers free text.
    return { ok: false, status: 503, error: "rxnav unavailable" };
  }
}
