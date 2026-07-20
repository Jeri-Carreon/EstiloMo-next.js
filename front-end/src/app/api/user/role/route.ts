import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAccessibleAdminTabsForRole } from '@/lib/adminAuthorization'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const normalizedEmail = user.email?.toLowerCase().trim()

  const dbUser = await db.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: {
      role: true,
      isActive: true,
    }
  })

  if (!dbUser || dbUser.isActive === false) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessibleTabs = await getAccessibleAdminTabsForRole(dbUser.role)
  const role = dbUser.role
  const roles = role ? [role] : []

  return NextResponse.json({ role, roles, accessibleTabs })
}
