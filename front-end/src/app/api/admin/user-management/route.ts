import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";
import { getPrimaryRole, hasAnyRole, normalizeAdminRoles } from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getAdminUser()
    if (!hasAnyRole(user, ["OWNER"])){
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          { role: { in: ["OWNER", "RECEPTIONIST", "BARBER"] } },
          { roleAssignments: { some: { role: { in: ["OWNER", "RECEPTIONIST", "BARBER"] } } } },
        ],
      },
      include: {
        roleAssignments: {
          select: {
            role: true,
          },
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

    const result = users.map((user) => {
      const assignedRoles = user.roleAssignments.map((assignment) => assignment.role);
      const roles = normalizeAdminRoles(assignedRoles.length > 0 ? assignedRoles : user.role);

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
          
        role: getPrimaryRole(roles, user.role),
        roles,

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
