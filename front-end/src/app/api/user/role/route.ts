import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { DEFAULT_ROLE_TAB_ACCESS, normalizeAdminRole, type AdminTabKey } from '@/lib/adminTabs'

type AccessRow = {
  tabKey: string;
};

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
    select: { role: true, isActive: true }
  })

  if (!dbUser || dbUser.isActive === false) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const normalizedRole = normalizeAdminRole(dbUser.role)
  let accessibleTabs = normalizedRole ? DEFAULT_ROLE_TAB_ACCESS[normalizedRole] : []

  if (normalizedRole && normalizedRole !== 'OWNER') {
    try {
      const rows = await db.$queryRaw<AccessRow[]>`
        SELECT "tabKey"
        FROM "AdminRoleTabAccess"
        WHERE role = ${normalizedRole}
        ORDER BY "tabKey" ASC
      `

      if (rows.length > 0) {
        accessibleTabs = rows.map((row) => row.tabKey as AdminTabKey)
      }
    } catch (error) {
      console.error("ROLE ACCESS FALLBACK:", error)
    }
  }

  return NextResponse.json({ role: dbUser.role, accessibleTabs })
}
