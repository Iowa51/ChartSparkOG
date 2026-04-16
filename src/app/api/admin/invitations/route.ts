// User Invitations API — Create and list organization invitations

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";
import { sendInvitationEmail, isEmailConfigured } from "@/lib/email/resend";
import { InvitationCreateSchema, validateRequest } from "@/lib/validation/schemas";
import { checkRateLimitByKey } from "@/lib/security/rate-limit";

async function handleGet(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const { user } = context;
    const supabase = await createClient();

    if (!user.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: invitations, error } = await supabase
      .from("invitations")
      .select(
        `
                id,
                email,
                role,
                specialty,
                status,
                expires_at,
                created_at,
                invited_by,
                users!invitations_invited_by_fkey(first_name, last_name, email)
            `,
      )
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    await logAuditEvent({
      eventType: "INVITATION_LIST_VIEW",
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      resourceType: "invitations",
      details: { count: invitations?.length || 0 },
      phiAccessed: false,
      riskLevel: "LOW",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ invitations });
  } catch (error: unknown) {
    logError({ action: "FETCH_INVITATIONS_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}

async function handlePost(context: AuthContext) {
  const { ipAddress, userAgent } = getRequestMetadata(context.request);

  try {
    const { user } = context;
    const supabase = await createClient();

    if (!user.organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await context.request.json();
    const validation = validateRequest(InvitationCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 },
      );
    }
    const { email, role, specialty } = validation.data;

    const rateLimit = await checkRateLimitByKey(user.id, "emailSend", "/api/admin/invitations");
    if (!rateLimit.success && rateLimit.response) {
      return rateLimit.response;
    }

    // Check pending-invitation + existing-user in parallel — these two
    // reads are independent (different tables, no shared data dependency).
    const [existingInviteResult, existingUserResult] = await Promise.all([
      supabase
        .from("invitations")
        .select("id")
        .eq("organization_id", user.organizationId)
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .single(),
      supabase
        .from("users")
        .select("id")
        .eq("organization_id", user.organizationId)
        .eq("email", email.toLowerCase())
        .single(),
    ]);

    if (existingInviteResult.data) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 409 },
      );
    }

    if (existingUserResult.data) {
      return NextResponse.json(
        { error: "A user with this email already exists in your organization" },
        { status: 409 },
      );
    }

    // RPC path removed: generate_invitation_token is a trigger function (error 0A000)
    // and cannot be called directly. TODO: fix via proper migration — see OBSERVABILITY_ROADMAP.md
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from("invitations")
      .insert({
        organization_id: user.organizationId,
        email: email.toLowerCase(),
        role,
        specialty,
        invited_by: user.id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;

    await logAuditEvent({
      eventType: "USER_INVITATION_CREATED",
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      resourceType: "invitation",
      resourceId: invitation.id,
      details: { invitedEmail: email, role, specialty },
      phiAccessed: false,
      riskLevel: "MEDIUM",
      ipAddress,
      userAgent,
    });

    // SEC-SPRINT11: Emit ROLE_CHANGED for HIPAA access control audit trail.
    // The invitation assigns a role to a future user — this is the admin approval event.
    await logAuditEvent({
      eventType: "ROLE_CHANGED",
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      resourceType: "invitation",
      resourceId: invitation.id,
      details: {
        previousRole: null,
        newRole: role,
        changedBy: user.id,
        targetEmail: email,
      },
      phiAccessed: false,
      riskLevel: "HIGH",
      ipAddress,
      userAgent,
    });

    // Fetch organization name and inviter name in parallel — two
    // independent reads on different tables.
    const [orgResult, inviterResult] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", user.organizationId).single(),
      supabase.from("users").select("first_name, last_name").eq("id", user.id).single(),
    ]);

    const org = orgResult.data;
    const inviter = inviterResult.data;

    const inviterName = inviter
      ? `${inviter.first_name || ""} ${inviter.last_name || ""}`.trim() || user.email
      : user.email || "Your organization";

    const organizationName = org?.name || "Your organization";

    // Send invitation email
    let emailSent = false;
    let emailError: string | undefined;

    if (isEmailConfigured()) {
      const emailResult = await sendInvitationEmail({
        recipientEmail: email.toLowerCase(),
        inviterName,
        organizationName,
        role,
        invitationToken: token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      emailSent = emailResult.success;
      emailError = emailResult.error;

      if (!emailSent) {
        logError({ action: "SEND_INVITATION_EMAIL_FAILED", error: sanitizeError(emailError) });
      }
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://chart-spark-og.vercel.app"}/auth/accept-invite?token=${token}`;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
      },
      inviteUrl,
      emailSent,
      message: emailSent
        ? "Invitation sent successfully! The user will receive an email shortly."
        : "Invitation created. Email could not be sent - please share the invite URL manually.",
    });
  } catch (error: unknown) {
    logError({ action: "CREATE_INVITATION_ERROR", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, {
  requiredRole: ["ADMIN", "SUPER_ADMIN"],
  requireMFA: true,
});

export const POST = withAuth(handlePost, {
  requiredRole: ["ADMIN", "SUPER_ADMIN"],
  requireMFA: true,
});
