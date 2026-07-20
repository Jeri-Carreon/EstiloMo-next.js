import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

import { getAdminUser } from "@/lib/supabase/getUser";
import { logUserAvailabilityChanged, logUserUpdated } from "@/lib/securityLogEvents";
import {
  ASSIGNABLE_ADMIN_ROLES,
  getPrimaryRole,
  hasAnyRole,
  normalizeAdminRoles,
} from "@/lib/adminTabs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAdminUser()
    if (!hasAnyRole(adminUser, ["OWNER"])){
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params; 

    if (!id) {
      return NextResponse.json(
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const existingUser = await db.user.findUnique({
      where: { id },
      select: {
        role: true,
        roleAssignments: {
          select: {
            role: true,
          },
        },
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

    const existingRoles = normalizeAdminRoles(
      existingUser.roleAssignments.length > 0
        ? existingUser.roleAssignments.map((assignment) => assignment.role)
        : existingUser.role
    );
    const requestedRoles = normalizeAdminRoles(
      Array.isArray(body.roles) ? body.roles : body.role
    );
    const isExistingOwner = existingRoles.includes("OWNER");
    const invalidRoles = requestedRoles.filter(
      (role) =>
        !ASSIGNABLE_ADMIN_ROLES.includes(role) &&
        !(isExistingOwner && role === "OWNER")
    );

    if (requestedRoles.length === 0 || invalidRoles.length > 0) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    if (isExistingOwner && !requestedRoles.includes("OWNER")) {
      return NextResponse.json(
        { error: "Cannot change Owner role." },
        { status: 403 }
      );
    }

    const primaryRole = getPrimaryRole(requestedRoles, existingUser.role);

    const updatedUser = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { 
          id 
        },
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          mobileNumber: body.mobileNumber,
          role: primaryRole as Role,
        },
      });

      await tx.userRoleAssignment.deleteMany({
        where: { userId: id },
      });

      await tx.userRoleAssignment.createMany({
        data: requestedRoles.map((role) => ({
          userId: id,
          role,
        })),
        skipDuplicates: true,
      });

      if (requestedRoles.includes("BARBER") && !existingUser.barber) {
        const barberCounter = await tx.counter.update({
          where: { id: "barberCode" },
          data: { value: { increment: 1 } },
        });

        const barberCode = `BRB-${String(barberCounter.value).padStart(3, "0")}`;

        await tx.barber.create({
          data: {
            barberCode,
            userId: id,
            firstName: body.firstName,
            lastName: body.lastName,
            mobileNumber: body.mobileNumber,
            email: body.email,
          },
        });
      }

      return {
        ...user,
        roles: requestedRoles,
      };
    });

    await logUserUpdated(req, adminUser, `${updatedUser.firstName} ${updatedUser.lastName}`.trim());

    return NextResponse.json({ user: updatedUser });
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
    const adminUser = await getAdminUser()
    if (!hasAnyRole(adminUser, ["OWNER"])){
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
