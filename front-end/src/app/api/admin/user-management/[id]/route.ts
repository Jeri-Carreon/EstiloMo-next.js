import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

import {
  logUserDirectAccessUpdated,
  logUserAvailabilityChanged,
  logUserRolesUpdated,
  logUserUpdated,
} from "@/lib/securityLogEvents";
import {
  adminAuthorizationResponse,
  requireOwner,
} from "@/lib/adminAuthorization";
import {
  getRoleSchemaState,
  getPrimaryRoleFromEffectiveRoles,
  getAccessibleAdminTabsForRoles,
  resolveSubmittedRoleIds,
  uniqueAdminTabKeys,
  type EffectiveAdminRole,
} from "@/lib/adminRoleAssignments";
import { ALL_ADMIN_TAB_KEYS, type AdminTabKey } from "@/lib/adminTabs";

type AssignedRoleRow = EffectiveAdminRole & { assignmentId: string };

function sortRolesByPrimaryPriority(roles: readonly EffectiveAdminRole[]) {
  return [...roles].sort((a, b) => {
    const aRank = a.systemKey === "OWNER" ? 0 : a.systemKey ? 1 : 2;
    const bRank = b.systemKey === "OWNER" ? 0 : b.systemKey ? 1 : 2;
    if (aRank !== bRank) return aRank - bRank;

    const aTime = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
    const bTime = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;

    return a.id.localeCompare(b.id);
  });
}

