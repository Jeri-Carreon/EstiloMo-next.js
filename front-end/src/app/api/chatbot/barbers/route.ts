import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function GET() {
  try {
    const barbers = await db.barber.findMany({
      where: {
        user: {
          isActive: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        schedules: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isDayOff: true,
          },
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      barbers: barbers.map((barber) => ({
        id: barber.id,
        name:
          [barber.user?.firstName, barber.user?.lastName]
            .filter(Boolean)
            .join(" ") ||
          [barber.firstName, barber.lastName].filter(Boolean).join(" "),
        isActive: barber.user?.isActive ?? true,
        schedules: barber.schedules.map((schedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isDayOff: schedule.isDayOff,
          startLabel: minutesToTime(schedule.startTime),
          endLabel: minutesToTime(schedule.endTime),
        })),
      })),
    });
  } catch (error) {
    console.error("CHATBOT FETCH BARBERS ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch barbers.",
      },
      {
        status: 500,
      }
    );
  }
}
