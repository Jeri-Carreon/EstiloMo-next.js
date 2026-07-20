import { db } from "@/lib/db";
import {
  ALL_ADMIN_TAB_KEYS,
  DEFAULT_ROLE_TAB_ACCESS,
  type AdminTabKey,
  type BuiltInAdminRole,
} from "@/lib/adminTabs";

export type EffectiveAdminRole = {
  id: string;
  role: string;
  displayName: string;
  systemKey: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  assignedAt: Date | null;
};

export type AssignableAdminRole = {
  id: string;
  role: string;
  displayName: string;
  systemKey: string | null;
  isSystemRole: boolean;
  isBuiltIn: boolean;
  isActive: boolean;
};

export type RoleSchemaState = {
  hasUserRoleAssignment: boolean;
  hasUserAdminTabAccess: boolean;
  hasRoleId: boolean;
  hasSystemKey: boolean;
  hasIsSystemRole: boolean;
};

let roleSchemaStatePromise: Promise<RoleSchemaState> | null = null;

function isBuiltInRole(role: string) {
  return role === "OWNER" || role === "RECEPTIONIST" || role === "BARBER" || role === "CUSTOMER";
}

function getLegacySystemKey(role: string) {
  return isBuiltInRole(role) ? role : null;
}

function mapLegacyRoleRow(row: {
  id?: string | null;
  role: string;
  displayName?: string | null;
  systemKey?: string | null;
  isSystemRole?: boolean | null;
  isBuiltIn?: boolean | null;
  isActive?: boolean | null;
  assignedAt?: Date | null;
}): EffectiveAdminRole {
  const systemKey = row.systemKey ?? getLegacySystemKey(row.role);

  return {
    id: row.id || row.role,
    role: row.role,
    displayName: row.displayName || row.role,
    systemKey,
    isSystemRole: row.isSystemRole ?? Boolean(systemKey || row.isBuiltIn),
    isActive: row.isActive ?? true,
    assignedAt: row.assignedAt ?? null,
  };
}

