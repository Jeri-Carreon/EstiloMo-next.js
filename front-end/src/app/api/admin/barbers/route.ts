import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireAnyAdminTabAccess,
} from "@/lib/adminAuthorization";
import { normalizeAdminRole } from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAnyAdminTabAccess(
      ["barbers", "dashboard", "appointments", "services", "sales"],
      req
    );

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    /*
     * Determine whether the logged-in user has only the BARBER role.
     *
     * This allows users with BARBER + another management role to continue
     * viewing all barbers, while barber-only accounts see themselves only.
     */
    const normalizedRoles = auth.roles
      .map((role) =>
        normalizeAdminRole(
          role.systemKey ||
            role.role ||
            role.displayName
        )
      )
      .filter(Boolean);

    const isBarberOnly =
      normalizedRoles.length > 0 &&
      normalizedRoles.every((role) => role === "BARBER");

    const barbers = await db.barber.findMany({
      where: isBarberOnly
        ? {
            userId: auth.user.id,
          }
        : undefined,

      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        schedules: {
          orderBy: {
            dayOfWeek: "desc",
          },
        },
      },

      orderBy: {
        firstName: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      barbers: barbers.map((barber) => ({
        id: barber.id,
        barberCode: barber.barberCode,

        firstName:
          barber.user?.firstName ||
          barber.firstName ||
          "",

        lastName:
          barber.user?.lastName ||
          barber.lastName ||
          "",

        name:
          `${barber.user?.firstName || barber.firstName || ""} ${
            barber.user?.lastName || barber.lastName || ""
          }`.trim() || "Unknown Barber",

        mobileNumber: barber.mobileNumber,
        email: barber.email,
        userId: barber.userId,
        isActive: barber.user?.isActive ?? false,
        schedules: barber.schedules,
      })),
    });
  } catch (error) {
    console.error("FETCH BARBERS ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch barbers",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}