function roleResponse(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  mobileNumber: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
}, roles: readonly EffectiveAdminRole[], inheritedTabs: readonly AdminTabKey[], directAccessTabs: readonly AdminTabKey[]) {
  const primaryRole = roles[0];
  const accessibleTabs = Array.from(new Set([...inheritedTabs, ...directAccessTabs]));

  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobileNumber: user.mobileNumber,
    role: primaryRole?.role || user.role,
    roleIds: roles.map((role) => role.id),
    inheritedTabs,
    directAccessTabs,
    directUserTabs: directAccessTabs,
    accessibleTabs,
    roles: roles.map((role) => ({
      id: role.id,
      role: role.role,
      displayName: role.displayName,
      systemKey: role.systemKey,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
    })),
    roleDisplayName: primaryRole?.displayName || user.role,
    roleIsArchived: roles.some((role) => !role.isActive),
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function getSubmittedDirectTabs(values: unknown) {
  const input = Array.isArray(values) ? values : [];
  const submitted = Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
  const validTabs = uniqueAdminTabKeys(submitted);
  const invalidTabs = submitted.filter(
    (tabKey) => !ALL_ADMIN_TAB_KEYS.includes(tabKey as AdminTabKey)
  );
  return { validTabs, invalidTabs };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireOwner(req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const adminUser = auth.user;

    const { id } = await params; 

    if (!id) {
      return NextResponse.json(
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const shouldUpdateDirectAccess = Array.isArray(body.directAccessTabs);
    const { validTabs: requestedDirectTabs, invalidTabs } =
      getSubmittedDirectTabs(body.directAccessTabs);

    if (invalidTabs.length > 0) {
      return NextResponse.json(
        { error: "One or more selected modules are invalid." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        barber: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const roleInput = Array.isArray(body.roleIds) && body.roleIds.length > 0
      ? body.roleIds
      : [body.role];
    const {
      roleIds: requestedRoleIds,
      missingValues,
      roles: assignableRoles,
    } = await resolveSubmittedRoleIds(roleInput, { includeOwner: true });
    const selectedRoles: EffectiveAdminRole[] = requestedRoleIds.flatMap((roleId) => {
      const role = assignableRoles.find((staffRole) => staffRole.id === roleId);
      return role
        ? [
            {
              id: role.id,
              role: role.role,
              displayName: role.displayName,
              systemKey: role.systemKey,
              isSystemRole: role.isSystemRole,
              isActive: role.isActive,
              assignedAt: null,
            },
          ]
        : [];
    });

    if (
      missingValues.length > 0 ||
      selectedRoles.length === 0 ||
      selectedRoles.length !== (requestedRoleIds.length || 1)
    ) {
      return NextResponse.json(
        { error: "One or more selected roles are invalid or inactive." },
        { status: 400 }
      );
    }

    const schemaState = await getRoleSchemaState();
    if (!schemaState.hasUserRoleAssignment || !schemaState.hasRoleId) {
      return NextResponse.json(
        { error: "Multi-role database migration has not been applied." },
        { status: 503 }
      );
    }

    if (shouldUpdateDirectAccess && !schemaState.hasUserAdminTabAccess) {
      return NextResponse.json(
        { error: "Direct user access database migration has not been applied." },
        { status: 503 }
      );
    }

    const orderedSelectedRoles = selectedRoles;
    const selectedRoleIds = new Set(orderedSelectedRoles.map((role) => role.id));
    if (selectedRoleIds.size !== orderedSelectedRoles.length) {
      return NextResponse.json(
        { error: "Duplicate roles are not allowed." },
        { status: 400 }
      );
    }

    const currentAssignments = await db.userRoleAssignment.findMany({
      where: {
        userId: id,
        removedAt: null,
      },
      include: {
        role: true,
      },
      orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
    });
    const currentDirectTabs = schemaState.hasUserAdminTabAccess
      ? await db.userAdminTabAccess.findMany({
          where: {
            userId: id,
          },
          select: {
            tabKey: true,
          },
          orderBy: {
            tabKey: "asc",
          },
        })
      : [];
    const currentDirectTabKeys = uniqueAdminTabKeys(
      currentDirectTabs.map((row) => row.tabKey)
    );
    const nextDirectTabs = shouldUpdateDirectAccess
      ? requestedDirectTabs
      : currentDirectTabKeys;

    const currentRoles =
      currentAssignments.length > 0
        ? currentAssignments.map((assignment) => ({
            assignmentId: assignment.id,
            id: assignment.role.id,
            role: assignment.role.role,
            displayName: assignment.role.displayName,
            systemKey: assignment.role.systemKey,
            isSystemRole: assignment.role.isSystemRole,
            isActive: assignment.role.isActive,
            assignedAt: assignment.assignedAt,
          }))
        : await db.$queryRaw<AssignedRoleRow[]>`
            SELECT
              '' AS "assignmentId",
              "id",
              "role",
              "displayName",
              "systemKey",
              "isSystemRole",
              "isActive",
              NULL::timestamp AS "assignedAt"
            FROM "AdminStaffRole"
            WHERE "role" = ${existingUser.role}
              AND "isActive" = true
            LIMIT 1
          `;

    const currentIsOwner = currentRoles.some((role) => role.systemKey === "OWNER");
    const nextIsOwner = orderedSelectedRoles.some((role) => role.systemKey === "OWNER");

    if (currentIsOwner && !nextIsOwner) {
      return NextResponse.json(
        { error: "Cannot remove Owner role." },
        { status: 403 }
      );
    }

    const primaryRole = getPrimaryRoleFromEffectiveRoles(
      sortRolesByPrimaryPriority(orderedSelectedRoles),
      orderedSelectedRoles[0].role
    );

    const transactionResult = await db.$transaction(async (tx) => {
      const activeAssignments = await tx.userRoleAssignment.findMany({
        where: {
          userId: id,
          removedAt: null,
        },
        include: {
          role: true,
        },
        orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
      });
      const currentRoleIds = new Set(activeAssignments.map((assignment) => assignment.roleId));
      const addedRoles = orderedSelectedRoles.filter(
        (role) => !currentRoleIds.has(role.id)
      );
      const removedAssignments = activeAssignments.filter(
        (assignment) => !selectedRoleIds.has(assignment.roleId)
      );
      const removedRoles = removedAssignments.map((assignment) => ({
        assignmentId: assignment.id,
        id: assignment.role.id,
        role: assignment.role.role,
        displayName: assignment.role.displayName,
        systemKey: assignment.role.systemKey,
        isSystemRole: assignment.role.isSystemRole,
        isActive: assignment.role.isActive,
        assignedAt: assignment.assignedAt,
      }));
      const previousDirectTabs = schemaState.hasUserAdminTabAccess
        ? uniqueAdminTabKeys(
            await tx.userAdminTabAccess.findMany({
              where: {
                userId: id,
              },
              select: {
                tabKey: true,
              },
              orderBy: {
                tabKey: "asc",
              },
            }).then((rows) => rows.map((row) => row.tabKey))
          )
        : [];
      const previousDirectSet = new Set(previousDirectTabs);
      const requestedDirectSet = new Set(nextDirectTabs);
      const addedDirectTabs = nextDirectTabs.filter(
        (tabKey) => !previousDirectSet.has(tabKey)
      );
      const removedDirectTabs = previousDirectTabs.filter(
        (tabKey) => !requestedDirectSet.has(tabKey)
      );

      const userRecord = await tx.user.update({
        where: {
          id,
        },
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          mobileNumber: body.mobileNumber,
          role: primaryRole,
        },
      });

      if (addedRoles.length > 0) {
        await tx.userRoleAssignment.createMany({
          data: addedRoles.map((roleToAdd) => ({
            id: randomUUID(),
            userId: id,
            roleId: roleToAdd.id,
            assignedBy: adminUser.id,
            assignedRoleName: roleToAdd.displayName,
          })),
          skipDuplicates: true,
        });
      }

      if (removedRoles.length > 0) {
        await Promise.all(
          removedRoles.map((role) =>
            tx.userRoleAssignment.update({
              where: { id: role.assignmentId },
              data: {
                removedAt: new Date(),
                removedBy: adminUser.id,
                removedRoleName: role.displayName,
              },
            })
          )
        );
      }

      if (
        schemaState.hasUserAdminTabAccess &&
        (addedDirectTabs.length > 0 || removedDirectTabs.length > 0)
      ) {
        await tx.userAdminTabAccess.deleteMany({
          where: {
            userId: id,
          },
        });

        if (nextDirectTabs.length > 0) {
          await tx.userAdminTabAccess.createMany({
            data: nextDirectTabs.map((tabKey) => ({
              id: randomUUID(),
              userId: id,
              tabKey,
            })),
            skipDuplicates: true,
          });
        }
      }

      const refreshedAssignments = await tx.userRoleAssignment.findMany({
        where: {
          userId: id,
          removedAt: null,
        },
        include: {
          role: true,
        },
        orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
      });
      const refreshedRoles = refreshedAssignments.map((assignment) => ({
        id: assignment.role.id,
        role: assignment.role.role,
        displayName: assignment.role.displayName,
        systemKey: assignment.role.systemKey,
        isSystemRole: assignment.role.isSystemRole,
        isActive: assignment.role.isActive,
        assignedAt: assignment.assignedAt,
      }));

      return {
        user: userRecord,
        roles: sortRolesByPrimaryPriority(refreshedRoles),
        addedRoles,
        removedRoles,
        previousDirectTabs,
        directAccessTabs: nextDirectTabs,
        addedDirectTabs,
        removedDirectTabs,
      };
    });

    const updatedUser = transactionResult.user;
    const targetUserName = `${updatedUser.firstName} ${updatedUser.lastName}`.trim();
    const inheritedTabs = await getAccessibleAdminTabsForRoles(transactionResult.roles);
    await logUserUpdated(req, adminUser, targetUserName);
    if (
      transactionResult.addedRoles.length > 0 ||
      transactionResult.removedRoles.length > 0
    ) {
      await logUserRolesUpdated(
        req,
        adminUser,
        targetUserName,
        {
          targetUserId: updatedUser.id,
          targetUserName,
          previousRoles: currentRoles.map((role) => ({
            id: role.id,
            name: role.displayName,
            systemKey: role.systemKey,
          })),
          newRoles: transactionResult.roles.map((role) => ({
            id: role.id,
            name: role.displayName,
            systemKey: role.systemKey,
          })),
          addedRoles: transactionResult.addedRoles.map((role) => ({
            id: role.id,
            name: role.displayName,
            systemKey: role.systemKey,
          })),
          removedRoles: transactionResult.removedRoles.map((role) => ({
            id: role.id,
            name: role.displayName,
            systemKey: role.systemKey,
          })),
        }
      );
    }
    if (
      transactionResult.addedDirectTabs.length > 0 ||
      transactionResult.removedDirectTabs.length > 0
    ) {
      await logUserDirectAccessUpdated(
        req,
        adminUser,
        targetUserName,
        {
          targetUserId: updatedUser.id,
          targetUserName,
          previousDirectTabs: transactionResult.previousDirectTabs,
          newDirectTabs: transactionResult.directAccessTabs,
          addedTabs: transactionResult.addedDirectTabs,
          removedTabs: transactionResult.removedDirectTabs,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: roleResponse(
        updatedUser,
        transactionResult.roles,
        inheritedTabs,
        transactionResult.directAccessTabs
      ),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireOwner(req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const adminUser = auth.user;

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: { isActive: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
    });

    await logUserAvailabilityChanged(req, adminUser, `${user.firstName} ${user.lastName}`.trim(), updated.isActive);

    return NextResponse.json({
      user: updated,
      message: "User status updated successfully",
    });
  } catch (error) {
    console.error("PATCH USER ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
