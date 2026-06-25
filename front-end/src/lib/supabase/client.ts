import { createBrowserClient } from '@supabase/ssr';

type BrowserSupabaseClientLike = ReturnType<typeof createBrowserClient> | {
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
    signOut: () => Promise<{ error: null }>;
  };
};

function createFallbackClient(): BrowserSupabaseClientLike {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
  } as BrowserSupabaseClientLike;
}

export function createClient(): BrowserSupabaseClientLike {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  //REMOVE WHEN DEPLOYED SUCCESSFULLY, FOR DEBUGGING
  // console.log("URL:", url);
  // console.log("Anon key exists:", !!anonKey);

  if (!url || !anonKey) {
    //REMOVE WHEN DEPLOYED SUCCESSFULLY, FOR DEBUGGING
    // console.log(
    // process.env.NEXT_PUBLIC_SUPABASE_URL,
    // process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    // );
    return createFallbackClient();
  }

  return createBrowserClient(url, anonKey);
}