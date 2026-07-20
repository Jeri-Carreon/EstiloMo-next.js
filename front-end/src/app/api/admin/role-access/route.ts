import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireOwner,
} from "@/lib/adminAuthorization";
import {
  ALL_ADMIN_TAB_KEYS,
  DEFAULT_ROLE_TAB_ACCESS,
  type AdminRole,
  type AdminTabKey,
  normalizeAdminRole,
} from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

type AccessRow = {
  role: string;
  tabKey: string;
};

async function ensureRoleAccessTable() {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "AdminStaffRole" (
      "id" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "normalizedName" TEXT,
      "systemKey" TEXT,
      "displayName" TEXT NOT NULL,
      "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
      "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AdminStaffRole_pkey" PRIMARY KEY ("role")
    )
  `;

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "AdminRoleTabAccess" (
      "id" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "tabKey" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "AdminRoleTabAccess_pkey" PRIMARY KEY ("id")
    )
  `;

  await db.$executeRaw`
    CREATE INDEX IF NOT EXISTS "AdminRoleTabAccess_role_idx"
    ON "AdminRoleTabAccess"("role")
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminRoleTabAccess_role_tabKey_key"
    ON "AdminRoleTabAccess"("role", "tabKey")
  `;

  await db.$executeRaw`
    ALTER TABLE "AdminStaffRole"
    ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true
  `;

  await db.$executeRaw`
    ALTER TABLE "AdminStaffRole"
    ADD COLUMN IF NOT EXISTS "id" TEXT,
    ADD COLUMN IF NOT EXISTS "normalizedName" TEXT,
    ADD COLUMN IF NOT EXISTS "systemKey" TEXT,
    ADD COLUMN IF NOT EXISTS "isSystemRole" BOOLEAN NOT NULL DEFAULT false
  `;

  await db.$executeRaw`
    UPDATE "AdminStaffRole"
    SET
      "id" = CASE
        WHEN "role" = 'OWNER' THEN 'system_owner'
        WHEN "role" = 'RECEPTIONIST' THEN 'system_receptionist'
        WHEN "role" = 'BARBER' THEN 'system_barber'
        WHEN "role" = 'CUSTOMER' THEN 'system_customer'
        WHEN "id" IS NULL OR "id" = "role" THEN 'role_' || md5(LOWER(TRIM("role")))
        ELSE "id"
      END,
      "normalizedName" = COALESCE("normalizedName", LOWER(TRIM("role"))),
      "systemKey" = CASE
        WHEN "role" IN ('OWNER', 'RECEPTIONIST', 'BARBER', 'CUSTOMER') THEN "role"
        ELSE "systemKey"
      END,
      "isSystemRole" = CASE
        WHEN "role" IN ('OWNER', 'RECEPTIONIST', 'BARBER', 'CUSTOMER') THEN true
        ELSE "isSystemRole"
      END
  `;

  await db.$executeRaw`
    ALTER TABLE "AdminStaffRole"
    ALTER COLUMN "id" SET NOT NULL
  `;

  await db.$executeRaw`
    INSERT INTO "AdminStaffRole" ("id", "role", "normalizedName", "systemKey", "displayName", "isBuiltIn", "isSystemRole", "createdAt", "updatedAt")
    VALUES
      ('system_owner', 'OWNER', 'owner', 'OWNER', 'Owner', true, true, NOW(), NOW()),
      ('system_receptionist', 'RECEPTIONIST', 'receptionist', 'RECEPTIONIST', 'Receptionist', true, true, NOW(), NOW()),
      ('system_barber', 'BARBER', 'barber', 'BARBER', 'Barber', true, true, NOW(), NOW()),
      ('system_customer', 'CUSTOMER', 'customer', 'CUSTOMER', 'Customer', true, true, NOW(), NOW())
    ON CONFLICT ("role") DO UPDATE
    SET
      "id" = CASE
        WHEN "AdminStaffRole"."id" IS NULL OR "AdminStaffRole"."id" = "AdminStaffRole"."role" THEN EXCLUDED."id"
        ELSE "AdminStaffRole"."id"
      END,
      "normalizedName" = COALESCE("AdminStaffRole"."normalizedName", EXCLUDED."normalizedName"),
      "systemKey" = EXCLUDED."systemKey",
      "displayName" = EXCLUDED."displayName",
      "isBuiltIn" = true,
      "isSystemRole" = true,
      "isActive" = true,
      "updatedAt" = NOW()
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_role_lower_key"
    ON "AdminStaffRole"(LOWER("role"))
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_id_key"
    ON "AdminStaffRole"("id")
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_normalizedName_key"
    ON "AdminStaffRole"("normalizedName")
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_systemKey_key"
    ON "AdminStaffRole"("systemKey")
  `;
}

