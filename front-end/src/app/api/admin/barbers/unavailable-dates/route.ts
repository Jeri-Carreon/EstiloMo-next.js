import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DateTime } from "luxon";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId");
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (!barberId || !year || !month) {
      return NextResponse.json(
        { ok: false, message: "Missing barberId, year, or month" },
        { status: 400 }
      );
    }

    const settings = await db.appointmentSetting.findFirst();
    const bookingCutoffHours = settings?.bookingCutoffHours ?? 1;

    const service = serviceId
      ? await db.service.findUnique({
          where: { id: serviceId },
          select: { durationMinutes: true },
        })
      : null;

    const serviceDuration = service?.durationMinutes ?? 0;

    const monthStartPH = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: "Asia/Manila" }
    ).startOf("month");

    const monthEndPH = monthStartPH.endOf("month");

    const startOfMonth = monthStartPH.toUTC().toJSDate();
    const endOfMonth = monthEndPH.toUTC().toJSDate();

    const absences = await db.barberAbsent.findMany({
      where: {
        barberId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { date: true },
    });

    const schedules = await db.barberSchedule.findMany({
      where: { barberId },
      select: {
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isDayOff: true,
      },
    });

    const appointments = await db.appointment.findMany({
      where: {
        barberId,
        appointmentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: {
          in: ["PENDING", "SCHEDULED"],
        },
      },
      select: {
        appointmentDate: true,
        startMinutes: true,
        endMinutes: true,
      },
    });

    const unavailableSet = new Set<string>();

    for (const absence of absences) {
      unavailableSet.add(
        DateTime.fromJSDate(absence.date)
          .setZone("Asia/Manila")
          .toFormat("yyyy-MM-dd")
      );
    }

    const nowPH = DateTime.now().setZone("Asia/Manila");
    const cutoffPH = nowPH.plus({ hours: bookingCutoffHours });

    for (let day = 1; day <= monthEndPH.day; day++) {
      const datePH = DateTime.fromObject(
        { year, month, day },
        { zone: "Asia/Manila" }
      );

      const dateKey = datePH.toFormat("yyyy-MM-dd");
      const dayOfWeek = datePH.weekday % 7;

      if (unavailableSet.has(dateKey)) continue;

      const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

      if (!schedule || schedule.isDayOff) {
        unavailableSet.add(dateKey);
        continue;
      }

      if (!serviceId || serviceDuration <= 0) {
        continue;
      }

      let hasAvailableSlot = false;

      for (
        let start = schedule.startTime;
        start + serviceDuration <= schedule.endTime;
        start += 30
      ) {
        const end = start + serviceDuration;

        const slotDateTimePH = datePH.startOf("day").plus({ minutes: start });

        if (slotDateTimePH < cutoffPH) {
          continue;
        }

        const hasConflict = appointments.some((appointment) => {
          const appointmentDateKey = DateTime.fromJSDate(
            appointment.appointmentDate
          )
            .setZone("Asia/Manila")
            .toFormat("yyyy-MM-dd");

          if (appointmentDateKey !== dateKey) return false;

          return (
            start < appointment.endMinutes &&
            end > appointment.startMinutes
          );
        });

        if (!hasConflict) {
          hasAvailableSlot = true;
          break;
        }
      }

      if (!hasAvailableSlot) {
        unavailableSet.add(dateKey);
      }
    }

    return NextResponse.json({
      ok: true,
      unavailableDates: Array.from(unavailableSet),
    });
  } catch (error) {
    console.error("UNAVAILABLE DATES ERROR:", error);

    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}