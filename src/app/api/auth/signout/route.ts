// src/app/api/auth/signout/route.ts
// SEC-009: Logout with HIPAA-compliant audit logging

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/security/audit-log";
import { getRequestMetadata } from "@/lib/utils/get-client-ip";
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

export async function POST(request: NextRequest) {
    const { ipAddress, userAgent } = getRequestMetadata(request);

    try {
        const supabase = await createClient();

        if (supabase) {
            // Get user info before signing out for audit log
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get profile for organization context
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id, email, role')
                    .eq('id', user.id)
                    .single();

                // Log the logout event BEFORE signing out
                await logAuditEvent({
                    eventType: 'LOGOUT',
                    userId: user.id,
                    userEmail: user.email,
                    userRole: profile?.role,
                    organizationId: profile?.organization_id,
                    ipAddress,
                    userAgent,
                    phiAccessed: false,
                    riskLevel: 'LOW',
                });
            }

            await supabase.auth.signOut();
        }

        return NextResponse.redirect(
            new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
            { status: 302 }
        );
    } catch (error) {
        logError({ action: 'SIGNOUT_ERROR', error: sanitizeError(error) });
        return NextResponse.redirect(
            new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
            { status: 302 }
        );
    }
}
