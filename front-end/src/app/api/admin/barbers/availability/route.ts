import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

function formatMinutes(
  minutes: number
) {
  const hour24 = Math.floor(
    minutes / 60
  );

  const mins = minutes % 60;

  const suffix =
    hour24 >= 12 ? 'PM' : 'AM';

  const hour12 =
    hour24 % 12 || 12;

  return `${hour12}:${mins
    .toString()
    .padStart(2, '0')}${suffix}`;
}

export async function GET(
  req: Request
) {
  try {
    const { searchParams } =
      new URL(req.url);

    const barberId =
      searchParams.get('barberId');

    const serviceId =
      searchParams.get('serviceId');

    const date =
      searchParams.get('date');

    if (
      !barberId ||
      !serviceId ||
      !date
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Missing barberId, serviceId, or date',
        },
        {
          status: 400,
        }
      );
    }

    const targetDate =
      new Date(date);

    const dayOfWeek =
      targetDate.getDay();

    // GET BARBER SCHEDULE
    const schedule =
      await db.barberSchedule.findUnique({
        where: {
          barberId_dayOfWeek: {
            barberId,
            dayOfWeek,
          },
        },
      });

    // CHECK BARBER ABSENCE
    const startOfDay = new Date(
      targetDate
    );

    startOfDay.setHours(
      0,
      0,
      0,
      0
    );

    const endOfDay = new Date(
      targetDate
    );

    endOfDay.setHours(
      23,
      59,
      59,
      999
    );

    const absence =
      await db.barberAbsent.findFirst({
        where: {
          barberId,

          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

    const isDisabledDay =
      !schedule ||
      schedule.isDayOff ||
      !!absence;

    if (isDisabledDay) {
        return NextResponse.json({
          ok: true,
          availableTimes: [],
          isDisabledDay: true,
        });
    }
    // GET SERVICE
    const service =
      await db.service.findUnique({
        where: {
          id: serviceId,
        },
      });

    if (!service) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Service not found',
        },
        {
          status: 404,
        }
      );
    }

    // GET APPOINTMENTS
    const appointments =
      await db.appointment.findMany({
        where: {
          barberId,

          appointmentDate: {
            gte: startOfDay,
            lte: endOfDay,
          },

          status: {
            in: [
              'PENDING',
              'SCHEDULED',
            ],
          },
        },

        select: {
          startMinutes: true,
          endMinutes: true,
        },
      });

    // GENERATE AVAILABLE SLOTS
    const availableTimes = [];

    const duration = service.durationMinutes;

    const now = new Date();
    const isToday =
      targetDate.getFullYear() === now.getFullYear() &&
      targetDate.getMonth() === now.getMonth() &&
      targetDate.getDate() === now.getDate();
    
    const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

    const bufferMinutes = 60; // 1 HOUR BUFFER

    // GET BLOCKED SLOTS FROM CART
      const blockedSlotsParam = searchParams.get('blockedSlots');
      
      const blockedSlots = blockedSlotsParam
        ? blockedSlotsParam.split(',').map(slot => {
            const [start, end] = slot.split('-').map(Number);
            return { startMinutes: start, endMinutes: end };
          })
        : [];

    for (
      let start = schedule.startTime;
      start + duration <= schedule.endTime;
      start += duration
    ) {
      const end = start + duration;
    
      // SKIPS PAST TIMES
      if (isToday && start <= currentMinutes) {
        continue;
      }

      // SKIPS TIMES WITHIN BUFFER
      if (isToday && start < currentMinutes + bufferMinutes) {
        continue;
      }

      // CHECK OVERLAP
      const overlaps =
        appointments.some(
          (appointment) =>
            start <
              appointment.endMinutes &&
            end >
              appointment.startMinutes
        ) ||
        blockedSlots.some(
          (blocked) =>
            start < blocked.endMinutes &&
            end > blocked.startMinutes
        );

      if (overlaps) {
        continue;
      }

      
      availableTimes.push({
        startMinutes: start,
        endMinutes: end,
        label: `${formatMinutes(start)} - ${formatMinutes(end)}`,
      });
    }

    return NextResponse.json({
      ok: true,
      availableTimes,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        message:
          'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}