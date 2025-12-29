import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase URL or Anon Key is missing. Supabase features will be disabled.");
        // Return a dummy object or handle as needed. 
        // For now, we'll return null or a partial and handle it in components.
        return null as any;
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
