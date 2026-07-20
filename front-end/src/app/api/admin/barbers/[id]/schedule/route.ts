import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";
import { logScheduleUpdated } from "@/lib/securityLogEvents";

export async function POST(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user = await getAdminUser();

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { schedules } = body;
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing barber id" },
        { status: 400 }
      );
    }

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "Schedules must be an array" },
        { status: 400 }
      );
    }

    const barber = await db.barber.findUnique({
      where: { id },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    if (!barber) {
      return NextResponse.json(
        { error: "Barber not found" },
        { status: 404 }
      );
    }

    for (const schedule of schedules) {
      await db.barberSchedule.upsert({
        where: {
          barberId_dayOfWeek: {
            barberId: id,
            dayOfWeek: schedule.dayOfWeek,
          },
        },
        update: {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isDayOff: schedule.isDayOff,
        },
        create: {
          barberId: id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isDayOff: schedule.isDayOff,
        },
      });
    }

    await logScheduleUpdated(
      req,
      user,
      `${barber.firstName} ${barber.lastName}`
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("UPDATE BARBER AVAILABILITY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update barber availability" },
      { status: 500 }
    );
  }
}
