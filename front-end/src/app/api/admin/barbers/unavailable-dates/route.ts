import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DateTime } from "luxon";
import {
  generateAvailableTimes,
  PH_TIME_ZONE,
  resolveCandidateIntervalMinutes,
} from "@/lib/appointmentAvailability";

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
    const candidateIntervalMinutes = resolveCandidateIntervalMinutes(
      searchParams.get("intervalMinutes")
    );

    const service = serviceId
      ? await db.service.findUnique({
          where: { id: serviceId },
          select: { durationMinutes: true },
        })
      : null;

    if (serviceId && !service) {
      return NextResponse.json(
        { ok: false, message: "Service not found" },
        { status: 404 }
      );
    }

    const serviceDuration = service?.durationMinutes ?? 0;

    const monthStartPH = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: PH_TIME_ZONE }
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

    const appointmentsByDate = new Map<
      string,
      { startMinutes: number; endMinutes: number }[]
    >();

    for (const appointment of appointments) {
      const dateKey = DateTime.fromJSDate(appointment.appointmentDate)
        .setZone(PH_TIME_ZONE)
        .toFormat("yyyy-MM-dd");
      const dateAppointments = appointmentsByDate.get(dateKey) ?? [];

      dateAppointments.push({
        startMinutes: appointment.startMinutes,
        endMinutes: appointment.endMinutes,
      });
      appointmentsByDate.set(dateKey, dateAppointments);
    }

    const unavailableSet = new Set<string>();

    for (const absence of absences) {
      unavailableSet.add(
        DateTime.fromJSDate(absence.date)
          .setZone(PH_TIME_ZONE)
          .toFormat("yyyy-MM-dd")
      );
    }

    const cutoffPH = DateTime.now()
      .setZone(PH_TIME_ZONE)
      .plus({ hours: bookingCutoffHours });

    for (let day = 1; day <= monthEndPH.day; day++) {
      const datePH = DateTime.fromObject(
        { year, month, day },
        { zone: PH_TIME_ZONE }
      );

      const dateKey = datePH.toFormat("yyyy-MM-dd");
      const dayOfWeek = datePH.weekday % 7;

      if (unavailableSet.has(dateKey)) continue;

      const schedule = schedules.find((item) => item.dayOfWeek === dayOfWeek);

      if (!schedule || schedule.isDayOff) {
        unavailableSet.add(dateKey);
        continue;
      }

      if (!serviceId || serviceDuration <= 0) {
        continue;
      }

      const availableTimes = generateAvailableTimes({
        workingStartMinutes: schedule.startTime,
        workingEndMinutes: schedule.endTime,
        serviceDurationMinutes: serviceDuration,
        candidateIntervalMinutes,
        busyRanges: appointmentsByDate.get(dateKey) ?? [],
        isStartAllowed: (startMinutes) =>
          datePH.startOf("day").plus({ minutes: startMinutes }) >= cutoffPH,
      });

      if (availableTimes.length === 0) {
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
