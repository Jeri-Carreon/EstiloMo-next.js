import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const barbers = await db.barber.findMany({
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
        firstName: barber.user?.firstName || barber.firstName || "",
        lastName: barber.user?.lastName || barber.lastName || "",
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
      },
      { status: 500 }
    );
  }
}