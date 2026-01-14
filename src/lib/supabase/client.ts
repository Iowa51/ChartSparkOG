import { createBrowserClient } from '@supabase/ssr';

// Track if we've warned about missing config
let hasWarnedMissingConfig = false;

/**
 * Create a Supabase browser client.
 * 
 * QUAL-001 Note: Previously returned `null as any` which hid null issues.
 * Now properly handles missing config:
 * - In production (NEXT_PUBLIC_DEMO_MODE === 'false'): throws Error
 * - In demo mode: returns a mock-safe null (type assertion for backward compatibility)
 * 
 * Future improvement: Update all callers to handle null explicitly,
 * then change return type to `SupabaseClient | null`.
 */
export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
        if (isDemoMode) {
            if (!hasWarnedMissingConfig) {
                console.warn('[Supabase Client] Not configured - running in demo mode. Some features will be limited.');
                hasWarnedMissingConfig = true;
            }
            // QUAL-001: For backward compatibility with existing code that doesn't
            // handle null, we return null with type assertion. This allows the app
            // to run in demo mode. Components should ideally check for null.
            // TODO: Gradually update all callers to handle null explicitly
            return null as ReturnType<typeof createBrowserClient>;
        }
        // In production without demo mode, fail fast with clear error
        throw new Error(
            'CRITICAL: Supabase environment variables not configured in production. ' +
            'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
            'or enable NEXT_PUBLIC_DEMO_MODE=true for demo/development.'
        );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
