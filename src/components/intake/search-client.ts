import type { CodedValue } from "@/lib/intake/types";

// Browser-side searchCodes implementation injected into <IntakeForm>. Hits the
// terminology proxy; on any failure it returns [] so the picker degrades to free
// text (the patient is never blocked).
export function createTerminologySearch(): (
  system: string,
  query: string,
) => Promise<CodedValue[]> {
  return async (system, query) => {
    try {
      const res = await fetch(
        `/api/terminology/${encodeURIComponent(system)}?q=${encodeURIComponent(query)}`,
        { method: "GET", headers: { accept: "application/json" } },
      );
      if (!res.ok) return [];
      const body = (await res.json().catch(() => null)) as { results?: CodedValue[] } | null;
      return Array.isArray(body?.results) ? body.results : [];
    } catch {
      return [];
    }
  };
}
