import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getAccessibleAdminTabsForRole } from '@/lib/adminAuthorization'
import {
  getAccessibleAdminTabsForRoles,
  getDirectAdminTabsForUser,
  getEffectiveRolesForUser,
  getPrimaryRoleFromEffectiveRoles,
  isOwnerRole,
} from '@/lib/adminRoleAssignments'

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
      id: true,
      role: true,
      isActive: true,
    }
  })

  if (!dbUser || dbUser.isActive === false) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const effectiveRoles = await getEffectiveRolesForUser(dbUser.id, dbUser.role)
  const inheritedTabs =
    effectiveRoles.length > 0
      ? await getAccessibleAdminTabsForRoles(effectiveRoles)
      : await getAccessibleAdminTabsForRole(dbUser.role)
  const directUserTabs = await getDirectAdminTabsForUser(dbUser.id)
  const accessibleTabs = Array.from(new Set([...inheritedTabs, ...directUserTabs]))
  const role = getPrimaryRoleFromEffectiveRoles(effectiveRoles, dbUser.role)
  const isOwner = isOwnerRole(effectiveRoles) || (effectiveRoles.length === 0 && role === 'OWNER')
  const roles = effectiveRoles.map((role) => ({
    id: role.id,
    name: role.displayName,
    role: role.role,
    systemKey: role.systemKey,
    isSystemRole: role.isSystemRole,
  }))
  const roleIds = roles.map((role) => role.id)
  const roleNames = Array.from(new Set(roles.map((role) => role.role)))

  return NextResponse.json({
    role,
    primaryRole: role,
    roles,
    roleIds,
    roleNames,
    inheritedTabs,
    directUserTabs,
    accessibleTabs,
    effectiveTabs: accessibleTabs,
    capabilities: accessibleTabs,
    isOwner,
  })
}
