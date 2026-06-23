import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { DateTime } from 'luxon';

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

    const targetDate = DateTime.fromISO(date, { zone: 'Asia/Manila' });
    const dayOfWeek = targetDate.weekday % 7; // luxon: 1=Mon, 7=Sun → convert to JS 0=Sun
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
    const startOfDay = targetDate.startOf('day').toUTC().toJSDate();
    const endOfDay = targetDate.endOf('day').toUTC().toJSDate();

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

    // GET BLOCKED SLOTS FROM CART — move this BEFORE the loop
const blockedSlotsParam = searchParams.get('blockedSlots');
const blockedSlots = blockedSlotsParam
  ? blockedSlotsParam.split(',').map(slot => {
      const [start, end] = slot.split('-').map(Number);
      return { startMinutes: start, endMinutes: end };
    })
  : [];

// GENERATE AVAILABLE SLOTS
const availableTimes = [];
const duration = service.durationMinutes;

const nowPH = DateTime.now().setZone('Asia/Manila');

// fetch from DB instead of hardcoding
const setting = await db.appointmentSetting.findFirst();
const bufferMinutes = (setting?.bookingCutoffHours ?? 1) * 60;

// These stay OUTSIDE the loop (calculated once)
const nowTotalMinutes = nowPH.hour * 60 + nowPH.minute;
const targetIsToday = targetDate.hasSame(nowPH, 'day');
const targetIsTomorrow = targetDate.hasSame(nowPH.plus({ days: 1 }), 'day');

// PER MINUTE LITERALLY 
// for (let start = schedule.startTime; start <= schedule.endTime - duration; start += 1)
for (
  let start = schedule.startTime;
  start + duration <= schedule.endTime;
  start += duration
) {
  const end = start + duration;

  // NEW: absolute buffer check (replaces old isToday checks)
  const absoluteSlotMinutes = targetIsToday
    ? start
    : targetIsTomorrow
    ? start + 1440
    : Infinity;

  if (absoluteSlotMinutes < nowTotalMinutes + bufferMinutes) {
    continue;
  }

  // CHECK OVERLAP
  const overlaps =
    appointments.some(
      (appointment) =>
        start < appointment.endMinutes &&
        end > appointment.startMinutes
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