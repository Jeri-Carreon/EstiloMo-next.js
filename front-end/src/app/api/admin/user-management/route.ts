import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";
import { getRoleSchemaState } from "@/lib/adminRoleAssignments";

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
      { id: string; role: string; displayName: string; systemKey: string | null; isSystemRole: boolean; isActive: boolean }[]
    >`
      SELECT "id", "role", "displayName", "systemKey", "isSystemRole", "isActive"
      FROM "AdminStaffRole"
    `;
    const roleByName = new Map(staffRoles.map((role) => [role.role, role]));
    const userIds = users.map((user) => user.id);
    let assignments: {
      userId: string;
      assignedAt: Date;
      id: string;
      role: string;
      displayName: string;
      systemKey: string | null;
      isSystemRole: boolean;
      isActive: boolean;
    }[] = [];
    let directAccessRows: { userId: string; tabKey: string }[] = [];

    if (userIds.length) {
      const schemaState = await getRoleSchemaState();
      if (schemaState.hasUserRoleAssignment && schemaState.hasRoleId) {
        const rows = await db.userRoleAssignment.findMany({
          where: {
            userId: {
              in: userIds,
            },
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
        assignments = rows.map((assignment) => ({
          userId: assignment.userId,
          assignedAt: assignment.assignedAt,
          id: assignment.role.id,
          role: assignment.role.role,
          displayName: assignment.role.displayName,
          systemKey: assignment.role.systemKey,
          isSystemRole: assignment.role.isSystemRole,
          isActive: assignment.role.isActive,
        }));
      } else {
        console.warn(
          "USER ROLE ASSIGNMENT LIST FALLBACK: multi-role migration has not been applied."
        );
      }

      if (schemaState.hasUserAdminTabAccess) {
        directAccessRows = await db.userAdminTabAccess.findMany({
          where: {
            userId: {
              in: userIds,
            },
          },
          select: {
            userId: true,
            tabKey: true,
          },
          orderBy: {
            tabKey: "asc",
          },
        });
      }
    }
    const assignmentsByUserId = assignments.reduce<
      Record<string, typeof assignments>
    >((acc, assignment) => {
      acc[assignment.userId] = acc[assignment.userId] || [];
      acc[assignment.userId].push(assignment);
      return acc;
    }, {});

    const result = users.map((user) => {
      const roleMeta = roleByName.get(user.role);
      const activeAssignments = assignmentsByUserId[user.id] || [];
      const effectiveRoles =
        activeAssignments.length > 0
          ? activeAssignments
          : roleMeta
          ? [
              {
                userId: user.id,
                assignedAt: user.createdAt,
                ...roleMeta,
              },
            ]
          : [];
      const primaryRole = effectiveRoles[0] ?? roleMeta;
      const directAccessTabs = directAccessRows
        .filter((row) => row.userId === user.id)
        .map((row) => row.tabKey);

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
        
        role: primaryRole?.role ?? user.role,
        roleIds: effectiveRoles.map((role) => role.id),
        directAccessTabs,
        roles: effectiveRoles.map((role) => ({
          id: role.id,
          role: role.role,
          displayName: role.displayName,
          systemKey: role.systemKey,
          isSystemRole: role.isSystemRole,
          isActive: role.isActive,
        })),
        roleDisplayName: primaryRole?.displayName ?? user.role,
        roleIsArchived: effectiveRoles.some((role) => !role.isActive),

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
