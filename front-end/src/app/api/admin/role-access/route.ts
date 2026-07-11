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
}

function buildDefaultAccess() {
  return {
    OWNER: DEFAULT_ROLE_TAB_ACCESS.OWNER,
    RECEPTIONIST: DEFAULT_ROLE_TAB_ACCESS.RECEPTIONIST,
    BARBER: DEFAULT_ROLE_TAB_ACCESS.BARBER,
  };
}

function groupAccess(rows: AccessRow[]) {
  const access = buildDefaultAccess();
  const rowsByRole = rows.reduce<Record<string, string[]>>((acc, row) => {
    acc[row.role] = acc[row.role] || [];
    acc[row.role].push(row.tabKey);
    return acc;
  }, {});

  (["RECEPTIONIST", "BARBER"] as AdminRole[]).forEach((role) => {
    if (rowsByRole[role]) {
      access[role] = rowsByRole[role].filter((tabKey) =>
        ALL_ADMIN_TAB_KEYS.includes(tabKey as AdminTabKey)
      ) as AdminTabKey[];
    }
  });

  return access;
}

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST", "BARBER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureRoleAccessTable();

    const rows = await db.$queryRaw<AccessRow[]>`
      SELECT role, "tabKey"
      FROM "AdminRoleTabAccess"
      ORDER BY role ASC, "tabKey" ASC
    `;

    const access = groupAccess(rows);
    const role = normalizeAdminRole(user.role);

    return NextResponse.json({
      access,
      accessibleTabs: role ? access[role] : [],
    });
  } catch (error) {
    console.error("GET ROLE ACCESS ERROR:", error);

    const access = buildDefaultAccess();

    return NextResponse.json({
      access,
      accessibleTabs: user?.role ? access[user.role as AdminRole] || [] : [],
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
    const role = normalizeAdminRole(body.role);
    const requestedTabs = Array.isArray(body.tabs) ? body.tabs : [];

    if (!role || role === "OWNER") {
      return NextResponse.json(
        { error: "Select Receptionist or Barber." },
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
