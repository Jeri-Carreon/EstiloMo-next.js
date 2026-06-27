import { createBrowserClient } from '@supabase/ssr';

type BrowserSupabaseClientLike = ReturnType<typeof createBrowserClient> | {
  auth: {
    getUser: () => Promise<{ data: { user: null }; error: null }>;
    getSession: () => Promise<{ data: { session: null }; error: null }>;
    signInWithPassword: (
      credentials: unknown
    ) => Promise<{ data: { user: null; session: null }; error: Error }>;
    updateUser: (
      attributes: unknown
    ) => Promise<{ data: { user: null }; error: Error }>;
    signOut: () => Promise<{ error: null }>;
    onAuthStateChange: () => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
  };
};

function createMissingConfigError() {
  return new Error(
    'Supabase browser client is not configured. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are available during the Next.js build.'
  );
}

function createFallbackClient(): BrowserSupabaseClientLike {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithPassword() {
        return {
          data: { user: null, session: null },
          error: createMissingConfigError(),
        };
      },
      async updateUser() {
        return {
          data: { user: null },
          error: createMissingConfigError(),
        };
      },
      async signOut() {
        return { error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
    },
  } as BrowserSupabaseClientLike;
}

export function createClient(): BrowserSupabaseClientLike {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return createFallbackClient();
  }

  return createBrowserClient(url, anonKey);
}
