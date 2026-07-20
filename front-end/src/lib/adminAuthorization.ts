import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  DEFAULT_ROLE_TAB_ACCESS,
  normalizeAdminRole,
  type AdminTabKey,
  type BuiltInAdminRole,
} from "@/lib/adminTabs";
import { NextResponse } from "next/server";

type AccessRow = {
  tabKey: string;
};

type CurrentAdminAccess =
  | {
      user: null;
      role: null;
      accessibleTabs: AdminTabKey[];
      status: 401;
    }
  | {
      user: null;
      role: null;
      accessibleTabs: AdminTabKey[];
      status: 403;
    }
  | {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        isActive: boolean;
      };
      role: string;
      accessibleTabs: AdminTabKey[];
      status: 200 | 403;
    };

export async function getAccessibleAdminTabsForRole(
  role: string | null | undefined
): Promise<AdminTabKey[]> {
  const normalizedRole = normalizeAdminRole(role);

  if (!normalizedRole) return [];
  if (normalizedRole === "OWNER") return DEFAULT_ROLE_TAB_ACCESS.OWNER;

  let accessibleTabs =
    DEFAULT_ROLE_TAB_ACCESS[normalizedRole as BuiltInAdminRole] || [];

  try {
    const roleRows = await db.$queryRaw<{ isActive: boolean }[]>`
      SELECT "isActive"
      FROM "AdminStaffRole"
      WHERE LOWER("role") = LOWER(${normalizedRole})
      LIMIT 1
    `;
    const roleRow = roleRows[0];
    const hasBuiltInFallback = Boolean(
      DEFAULT_ROLE_TAB_ACCESS[normalizedRole as BuiltInAdminRole]
    );

    if ((!roleRow && !hasBuiltInFallback) || roleRow?.isActive === false) {
      return [];
    }

    const rows = await db.$queryRaw<AccessRow[]>`
      SELECT "tabKey"
      FROM "AdminRoleTabAccess"
      WHERE role = ${normalizedRole}
      ORDER BY "tabKey" ASC
    `;

    if (
      rows.length > 0 ||
      !DEFAULT_ROLE_TAB_ACCESS[normalizedRole as BuiltInAdminRole]
    ) {
      accessibleTabs = rows.map((row) => row.tabKey as AdminTabKey);
    }
  } catch (error) {
    console.error("ROLE ACCESS FALLBACK:", error);
  }

  return accessibleTabs;
}

export async function getCurrentAdminAccess(req?: Request): Promise<CurrentAdminAccess> {
  const supabase = await createClient();
  const authHeader = req?.headers.get("authorization");
  let authUser = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    authUser = data?.user ?? null;
  } else {
    const { data } = await supabase.auth.getUser();
    authUser = data?.user ?? null;
  }

  if (!authUser) {
    return { user: null, role: null, accessibleTabs: [], status: 401 };
  }

  const normalizedEmail = authUser.email?.toLowerCase().trim();
  const user = await db.user.findFirst({
    where: {
      OR: [
        { id: authUser.id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || user.isActive === false) {
    return { user: null, role: null, accessibleTabs: [], status: 401 };
  }

  const accessibleTabs = await getAccessibleAdminTabsForRole(user.role);

  return {
    user,
    role: user.role,
    accessibleTabs,
    status: accessibleTabs.length > 0 ? 200 : 403,
  };
}

export async function requireAdminTabAccess(tabKey: AdminTabKey, req?: Request) {
  const access = await getCurrentAdminAccess(req);

  if (access.status !== 200) {
    return access;
  }

  if (!access.accessibleTabs.includes(tabKey)) {
    return { ...access, status: 403 };
  }

  return access;
}

export async function requireAnyAdminTabAccess(
  tabKeys: AdminTabKey[],
  req?: Request
) {
  const access = await getCurrentAdminAccess(req);

  if (access.status !== 200) {
    return access;
  }

  if (!tabKeys.some((tabKey) => access.accessibleTabs.includes(tabKey))) {
    return { ...access, status: 403 };
  }

  return access;
}

export function adminAuthorizationResponse(status: number) {
  const responseStatus = status === 401 ? 401 : 403;

  return NextResponse.json(
    {
      error: responseStatus === 401 ? "Unauthorized" : "Forbidden",
    },
    { status: responseStatus }
  );
}

export async function requireOwner(req?: Request) {
  const access = await getCurrentAdminAccess(req);

  if (access.status !== 200) {
    return access;
  }

  if (normalizeAdminRole(access.role) !== "OWNER") {
    return { ...access, status: 403 };
  }

  return access;
}
