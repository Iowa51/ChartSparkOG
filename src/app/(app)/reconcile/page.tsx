// Sprint 2 / P3 (Part C) -- provider reconciliation QUEUE (app.chartspark.io).
// Submitted intakes awaiting or in provider review, org-scoped by RLS, with
// per-patient counts of unreconciled rows (incl. code-less flags).
// RECONCILE_V1-gated.

import { notFound } from "next/navigation";
import Link from "next/link";
import { isReconcileV1Enabled } from "@/lib/config/environment";
import { createClient } from "@/lib/supabase/server";
import { getReconcileQueue } from "@/lib/reconcile/data";

export const dynamic = "force-dynamic";

export default async function ReconcileQueuePage() {
  if (!isReconcileV1Enabled()) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();

  const queue = await getReconcileQueue(supabase);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Intake reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Submitted patient intakes awaiting provider review.
        </p>
      </div>

      {queue.length === 0 ? (
        <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No submitted intakes to reconcile.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Template</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">To reconcile</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{item.patientName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.templateName ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {item.status === "patient_entered" ? "Awaiting review" : "In review"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span>{item.counts.unreconciled} unreconciled</span>
                    {item.counts.codeless > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        {item.counts.codeless} need codes
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/reconcile/${item.id}`} className="text-primary underline">
                      Reconcile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
