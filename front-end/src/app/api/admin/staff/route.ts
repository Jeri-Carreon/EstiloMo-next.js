import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireAnyAdminTabAccess,
} from "@/lib/adminAuthorization";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAnyAdminTabAccess(["services", "user-management"]);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const staff = await db.barber.findMany({
      where: {
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        {
          user: {
            firstName: "asc",
          },
        },
        {
          user: {
            lastName: "asc",
          },
        },
      ],
    });

    return NextResponse.json({
      staff: staff.map((b) => ({
        id: b.id,
        name: `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim(),
        isActive: b.user?.isActive ?? true,
      })),
    });
  } catch (error) {
    console.error("LOAD STAFF ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 }
    );
  }
}
