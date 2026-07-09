"use client";

// Client wrapper that binds <IntakeForm> to the live terminology proxy and the
// portal persistence endpoint. Autosave failures surface non-fatally (responses
// stay in local state and retry on next save/submit); a successful submit shows
// the confirmation screen.

import { useMemo, useState } from "react";
import { CSCard } from "@/components/cs";
import { IntakeForm } from "./IntakeForm";
import { createTerminologySearch } from "./search-client";
import type { IntakeTemplate, IntakeResponses } from "@/lib/intake/types";

export interface IntakeFlowProps {
  template: IntakeTemplate;
  templateId: string | null;
  templateVersion: number | null;
  submissionId?: string | null;
  initialResponses?: IntakeResponses;
}

export function IntakeFlow({
  template,
  templateId,
  templateVersion,
  submissionId = null,
  initialResponses,
}: IntakeFlowProps) {
  const searchCodes = useMemo(() => createTerminologySearch(), []);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = async (responses: IntakeResponses, submit: boolean) => {
    const res = await fetch("/api/portal/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template_id: templateId,
        submission_id: submissionId,
        responses,
        submit,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "We could not save your responses. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <CSCard>
          <h2 className="text-lg font-semibold text-foreground">Thank you</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your intake has been submitted. Your care team will review it before your visit. You can
            close this window.
          </p>
        </CSCard>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p className="mx-auto max-w-2xl px-4 pt-4 text-sm text-[var(--cs-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <IntakeForm
        template={template}
        templateVersion={templateVersion}
        initialResponses={initialResponses}
        searchCodes={searchCodes}
        onSave={async (responses) => {
          setError(null);
          try {
            await persist(responses, false);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
        onSubmit={async (responses) => {
          setError(null);
          try {
            await persist(responses, true);
            setDone(true);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    </div>
  );
}
