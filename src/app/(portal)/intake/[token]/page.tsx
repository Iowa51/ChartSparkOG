// Sprint 1 / P2 -- patient intake page. Feature-flagged behind INTAKE_V1
// (notFound when off, fail-closed). Loads the active family-medicine template
// (non-PHI catalog read via service role) and renders the generic intake flow.
//
// The [token] segment is the portal invite token; full token->patient session
// resolution ships with the portal-claim/auth phase (see the persistence route
// and SCHEMA-NOTES). This page renders the data-driven form; writes fail closed
// until that session exists.

import { notFound } from "next/navigation";
import { isIntakeV1Enabled } from "@/lib/config/environment";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { safeParseTemplate } from "@/lib/intake/template";
import { IntakeFlow } from "@/components/intake/IntakeFlow";

export const dynamic = "force-dynamic";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="max-w-md text-center text-sm text-muted-foreground">{children}</p>
    </main>
  );
}

export default async function PortalIntakePage({ params }: { params: Promise<{ token: string }> }) {
  if (!isIntakeV1Enabled()) notFound();
  await params; // token reserved for portal-claim session resolution (later phase)

  const supabase = createServiceRoleClient();
  if (!supabase) return <Notice>Intake is not available right now.</Notice>;

  const { data: tpl, error } = await supabase
    .from("intake_templates")
    .select("id, version, definition")
    .eq("specialty", "family_medicine")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tpl) return <Notice>Intake is not available right now.</Notice>;

  const parsed = safeParseTemplate(tpl.definition);
  if (!parsed.success) return <Notice>This intake form is temporarily unavailable.</Notice>;

  return (
    <main className="min-h-screen bg-background">
      <IntakeFlow template={parsed.template} templateId={tpl.id} templateVersion={tpl.version} />
    </main>
  );
}
