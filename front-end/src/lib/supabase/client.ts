import { createBrowserClient } from "@supabase/ssr";

type BrowserSupabaseClientLike = ReturnType<typeof createBrowserClient>;

export function createClient(): BrowserSupabaseClientLike {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase browser client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient(url, anonKey, {
    auth: {
      storage:
        typeof window !== "undefined" ? window.sessionStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}