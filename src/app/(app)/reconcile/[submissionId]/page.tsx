// Sprint 2 / P3 (Part C) -- per-submission reconciliation detail.
// RECONCILE_V1-gated; org-scoped by RLS.

import { notFound } from "next/navigation";
import { isReconcileV1Enabled } from "@/lib/config/environment";
import { createClient } from "@/lib/supabase/server";
import { getSubmissionDetail } from "@/lib/reconcile/data";
import { ReconcileView } from "@/components/reconcile/ReconcileView";

export const dynamic = "force-dynamic";

export default async function ReconcileDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  if (!isReconcileV1Enabled()) notFound();
  const { submissionId } = await params;

  const supabase = await createClient();
  if (!supabase) notFound();

  const detail = await getSubmissionDetail(supabase, submissionId);
  if (!detail) notFound();

  return <ReconcileView detail={detail} />;
}
