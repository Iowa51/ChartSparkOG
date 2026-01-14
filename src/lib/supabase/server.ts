import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Track if we've warned about missing config
let hasWarnedMissingConfig = false;

/**
 * Create a Supabase server client.
 * 
 * QUAL-001 Note: Previously returned `null as any` which hid null issues.
 * Now properly handles missing config:
 * - In production (NEXT_PUBLIC_DEMO_MODE === 'false'): throws Error
 * - In demo mode: returns a mock-safe null (type assertion for backward compatibility)
 * 
 * Future improvement: Update all callers to handle null explicitly.
 */
export async function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
        if (isDemoMode) {
            if (!hasWarnedMissingConfig) {
                console.warn('[Supabase Server] Not configured - running in demo mode');
                hasWarnedMissingConfig = true;
            }
            // QUAL-001: Type assertion for backward compatibility
            // TODO: Gradually update all callers to handle null explicitly
            return null as unknown as Awaited<ReturnType<typeof createSSRServerClient>>;
        }
        // In production, fail fast
        throw new Error(
            'CRITICAL: Supabase environment variables not configured in production. ' +
            'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
    }

    const cookieStore = await cookies();

    return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // This can happen in Server Components where cookies are read-only
                }
            },
        },
    });
}