export async function getRoleSchemaState() {
  if (!roleSchemaStatePromise) {
    roleSchemaStatePromise = (async () => {
      const tables = await db.$queryRaw<{ table_name: string }[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('UserRoleAssignment', 'UserAdminTabAccess')
      `;
      const columns = await db.$queryRaw<
        { table_name: string; column_name: string }[]
      >`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'AdminStaffRole'
          AND column_name IN ('id', 'systemKey', 'isSystemRole')
      `;
      const tableNames = new Set(tables.map((table) => table.table_name));
      const adminRoleColumns = new Set(columns.map((column) => column.column_name));

      return {
        hasUserRoleAssignment: tableNames.has("UserRoleAssignment"),
        hasUserAdminTabAccess: tableNames.has("UserAdminTabAccess"),
        hasRoleId: adminRoleColumns.has("id"),
        hasSystemKey: adminRoleColumns.has("systemKey"),
        hasIsSystemRole: adminRoleColumns.has("isSystemRole"),
      };
    })().catch((error) => {
      roleSchemaStatePromise = null;
      throw error;
    });
  }

  return roleSchemaStatePromise;
}

export function normalizeRoleText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function uniqueRoleIds(values: unknown) {
  const input = Array.isArray(values) ? values : [values];
  return Array.from(
    new Set(input.map(normalizeRoleText).filter((value) => value.length > 0))
  );
}

export function uniqueAdminTabKeys(values: unknown) {
  const input = Array.isArray(values) ? values : [values];
  return Array.from(
    new Set(
      input
        .map(normalizeRoleText)
        .filter((value): value is AdminTabKey =>
          ALL_ADMIN_TAB_KEYS.includes(value as AdminTabKey)
        )
    )
  );
}

export function isOwnerRole(roles: readonly Pick<EffectiveAdminRole, "systemKey">[]) {
  return roles.some((role) => role.systemKey === "OWNER");
}

export function getPrimaryRoleFromEffectiveRoles(
  roles: readonly EffectiveAdminRole[],
  fallback = "CUSTOMER"
) {
  const ownerRole = roles.find((role) => role.systemKey === "OWNER");
  if (ownerRole) return ownerRole.role;

  const firstSystemRole = roles.find((role) => role.systemKey);
  if (firstSystemRole) return firstSystemRole.role;

  return roles[0]?.role || fallback;
}

function roleSortValue(role: EffectiveAdminRole) {
  if (role.systemKey === "OWNER") return 0;
  if (role.systemKey) return 1;
  return 2;
}

export function sortEffectiveRoles(roles: EffectiveAdminRole[]) {
  return [...roles].sort((a, b) => {
    const roleRank = roleSortValue(a) - roleSortValue(b);
    if (roleRank !== 0) return roleRank;

    const aTime = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
    const bTime = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;

    return a.displayName.localeCompare(b.displayName);
  });
}

export async function getActiveRoleAssignmentsForUser(userId: string) {
  const schema = await getRoleSchemaState();

  if (!schema.hasUserRoleAssignment || !schema.hasRoleId) {
    return [];
  }

  const rows = await db.userRoleAssignment.findMany({
    where: {
      userId,
      removedAt: null,
      role: {
        isActive: true,
      },
    },
    include: {
      role: true,
    },
    orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
  });

  return sortEffectiveRoles(
    rows.map((assignment) =>
      mapLegacyRoleRow({
        id: assignment.role.id,
        role: assignment.role.role,
        displayName: assignment.role.displayName,
        systemKey: assignment.role.systemKey,
        isSystemRole: assignment.role.isSystemRole,
        isActive: assignment.role.isActive,
        assignedAt: assignment.assignedAt,
      })
    )
  );
}

export async function getLegacyRoleFallback(role: string | null | undefined) {
  const normalizedRole = normalizeRoleText(role);

  if (!normalizedRole) return [];

  const schema = await getRoleSchemaState();
  const rows = schema.hasRoleId
    ? await db.$queryRaw<EffectiveAdminRole[]>`
        SELECT
          "id",
          "role",
          "displayName",
          "systemKey",
          "isSystemRole",
          "isActive",
          NULL::timestamp AS "assignedAt"
        FROM "AdminStaffRole"
        WHERE LOWER("role") = LOWER(${normalizedRole})
          AND "isActive" = true
        LIMIT 1
      `
    : await db.$queryRaw<
        {
          role: string;
          displayName: string;
          isBuiltIn: boolean;
          isActive: boolean;
          assignedAt: Date | null;
        }[]
      >`
        SELECT
          "role",
          "displayName",
          "isBuiltIn",
          "isActive",
          NULL::timestamp AS "assignedAt"
        FROM "AdminStaffRole"
        WHERE LOWER("role") = LOWER(${normalizedRole})
          AND "isActive" = true
        LIMIT 1
      `;

  return sortEffectiveRoles(rows.map(mapLegacyRoleRow));
}

export async function getEffectiveRolesForUser(
  userId: string,
  legacyRole: string | null | undefined
) {
  try {
    const roles = await getActiveRoleAssignmentsForUser(userId);
    if (roles.length > 0) return roles;
  } catch (error) {
    console.error("ROLE ASSIGNMENT FALLBACK:", error);
  }

  try {
    return getLegacyRoleFallback(legacyRole);
  } catch (error) {
    console.error("LEGACY ROLE FALLBACK:", error);
    return [];
  }
}

export async function getAccessibleAdminTabsForRoles(
  roles: readonly EffectiveAdminRole[]
) {
  const activeRoles = roles.filter((role) => role.isActive);
  if (isOwnerRole(activeRoles)) return ALL_ADMIN_TAB_KEYS;

  const tabKeys = new Set<AdminTabKey>();

  for (const role of activeRoles) {
    const systemKey = role.systemKey as BuiltInAdminRole | null;
    const defaultTabs = systemKey ? DEFAULT_ROLE_TAB_ACCESS[systemKey] ?? [] : [];
    defaultTabs.forEach((tabKey) => tabKeys.add(tabKey));
  }

  if (activeRoles.length > 0) {
    const roleNames = activeRoles.map((role) => role.role);
    const rows = await db.$queryRaw<{ tabKey: string }[]>`
      SELECT DISTINCT "tabKey"
      FROM "AdminRoleTabAccess"
      WHERE role = ANY(${roleNames})
      ORDER BY "tabKey" ASC
    `;

    rows.forEach((row) => {
      if (ALL_ADMIN_TAB_KEYS.includes(row.tabKey as AdminTabKey)) {
        tabKeys.add(row.tabKey as AdminTabKey);
      }
    });
  }

  return Array.from(tabKeys);
}

export async function getDirectAdminTabsForUser(userId: string) {
  const schema = await getRoleSchemaState();

  if (!schema.hasUserAdminTabAccess) {
    return [];
  }

  const rows = await db.userAdminTabAccess.findMany({
    where: {
      userId,
    },
    select: {
      tabKey: true,
    },
    orderBy: {
      tabKey: "asc",
    },
  });

  return uniqueAdminTabKeys(rows.map((row) => row.tabKey));
}

export async function getAssignableAdminRoles({ includeOwner = false } = {}) {
  const schema = await getRoleSchemaState();
  const rows = schema.hasRoleId
    ? await db.$queryRaw<AssignableAdminRole[]>`
        SELECT "id", "role", "displayName", "systemKey", "isSystemRole", "isBuiltIn", "isActive"
        FROM "AdminStaffRole"
        WHERE "isActive" = true
          AND COALESCE("systemKey", '') <> 'CUSTOMER'
          AND (${includeOwner} OR COALESCE("systemKey", '') <> 'OWNER')
        ORDER BY "isSystemRole" DESC, "displayName" ASC
      `
    : await db.$queryRaw<
        {
          role: string;
          displayName: string;
          isBuiltIn: boolean;
          isActive: boolean;
        }[]
      >`
        SELECT "role", "displayName", "isBuiltIn", "isActive"
        FROM "AdminStaffRole"
        WHERE "isActive" = true
          AND "role" <> 'CUSTOMER'
          AND (${includeOwner} OR "role" <> 'OWNER')
        ORDER BY "isBuiltIn" DESC, "displayName" ASC
      `;

  return rows.map((row) => {
    const roleRow = row as AssignableAdminRole;

    return {
      ...mapLegacyRoleRow(roleRow),
      isBuiltIn: Boolean(roleRow.isBuiltIn ?? isBuiltInRole(roleRow.role)),
    };
  });
}

export async function getRolesByIds(roleIds: readonly string[]) {
  if (roleIds.length === 0) return [];

  const schema = await getRoleSchemaState();
  const rows = schema.hasRoleId
    ? await db.$queryRaw<AssignableAdminRole[]>`
        SELECT "id", "role", "displayName", "systemKey", "isSystemRole", "isBuiltIn", "isActive"
        FROM "AdminStaffRole"
        WHERE "id" = ANY(${roleIds})
        ORDER BY "isSystemRole" DESC, "displayName" ASC
      `
    : await db.$queryRaw<
        {
          role: string;
          displayName: string;
          isBuiltIn: boolean;
          isActive: boolean;
        }[]
      >`
        SELECT "role", "displayName", "isBuiltIn", "isActive"
        FROM "AdminStaffRole"
        WHERE "role" = ANY(${roleIds})
        ORDER BY "isBuiltIn" DESC, "displayName" ASC
      `;

  return rows.map((row) => {
    const roleRow = row as AssignableAdminRole;

    return {
      ...mapLegacyRoleRow(roleRow),
      isBuiltIn: Boolean(roleRow.isBuiltIn ?? isBuiltInRole(roleRow.role)),
    };
  });
}

export async function resolveSubmittedRoleIds(
  values: unknown,
  { includeOwner = false } = {}
) {
  const submittedValues = uniqueRoleIds(values);
  const roles = await getAssignableAdminRoles({ includeOwner });
  const canonicalRoleIds: string[] = [];
  const missingValues: string[] = [];

  for (const value of submittedValues) {
    const normalized = value.toLowerCase();
    const upper = value.toUpperCase();
    const match = roles.find(
      (role) =>
        role.id === value ||
        role.systemKey?.toUpperCase() === upper ||
        role.role.toUpperCase() === upper ||
        role.displayName.toLowerCase() === normalized
    );

    if (match) {
      canonicalRoleIds.push(match.id);
    } else {
      missingValues.push(value);
    }
  }

  return {
    roleIds: Array.from(new Set(canonicalRoleIds)),
    missingValues,
    roles,
  };
}
