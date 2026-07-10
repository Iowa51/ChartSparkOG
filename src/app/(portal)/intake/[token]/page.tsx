// Sprint 2 / P3 (Part A; P3-FIXES HIGH-4) -- patient intake page. Feature-flagged
// behind INTAKE_V1 (notFound when off, fail-closed). Now AUTHENTICATED:
//   * valid session mapped to a patient -> render the intake flow (writes go
//     through the patient_portal RLS via /api/portal/intake).
//   * no session + valid invite token   -> render the account-creation form.
//   * no session + used invite token     -> render the sign-in form.
//   * no session + expired/invalid token -> clear error state.
//
// The template is read through the AUTHENTICATED patient's own patient_portal
// connection (RLS `portal_intake_templates_select`) -- NEVER the service role.
// The invite-token validation is likewise a patient_portal SECURITY DEFINER read.

import { notFound } from "next/navigation";
import { isIntakeV1Enabled } from "@/lib/config/environment";
import { safeParseTemplate } from "@/lib/intake/template";
import { IntakeFlow } from "@/components/intake/IntakeFlow";
import { resolvePortalPatient } from "@/lib/portal/portal-session";
import { getActivePortalTemplate } from "@/lib/portal/portal-db";
import { validateInviteToken } from "@/lib/portal/portal-invites";
import { PortalAuthForm } from "@/components/portal/PortalAuthForm";

export const dynamic = "force-dynamic";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="max-w-md text-center text-sm text-muted-foreground">{children}</p>
    </main>
  );
}

async function IntakeForPatient(authUserId: string) {
  // Active-template read scoped by RLS to the patient's own org / system templates.
  const tpl = await getActivePortalTemplate(authUserId, "family_medicine");
  if (!tpl) return <Notice>Intake is not available right now.</Notice>;

  const parsed = safeParseTemplate(tpl.definition);
  if (!parsed.success) return <Notice>This intake form is temporarily unavailable.</Notice>;

  return (
    <main className="min-h-screen bg-background">
      <IntakeFlow template={parsed.template} templateId={tpl.id} templateVersion={tpl.version} />
    </main>
  );
}

export default async function PortalIntakePage({ params }: { params: Promise<{ token: string }> }) {
  if (!isIntakeV1Enabled()) notFound();
  const { token } = await params;

  // Authenticated patient -> straight to the intake.
  const portal = await resolvePortalPatient();
  if (portal) return IntakeForPatient(portal.authUserId);

  // Unauthenticated -> decide by invite-token state.
  const invite = await validateInviteToken(token);
  switch (invite.status) {
    case "valid":
      return <PortalAuthForm mode="claim" token={token} email={invite.invite!.email} />;
    case "claimed":
      return (
        <PortalAuthForm
          mode="login"
          notice="This invite has already been used. Please sign in to continue your intake."
        />
      );
    case "expired":
      return (
        <Notice>This invite link has expired. Please contact your clinic for a new one.</Notice>
      );
    case "invalid":
      return (
        <Notice>
          This invite link is not valid. Please check the link or contact your clinic.
        </Notice>
      );
    default:
      return <Notice>Intake is not available right now. Please try again later.</Notice>;
  }
}
