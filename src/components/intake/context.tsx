"use client";

import { createContext, useContext } from "react";
import type { CodedValue } from "@/lib/intake/types";

// Search function injected into the tree so coded_search / group fields stay
// pure and testable. The app provides a fetch-based implementation that hits
// the terminology proxy; tests provide a mock. `null` context => search UI is
// hidden and only free-text capture is offered (patients are never blocked).
export interface IntakeSearchContextValue {
  searchCodes: (system: string, query: string) => Promise<CodedValue[]>;
}

export const IntakeSearchContext = createContext<IntakeSearchContextValue | null>(null);

export function useIntakeSearch(): IntakeSearchContextValue | null {
  return useContext(IntakeSearchContext);
}

// Form-level metadata consent blocks stamp into their captured value (the
// template version the patient consented against -- a medico-legal record).
export interface IntakeMeta {
  templateVersion: number | null;
}

export const IntakeMetaContext = createContext<IntakeMeta>({ templateVersion: null });

export function useIntakeMeta(): IntakeMeta {
  return useContext(IntakeMetaContext);
}
