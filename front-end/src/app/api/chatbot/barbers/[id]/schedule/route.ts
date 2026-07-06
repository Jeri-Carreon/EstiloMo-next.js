import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing barber id.",
        },
        { status: 400 }
      );
    }

    const today = new Date();
    const startDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
    );
    const endDate = addDays(startDate, 30);

    const barber = await db.barber.findUnique({
      where: {
        id,
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
        absence: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            date: true,
            reason: true,
          },
          orderBy: {
            date: "asc",
          },
        },
      },
    });

    if (!barber) {
      return NextResponse.json(
        {
          ok: false,
          error: "Barber not found.",
        },
        { status: 404 }
      );
    }

    if (barber.user?.isActive === false) {
      return NextResponse.json(
        {
          ok: false,
          error: "Barber is currently unavailable.",
        },
        { status: 404 }
      );
    }

    const barberName =
      [barber.user?.firstName, barber.user?.lastName]
        .filter(Boolean)
        .join(" ") ||
      [barber.firstName, barber.lastName].filter(Boolean).join(" ");

    const weeklySchedule = DAYS.map((day, index) => {
      const schedule = barber.schedules.find(
        (item) => item.dayOfWeek === index
      );

      if (!schedule || schedule.isDayOff) {
        return {
          dayOfWeek: index,
          day,
          isDayOff: true,
          startTime: null,
          endTime: null,
          label: `${day}: Day off`,
        };
      }

      const startLabel = minutesToTime(schedule.startTime);
      const endLabel = minutesToTime(schedule.endTime);

      return {
        dayOfWeek: index,
        day,
        isDayOff: false,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        startLabel,
        endLabel,
        label: `${day}: ${startLabel} - ${endLabel}`,
      };
    });

    const absences = barber.absence.map((absence) => ({
      date: toDateKey(absence.date),
      reason: absence.reason || null,
      label: `${toDateKey(absence.date)}${
        absence.reason ? ` - ${absence.reason}` : ""
      }`,
    }));

    const scheduleText = weeklySchedule.map((item) => item.label).join("\n");
    const absenceText =
      absences.length > 0
        ? absences.map((item) => item.label).join("\n")
        : "No listed absences for the next 30 days.";

    return NextResponse.json({
      ok: true,
      barber: {
        id: barber.id,
        name: barberName,
        isActive: barber.user?.isActive ?? true,
      },
      weeklySchedule,
      absences,
      responseText:
        `${barberName} schedule:\n\n` +
        `${scheduleText}\n\n` +
        `Absences:\n${absenceText}`,
    });
  } catch (error) {
    console.error("CHATBOT FETCH BARBER SCHEDULE ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch barber schedule.",
      },
      { status: 500 }
    );
  }
}