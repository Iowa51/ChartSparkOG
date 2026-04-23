/**
 * Admin Users List API
 * GET /api/admin/users
 *
 * Returns the list of users the caller is permitted to see:
 *   - SUPER_ADMIN: all users across all organizations.
 *   - ADMIN: users within the caller's own organization.
 *
 * Response shape: { users: User[] } where each User includes
 * id, email, first_name, last_name, role, is_active, created_at,
 * organization_id.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth, AuthContext } from "@/lib/auth/api-auth";
import { logError, sanitizeError } from "@/lib/logging/safe-logger";

async function handleGet(context: AuthContext) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    let query = supabase
      .from("users")
      .select(
        "id, email, first_name, last_name, role, is_active, created_at, organization_id",
      )
      .order("created_at", { ascending: false });

    if (context.user.role !== "SUPER_ADMIN") {
      if (!context.user.organizationId) {
        return NextResponse.json({ error: "Organization required" }, { status: 403 });
      }
      query = query.eq("organization_id", context.user.organizationId);
    }

    const { data: users, error } = await query;

    if (error) {
      logError({ action: "ADMIN_USERS_LIST_ERROR", error: sanitizeError(error) });
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    return NextResponse.json({
      users: users ?? [],
      currentUser: {
        id: context.user.id,
        role: context.user.role,
        organization_id: context.user.organizationId,
      },
    });
  } catch (error) {
    logError({ action: "ADMIN_USERS_LIST_EXCEPTION", error: sanitizeError(error) });
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export const GET = withAuth(handleGet, {
  requiredRole: ["SUPER_ADMIN", "ADMIN"],
  requireOrganization: false,
  requireMFA: true,
});
