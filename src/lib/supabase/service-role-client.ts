// src/lib/supabase/service-role-client.ts
// SEC-REMEDIATION: Service role client for privileged server-side operations

import { createClient } from '@supabase/supabase-js';
import { devWarn } from '@/lib/logging/safe-logger';

/**
 * CRITICAL SECURITY: This client bypasses RLS and should ONLY be used
 * in server-side code for privileged operations after proper authorization.
 * 
 * Use cases:
 * - Recording login attempts (before user is authenticated)
 * - Cron jobs processing data across organizations
 * - Webhook handlers from external services (Stripe, etc.)
 * - Admin operations that need to bypass RLS
 * 
 * NEVER expose this to the client.
 * NEVER import this in client components.
 * ALWAYS validate authorization before using.
 */
export function createServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // In demo mode without credentials, return null
    const isDemoMode = process.env.NODE_ENV !== 'production' &&
        process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (!supabaseUrl || !supabaseServiceKey) {
        if (isDemoMode) {
            devWarn('Service Role Client', 'Not configured - running in demo mode');
            return null;
        }

        // CRITICAL: Fail hard in production
        throw new Error(
            'SECURITY: Missing Supabase service role credentials. ' +
            'Set SUPABASE_SERVICE_ROLE_KEY in environment variables.'
        );
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Type-safe wrapper that throws if service client is null
 * Use when you absolutely need the service client
 */
export function requireServiceRoleClient() {
    const client = createServiceRoleClient();
    if (!client) {
        throw new Error('Service role client required but not available');
    }
    return client;
}
