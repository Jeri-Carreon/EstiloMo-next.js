import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAdminTabAccess("user-management", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const users = await db.user.findMany({
      where: {
        NOT: {
          role: "CUSTOMER",
        },
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const staffRoles = await db.$queryRaw<
      { role: string; displayName: string; isActive: boolean }[]
    >`
      SELECT "role", "displayName", "isActive"
      FROM "AdminStaffRole"
    `;
    const roleByName = new Map(staffRoles.map((role) => [role.role, role]));

    const result = users.map((user) => {
      const roleMeta = roleByName.get(user.role);

      return {
        id: user.id,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.email ||
          "Unknown",

        mobileNumber:
          user.mobileNumber || "N/A",

        email:
          user.email,
        
        role: user.role,
        roleDisplayName: roleMeta?.displayName ?? user.role,
        roleIsArchived: roleMeta ? !roleMeta.isActive : false,

        isActive: user.isActive,

        createdAt: user.createdAt,
      };
    });

    return NextResponse.json({ users: result });
    } catch (error) {
      console.error("GET USERS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