function buildDefaultAccess() {
  return {
    OWNER: DEFAULT_ROLE_TAB_ACCESS.OWNER,
    RECEPTIONIST: DEFAULT_ROLE_TAB_ACCESS.RECEPTIONIST,
    BARBER: DEFAULT_ROLE_TAB_ACCESS.BARBER,
  } as Record<string, AdminTabKey[]>;
}

function groupAccess(rows: AccessRow[]) {
  const access = buildDefaultAccess();
  const rowsByRole = rows.reduce<Record<string, string[]>>((acc, row) => {
    acc[row.role] = acc[row.role] || [];
    acc[row.role].push(row.tabKey);
    return acc;
  }, {});

  Object.entries(rowsByRole).forEach(([role, tabs]) => {
    if (role !== "OWNER") {
      access[role] = tabs.filter((tabKey) =>
        ALL_ADMIN_TAB_KEYS.includes(tabKey as AdminTabKey)
      ) as AdminTabKey[];
    }
  });

  return access;
}

type StaffRoleRow = {
  id: string;
  role: string;
  displayName: string;
  isBuiltIn: boolean;
  isSystemRole: boolean;
  systemKey: string | null;
  isActive: boolean;
};

function normalizeRoleName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getStaffRoles({
  includeArchived = false,
  archivedOnly = false,
}: {
  includeArchived?: boolean;
  archivedOnly?: boolean;
} = {}) {
  if (archivedOnly) {
    return db.$queryRaw<StaffRoleRow[]>`
      SELECT "id", "role", "displayName", "isBuiltIn", "isSystemRole", "systemKey", "isActive"
      FROM "AdminStaffRole"
      WHERE "isActive" = false
      ORDER BY "isBuiltIn" DESC, "displayName" ASC
    `;
  }

  if (includeArchived) {
    return db.$queryRaw<StaffRoleRow[]>`
      SELECT "id", "role", "displayName", "isBuiltIn", "isSystemRole", "systemKey", "isActive"
      FROM "AdminStaffRole"
      ORDER BY "isBuiltIn" DESC, "displayName" ASC
    `;
  }

  return db.$queryRaw<StaffRoleRow[]>`
    SELECT "id", "role", "displayName", "isBuiltIn", "isSystemRole", "systemKey", "isActive"
    FROM "AdminStaffRole"
    WHERE "isActive" = true
    ORDER BY "isBuiltIn" DESC, "displayName" ASC
  `;
}

async function getRoleLists() {
  const [roles, archivedRoles] = await Promise.all([
    getStaffRoles(),
    getStaffRoles({ archivedOnly: true }),
  ]);

  return {
    roles: roles.filter((role) => role.systemKey !== "CUSTOMER"),
    archivedRoles: archivedRoles.filter((role) => !role.isBuiltIn),
  };
}

async function roleExists(role: string) {
  const rows = await db.$queryRaw<{ role: string; isActive: boolean }[]>`
    SELECT "role", "isActive"
    FROM "AdminStaffRole"
    WHERE LOWER("role") = LOWER(${role})
    LIMIT 1
  `;

  return rows.length > 0;
}

