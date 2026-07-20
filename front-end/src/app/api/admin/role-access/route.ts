import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
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
      "role" TEXT NOT NULL,
      "displayName" TEXT NOT NULL,
      "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
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
    INSERT INTO "AdminStaffRole" ("role", "displayName", "isBuiltIn", "createdAt", "updatedAt")
    VALUES
      ('OWNER', 'Owner', true, NOW(), NOW()),
      ('RECEPTIONIST', 'Receptionist', true, NOW(), NOW()),
      ('BARBER', 'Barber', true, NOW(), NOW())
    ON CONFLICT ("role") DO NOTHING
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaffRole_role_lower_key"
    ON "AdminStaffRole"(LOWER("role"))
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
  role: string;
  displayName: string;
  isBuiltIn: boolean;
};

function normalizeRoleName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getStaffRoles() {
  const rows = await db.$queryRaw<StaffRoleRow[]>`
    SELECT "role", "displayName", "isBuiltIn"
    FROM "AdminStaffRole"
    ORDER BY "isBuiltIn" DESC, "displayName" ASC
  `;

  return rows;
}

async function roleExists(role: string) {
  const rows = await db.$queryRaw<{ role: string }[]>`
    SELECT "role"
    FROM "AdminStaffRole"
    WHERE LOWER("role") = LOWER(${role})
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function GET() {
  let userRole: AdminRole | null = null;

  try {
    const user = await getAdminUser();

    if (!user || !normalizeAdminRole(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRoleAccessTable();

    const rows = await db.$queryRaw<AccessRow[]>`
      SELECT role, "tabKey"
      FROM "AdminRoleTabAccess"
      ORDER BY role ASC, "tabKey" ASC
    `;

    const roles = await getStaffRoles();
    const access = groupAccess(rows);
    roles.forEach((role) => {
      access[role.role] = access[role.role] || [];
    });
    userRole = normalizeAdminRole(user.role);

    return NextResponse.json({
      access,
      roles,
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
    const user = await getAdminUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRoleAccessTable();

    const body = await req.json();
    const role = normalizeRoleName(body.role);
    const requestedTabs = Array.isArray(body.tabs) ? body.tabs : [];

    if (!role || role === "OWNER" || !(await roleExists(role))) {
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
    const user = await getAdminUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        INSERT INTO "AdminStaffRole" ("role", "displayName", "isBuiltIn", "createdAt", "updatedAt")
        VALUES (${role}, ${role}, false, NOW(), NOW())
      `;

      for (const tabKey of tabs) {
        await tx.$executeRaw`
          INSERT INTO "AdminRoleTabAccess" (id, role, "tabKey", "createdAt", "updatedAt")
          VALUES (${`${role}-${tabKey}`}, ${role}, ${tabKey}, NOW(), NOW())
          ON CONFLICT (role, "tabKey") DO NOTHING
        `;
      }
    });

    const roles = await getStaffRoles();

    return NextResponse.json({
      success: true,
      role,
      tabs,
      roles,
    });
  } catch (error) {
    console.error("CREATE ROLE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
