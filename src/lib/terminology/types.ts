import type { CodedValue } from "@/lib/intake/types";

// Every proxy returns the same discriminated union (mirrors the sidecar-proxy
// convention): never throws to the caller; failures carry a status + message.
export type TerminologyResult =
  | { ok: true; results: CodedValue[] }
  | { ok: false; status: number; error: string };

// Terminology systems this proxy serves. RxNorm + ICD-10-CM hit free public NLM
// APIs; allergens are a curated in-app list. Coded pickers are replaced by Weno
// data in P4 (see supabase/SCHEMA-NOTES.md external-dependency note).
export const TERMINOLOGY_SYSTEMS = ["rxnorm", "icd10", "allergen"] as const;
export type TerminologySystem = (typeof TERMINOLOGY_SYSTEMS)[number];

export function isTerminologySystem(value: string): value is TerminologySystem {
  return (TERMINOLOGY_SYSTEMS as readonly string[]).includes(value);
}

export type { CodedValue };
