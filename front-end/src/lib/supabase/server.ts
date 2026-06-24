import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type ServerSupabaseClientLike = ReturnType<typeof createServerClient> | {
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
  };
};

function createFallbackClient(): ServerSupabaseClientLike {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
    },
  } as ServerSupabaseClientLike;
}

export async function createClient(): Promise<ServerSupabaseClientLike> {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return createFallbackClient()
  }

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() }, // reads session
        setAll(cookiesToSet) { // updates session
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}