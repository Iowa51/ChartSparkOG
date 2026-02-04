// src/app/api/auth/unlock-account/route.ts
// Emergency account unlock endpoint for development/demo
// WARNING: This should be removed or protected in production

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role-client';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, adminKey } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // For development/demo - allow unlock with a simple check
        // In production, this should require admin authentication
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const validAdminKey = adminKey === process.env.ADMIN_UNLOCK_KEY || isDevelopment;

        if (!validAdminKey && !isDevelopment) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        let supabase;
        try {
            supabase = createServiceRoleClient();
        } catch (err) {
            console.warn('Unlock: Service role client not configured');
            return NextResponse.json({
                success: true,
                message: 'No lockout system configured - you should be able to login'
            });
        }

        if (!supabase) {
            return NextResponse.json({
                success: true,
                message: 'No Supabase configured - lockout not active'
            });
        }

        // Delete failed login attempts for this email
        const { error } = await supabase
            .from('login_attempts')
            .delete()
            .eq('email', email.toLowerCase())
            .eq('success', false);

        if (error) {
            // Table might not exist
            if (error.code === '42P01') {
                return NextResponse.json({
                    success: true,
                    message: 'login_attempts table does not exist - no lockout active'
                });
            }
            console.error('Unlock error:', error);
            return NextResponse.json({ error: 'Failed to unlock account' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Account ${email} unlocked successfully. You can now login.`
        });

    } catch (error) {
        console.error('Unlock account error:', error);
        return NextResponse.json({ error: 'Unlock failed' }, { status: 500 });
    }
}
