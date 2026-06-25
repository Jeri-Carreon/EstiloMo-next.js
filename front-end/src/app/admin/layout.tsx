import Sidebar from '@/components/admin/Sidebar';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  // createClient() from lib/supabase/server
  // creates Supabase client configured to read/write cookies
  // uses @supabase/ssr under the hood (not localStorage)
  const { data: { user } } = await supabase.auth.getUser()
  // .auth is Supabase's built-in auth object from @supabase/supabase-js
  // .getUser() reads the session cookie → extracts access token → sends to Supabase servers to verify
  // supabase.auth.getUser() sends cookies to supabase to verify
  // returns login details if logged in, if not returns null

  if (!user) {
    redirect('/login')
    // if no user returned redirect to login
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    // checks Prisma db user.id if it matches with auth id
    select: { role: true, firstName: true, lastName: true, email: true }
    // fetches role, name, email
  })

  if (!dbUser || dbUser.role === 'CUSTOMER') {
    redirect('/login')
    // checks if no dbUser
    // checks if dbUser role is CUSTOMER
    // redirects to login page if one is true
  }

  const currentName = `${dbUser.firstName} ${dbUser.lastName}` || dbUser.email || 'Admin'
  const currentRole = dbUser.role

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Sidebar
        currentName={currentName}
        currentRole={currentRole}
      />

      <main style={{ flex: '1 1 0%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
        <Box sx={{ display: { xs: 'block', md: 'none' }, minHeight: 56 }} />
        {children}
      </main>
    </div>
  );
}
