import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  getDefaultTabsForRoles,
  getPrimaryRole,
  normalizeAdminRoles,
  type AdminTabKey,
} from '@/lib/adminTabs'

type AccessRow = {
  role: string;
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
    select: {
      role: true,
      isActive: true,
    }
  })

  if (!dbUser || dbUser.isActive === false) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let roles = normalizeAdminRoles(dbUser.role)

  // Role assignments were introduced after the base User.role field. Keep
  // login working on databases that have not applied that migration yet.
  try {
    const assignments = await db.userRoleAssignment.findMany({
      where: { userId: user.id },
      select: { role: true },
    })
    if (assignments.length > 0) {
      roles = normalizeAdminRoles(assignments.map((assignment) => assignment.role))
    }
  } catch {
    // Fall back to the primary role until the role-assignment migration exists.
  }

  const primaryRole = getPrimaryRole(roles, dbUser.role)
  let accessibleTabs = getDefaultTabsForRoles(roles)

  if (roles.length > 0 && !roles.includes('OWNER')) {
    try {
      const rows = await db.$queryRaw<AccessRow[]>`
        SELECT role, "tabKey"
        FROM "AdminRoleTabAccess"
        ORDER BY "tabKey" ASC
      `
      const roleRows = rows.filter((row) => roles.includes(row.role as (typeof roles)[number]))

      if (roleRows.length > 0) {
        const rowsByRole = roleRows.reduce<Record<string, string[]>>((acc, row) => {
          acc[row.role] = acc[row.role] || []
          acc[row.role].push(row.tabKey)
          return acc
        }, {})

        accessibleTabs = Array.from(
          new Set(
            roles.flatMap((role) =>
              rowsByRole[role]?.length
                ? rowsByRole[role]
                : getDefaultTabsForRoles([role])
            )
          )
        ) as AdminTabKey[]
      }
    } catch (error) {
      console.error("ROLE ACCESS FALLBACK:", error)
    }
  }

  return NextResponse.json({ role: primaryRole, roles, accessibleTabs })
}
