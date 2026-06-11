// Tests for the ambient-scribe integration in the new-note form: the
// ?mode=ambient entry, and the populate-editor callback that maps the
// transcribe-and-generate result into SOAP sections, the read-only
// transcript panel, and the grounded code-chip UI. The AmbientRecorder is
// mocked — its own state machine has a dedicated suite.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// ── Stub external libraries (same pattern as new-note-form.test.tsx) ─────

const routerPush = vi.fn();
const searchParamsGet = vi.fn<(key: string) => string | null>(() => null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const toastApi = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock("@/components/ui/toast", () => ({
  useToast: () => toastApi,
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const supabaseChain = {
  select: vi.fn(() => supabaseChain),
  eq: vi.fn(() => supabaseChain),
  in: vi.fn(() => supabaseChain),
  order: vi.fn(() => supabaseChain),
  single: vi.fn(async () => ({ data: null, error: null })),
  maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => supabaseChain,
    auth: {
      getUser: async () => ({ data: { user: { id: "u1", email: "u@test" } } }),
    },
  }),
}));

vi.mock("@/components/notes/PatientQuickSelectModal", () => ({
  default: () => null,
}));

// The recorder is mocked as a single button that emits a canned
// transcribe-and-generate result, so the suite exercises only the form's
// populate callback.
const SCRIBE_RESULT = vi.hoisted(() => ({
  transcript: "Patient says mood has improved since starting the new medication.",
  sections: {
    subjective: "Reports improved mood on current medication.",
    objective: "Calm, cooperative, normal speech.",
    assessment: "Symptoms improving with treatment.",
    plan: "Continue current treatment plan.",
  },
  suggestedCodes: {
    cpt: [
      {
        code: "90834",
        description: "Psychotherapy, 45 minutes",
        source: "clinician_input",
      },
    ],
    // Legacy string shape — normalizeSuggestedCodes maps it to the
    // "From your dictation" source badge.
    icd10: ["F32.1"],
  },
}));

vi.mock("@/components/scribe/AmbientRecorder", () => ({
  default: ({ onComplete }: { onComplete: (result: unknown) => void }) => (
    <button
      type="button"
      data-testid="mock-scribe-complete"
      onClick={() => onComplete(SCRIBE_RESULT)}
    >
      mock scribe complete
    </button>
  ),
}));

const originalFetch = globalThis.fetch;
beforeEach(() => {
  routerPush.mockReset();
  searchParamsGet.mockReset();
  searchParamsGet.mockReturnValue(null);
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Import AFTER mocks so the component picks them up.
import NewNoteForm from "./new-note-form";

function setSearchParams(params: Record<string, string>) {
  searchParamsGet.mockImplementation((key: string) => params[key] ?? null);
}

describe("NewNoteForm — ambient scribe integration", () => {
  it("opens with the recorder active when mode=ambient", () => {
    setSearchParams({ mode: "ambient" });
    render(<NewNoteForm />);
    expect(screen.getByTestId("mock-scribe-complete")).toBeTruthy();
  });

  it("keeps the phrases tab as default without mode=ambient", () => {
    render(<NewNoteForm />);
    expect(screen.queryByTestId("mock-scribe-complete")).toBeNull();
  });

  it("populates the SOAP editor sections from the scribe result", () => {
    setSearchParams({ mode: "ambient", template: "tpl-soap-note" });
    render(<NewNoteForm />);

    fireEvent.click(screen.getByTestId("mock-scribe-complete"));

    expect(screen.getByDisplayValue("Reports improved mood on current medication.")).toBeTruthy();
    expect(screen.getByDisplayValue("Calm, cooperative, normal speech.")).toBeTruthy();
    expect(screen.getByDisplayValue("Symptoms improving with treatment.")).toBeTruthy();
    expect(screen.getByDisplayValue("Continue current treatment plan.")).toBeTruthy();
  });

  it("populates the single section for paragraph templates", () => {
    // Default template (tpl-progress-note) is paragraph format.
    setSearchParams({ mode: "ambient" });
    render(<NewNoteForm />);

    fireEvent.click(screen.getByTestId("mock-scribe-complete"));

    expect(screen.getByDisplayValue(/Reports improved mood on current medication\./)).toBeTruthy();
    expect(screen.getByDisplayValue(/Continue current treatment plan\./)).toBeTruthy();
  });

  it("shows the AI-content review warning after the scribe populates the note", () => {
    setSearchParams({ mode: "ambient", template: "tpl-soap-note" });
    render(<NewNoteForm />);

    expect(screen.queryByText(/AI-generated content/i)).toBeNull();
    fireEvent.click(screen.getByTestId("mock-scribe-complete"));
    expect(screen.getByText(/AI-generated content/i)).toBeTruthy();
  });

  it("surfaces the transcript in a collapsible read-only panel", () => {
    setSearchParams({ mode: "ambient", template: "tpl-soap-note" });
    render(<NewNoteForm />);

    fireEvent.click(screen.getByTestId("mock-scribe-complete"));

    // Collapsed by default
    expect(screen.queryByTestId("scribe-transcript")).toBeNull();

    const toggle = screen.getByRole("button", { name: /transcript \(read-only\)/i });
    fireEvent.click(toggle);
    const panel = screen.getByTestId("scribe-transcript");
    expect(panel.textContent).toBe(SCRIBE_RESULT.transcript);
    // Read-only: rendered as text, not an editable control
    expect(panel.tagName).not.toBe("TEXTAREA");

    fireEvent.click(toggle);
    expect(screen.queryByTestId("scribe-transcript")).toBeNull();
  });

  it("routes suggested codes through the grounded chip UI with source badges", () => {
    setSearchParams({ mode: "ambient", template: "tpl-soap-note" });
    render(<NewNoteForm />);

    fireEvent.click(screen.getByTestId("mock-scribe-complete"));

    expect(screen.getByText("90834")).toBeTruthy();
    expect(screen.getByText("F32.1")).toBeTruthy();
    // Both codes carry the dictation-match badge (enriched + legacy shapes)
    expect(screen.getAllByText("From your dictation").length).toBe(2);
  });
});
