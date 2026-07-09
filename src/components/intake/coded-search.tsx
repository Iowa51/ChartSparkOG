"use client";

// Debounced coded typeahead (RxNorm / ICD-10-CM / curated allergens). Selecting
// a result stores { code, display, system }; a free-text fallback stores
// { code: null, ... } so patients are never blocked -- code-less entries are
// flagged for P3 reconciliation. Search is injected via IntakeSearchContext
// (fetch in the app, mock in tests); with no context, only free text is offered.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CodedValue } from "@/lib/intake/types";
import type { FieldComponentProps } from "./types";
import { FieldShell, TextControl } from "./controls";
import { useIntakeSearch } from "./context";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

export function CodedSearchField({
  field,
  value,
  onChange,
  disabled,
  idBase,
}: FieldComponentProps) {
  const search = useIntakeSearch();
  const system = field.code_binding ?? "text";
  const selected = (value as CodedValue | null) ?? null;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodedValue[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!search) return;
    const q = query.trim();
    const current = ++seq.current;
    // All state updates happen inside the debounced callback (async), never
    // synchronously in the effect body.
    const handle = setTimeout(() => {
      if (current !== seq.current) return;
      if (q.length < MIN_QUERY) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      search
        .searchCodes(system, q)
        .then((r) => {
          if (current === seq.current) setResults(r.slice(0, 15));
        })
        .catch(() => {
          if (current === seq.current) setResults([]);
        })
        .finally(() => {
          if (current === seq.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, system, search]);

  const choose = (opt: CodedValue) => {
    onChange(opt);
    setQuery("");
    setResults([]);
  };

  const useFreeText = () => {
    const text = query.trim();
    if (!text) return;
    choose({ code: null, display: text, system });
  };

  if (selected) {
    return (
      <FieldShell label={field.label} required={field.required} help={field.help}>
        <div
          className="flex items-center justify-between gap-3 rounded-[var(--cs-radius-btn)] border border-border bg-card px-3 py-2"
          data-testid={`${idBase}-selected`}
        >
          <span className="text-base text-foreground">
            {selected.display}
            {selected.code ? (
              <span className="ml-2 text-xs text-muted-foreground">
                {selected.system}:{selected.code}
              </span>
            ) : (
              <span className="ml-2 rounded-[var(--cs-radius-pill)] bg-[var(--cs-warning-light)] px-2 py-0.5 text-xs text-[var(--cs-warning)]">
                free text
              </span>
            )}
          </span>
          <button
            type="button"
            className="text-sm text-primary underline"
            disabled={disabled}
            onClick={() => onChange(null)}
            data-testid={`${idBase}-clear`}
          >
            Change
          </button>
        </div>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={field.label} htmlFor={idBase} required={field.required} help={field.help}>
      <TextControl
        id={idBase}
        data-testid={idBase}
        type="text"
        value={query}
        placeholder={field.placeholder ?? "Type to search..."}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {loading ? <p className="text-xs text-muted-foreground">Searching...</p> : null}
      {results.length > 0 ? (
        <ul
          className="divide-y divide-border rounded-[var(--cs-radius-btn)] border border-border"
          data-testid={`${idBase}-results`}
        >
          {results.map((opt) => (
            <li key={`${opt.system}:${opt.code ?? opt.display}`}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted",
                )}
                onClick={() => choose(opt)}
              >
                <span className="text-base text-foreground">{opt.display}</span>
                {opt.code ? (
                  <span className="text-xs text-muted-foreground">{opt.code}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim().length >= MIN_QUERY ? (
        <button
          type="button"
          className="text-sm text-primary underline"
          disabled={disabled}
          onClick={useFreeText}
          data-testid={`${idBase}-freetext`}
        >
          Use &ldquo;{query.trim()}&rdquo; as free text
        </button>
      ) : null}
    </FieldShell>
  );
}
