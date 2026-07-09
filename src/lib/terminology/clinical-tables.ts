// ICD-10-CM problem search via the NIH Clinical Tables Search Service (free, no
// key). P2 data source; replaced by Weno data in P4. Only the search string
// leaves the system -- never any patient identifier.
//
// Response shape: [ total, [codes...], null, [ [code, name], ... ] ]

import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout";
import type { TerminologyResult } from "./types";

const CLINICAL_TABLES_HOST = "https://clinicaltables.nlm.nih.gov";
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 20;

type Icd10Response = [number, string[], unknown, [string, string][]];

export async function searchIcd10(query: string): Promise<TerminologyResult> {
  const url =
    `${CLINICAL_TABLES_HOST}/api/icd10cm/v3/search` +
    `?sf=code,name&df=code,name&maxList=${MAX_RESULTS}&terms=${encodeURIComponent(query)}`;
  try {
    const resp = await fetchWithTimeout(url, {
      timeoutMs: TIMEOUT_MS,
      headers: { accept: "application/json" },
    });
    if (!resp.ok)
      return { ok: false, status: 502, error: `clinicaltables responded ${resp.status}` };
    const body = (await resp.json().catch(() => null)) as Icd10Response | null;
    const rows = Array.isArray(body) && Array.isArray(body[3]) ? body[3] : [];

    const results = rows
      .filter((row) => Array.isArray(row) && row.length >= 2)
      .map((row) => ({ code: row[0], display: row[1], system: "icd10" }));
    return { ok: true, results };
  } catch {
    return { ok: false, status: 503, error: "clinicaltables unavailable" };
  }
}
