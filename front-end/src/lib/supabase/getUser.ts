import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getAdminUser() {
  const supabase = await createClient() 
  // createClient() from lib/supabase/server
  // creates Supabase client configured to read/write cookies
  // uses @supabase/ssr under the hood (not localStorage)
  const { data: { user } } = await supabase.auth.getUser() 
  // .auth is Supabase's built-in auth object from @supabase/supabase-js
  // .getUser() reads the session cookie → extracts access token → sends to Supabase servers to verify
  // supabase.auth.getUser() sends cookies to supabase to verify
  // returns login details if logged in, if not returns null

  if (!user) return null 
  // if not a user return null

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    // checks Prisma db user.id if it matches with auth id
    select: { role: true }
    // fetches role column from user table
  })

  return dbUser
  // returns { role: "OWNER" } or "RECEPTIONIST", "BARBER"
}