async function getRole(role: string) {
  const rows = await db.$queryRaw<StaffRoleRow[]>`
    SELECT "id", "role", "displayName", "isBuiltIn", "isSystemRole", "systemKey", "isActive"
    FROM "AdminStaffRole"
    WHERE LOWER("role") = LOWER(${role})
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getActiveRoleWithSameNormalizedName(role: string) {
  const rows = await db.$queryRaw<Pick<StaffRoleRow, "role" | "displayName">[]>`
    SELECT "role", "displayName"
    FROM "AdminStaffRole"
    WHERE LOWER(TRIM("role")) = LOWER(TRIM(${role}))
      AND "isActive" = true
      AND "role" <> ${role}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function GET() {
  let userRole: AdminRole | null = null;

  try {
    const auth = await requireOwner();

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    await ensureRoleAccessTable();

    const rows = await db.$queryRaw<AccessRow[]>`
      SELECT role, "tabKey"
      FROM "AdminRoleTabAccess"
      ORDER BY role ASC, "tabKey" ASC
    `;

    const { roles, archivedRoles } = await getRoleLists();
    const access = groupAccess(rows);
    roles.forEach((role) => {
      access[role.role] = access[role.role] || [];
    });
    userRole = normalizeAdminRole(auth.role);

    return NextResponse.json({
      access,
      roles,
      archivedRoles,
      accessibleTabs: userRole ? access[userRole] : [],
    });
  } catch (error) {
    console.error("GET ROLE ACCESS ERROR:", error);

    const access = buildDefaultAccess();

    return NextResponse.json({
      access,
      accessibleTabs: userRole ? access[userRole] : [],
    });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireOwner(req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    await ensureRoleAccessTable();

    const body = await req.json();
    const role = normalizeRoleName(body.role);
    const requestedTabs = Array.isArray(body.tabs) ? body.tabs : [];

    const roleRow = role ? await getRole(role) : null;

    if (!role || role === "OWNER" || !roleRow || !roleRow.isActive) {
      return NextResponse.json(
        { error: "Select a valid staff role." },
        { status: 400 }
      );
    }

    const validTabs = requestedTabs.filter(
      (tabKey: unknown): tabKey is AdminTabKey =>
        typeof tabKey === "string" &&
        ALL_ADMIN_TAB_KEYS.includes(tabKey as AdminTabKey)
    );
    const tabs = Array.from(new Set<AdminTabKey>(validTabs));

    await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "AdminRoleTabAccess"
        WHERE role = ${role}
      `;

      for (const tabKey of tabs) {
        await tx.$executeRaw`
          INSERT INTO "AdminRoleTabAccess" (id, role, "tabKey", "createdAt", "updatedAt")
          VALUES (${`${role}-${tabKey}`}, ${role}, ${tabKey}, NOW(), NOW())
          ON CONFLICT (role, "tabKey") DO NOTHING
        `;
      }
    });

    return NextResponse.json({ success: true, role, tabs });
  } catch (error) {
    console.error("UPDATE ROLE ACCESS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update role access settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireOwner(req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    await ensureRoleAccessTable();

    const body = await req.json();
    const role = normalizeRoleName(body.role);
    const requestedTabs = Array.isArray(body.tabs) ? body.tabs : [];

    if (!role) {
      return NextResponse.json(
        { error: "Role name is required." },
        { status: 400 }
      );
    }

    if (await roleExists(role)) {
      return NextResponse.json(
        { error: "This role already exists." },
        { status: 409 }
      );
    }

    const validTabs = requestedTabs.filter(
      (tabKey: unknown): tabKey is AdminTabKey =>
        typeof tabKey === "string" &&
        ALL_ADMIN_TAB_KEYS.includes(tabKey as AdminTabKey)
    );
    const tabs = Array.from(new Set<AdminTabKey>(validTabs));

    await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "AdminStaffRole" ("id", "role", "normalizedName", "displayName", "isBuiltIn", "isSystemRole", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${role}, ${role.toLowerCase()}, ${role}, false, false, NOW(), NOW())
      `;

      for (const tabKey of tabs) {
        await tx.$executeRaw`
          INSERT INTO "AdminRoleTabAccess" (id, role, "tabKey", "createdAt", "updatedAt")
          VALUES (${`${role}-${tabKey}`}, ${role}, ${tabKey}, NOW(), NOW())
          ON CONFLICT (role, "tabKey") DO NOTHING
        `;
      }
    });

    const { roles, archivedRoles } = await getRoleLists();

    return NextResponse.json({
      success: true,
      role,
      tabs,
      roles,
      archivedRoles,
    });
  } catch (error) {
    console.error("CREATE ROLE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireOwner(req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    await ensureRoleAccessTable();

    const body = await req.json();
    const action = body.action === "restore" ? "restore" : "archive";
    const role = normalizeRoleName(body.role);
    const roleRow = role ? await getRole(role) : null;

    if (!roleRow) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }

    if (roleRow.isSystemRole || roleRow.systemKey === "OWNER") {
      return NextResponse.json(
        {
          error:
            action === "restore"
              ? "Built-in roles cannot be restored."
              : "Built-in roles cannot be archived.",
        },
        { status: 400 }
      );
    }

    if (action === "restore") {
      if (roleRow.isActive) {
        return NextResponse.json(
          { error: "Role is already active." },
          { status: 400 }
        );
      }

      const activeRole = await getActiveRoleWithSameNormalizedName(roleRow.role);

      if (activeRole) {
        return NextResponse.json(
          {
            error: "An active role with this name already exists.",
            activeRole,
          },
          { status: 409 }
        );
      }

      if (body.confirm !== true) {
        return NextResponse.json({
          canRestore: true,
          role: roleRow.role,
          displayName: roleRow.displayName,
        });
      }

      await db.$executeRaw`
        UPDATE "AdminStaffRole"
        SET "isActive" = true, "updatedAt" = NOW()
        WHERE "role" = ${roleRow.role}
      `;

      const { roles, archivedRoles } = await getRoleLists();

      return NextResponse.json({
        success: true,
        role: roleRow.role,
        roles,
        archivedRoles,
      });
    }

    if (!roleRow.isActive) {
      return NextResponse.json(
        { error: "Role is already archived." },
        { status: 400 }
      );
    }

    let assignedUsers: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }[] = [];

    try {
      assignedUsers = await db.$queryRaw<
        { id: string; firstName: string | null; lastName: string | null; email: string | null }[]
      >`
        SELECT DISTINCT u."id", u."firstName", u."lastName", u."email"
        FROM "User" u
        JOIN "UserRoleAssignment" a ON a."userId" = u."id"
        WHERE a."roleId" = ${roleRow.id}
          AND a."removedAt" IS NULL
          AND u."isActive" = true
        ORDER BY u."firstName" ASC, u."lastName" ASC
      `;
    } catch (error) {
      console.error("ROLE ASSIGNMENT ARCHIVE CHECK FALLBACK:", error);
    }

    if (assignedUsers.length === 0) {
      assignedUsers = await db.user.findMany({
        where: {
          role: roleRow.role,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      });
    }

    if (assignedUsers.length > 0) {
      const users = assignedUsers.map((user) => ({
        id: user.id,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.email,
      }));

      return NextResponse.json(
        {
          error: "Role is assigned to active users.",
          assignedUsers: users.slice(0, 5),
          assignedUserCount: users.length,
        },
        { status: 409 }
      );
    }

    if (body.confirm !== true) {
      return NextResponse.json({
        canArchive: true,
        role: roleRow.role,
        displayName: roleRow.displayName,
      });
    }

    await db.$executeRaw`
      UPDATE "AdminStaffRole"
      SET "isActive" = false, "updatedAt" = NOW()
      WHERE "role" = ${roleRow.role}
    `;

    const { roles, archivedRoles } = await getRoleLists();

    return NextResponse.json({
      success: true,
      role: roleRow.role,
      roles,
      archivedRoles,
    });
  } catch (error) {
    console.error("ROLE ARCHIVE/RESTORE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update role archive status" },
      { status: 500 }
    );
  }
}
