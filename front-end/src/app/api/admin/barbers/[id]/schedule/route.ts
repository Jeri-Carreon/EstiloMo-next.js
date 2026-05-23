import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function POST(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const body = await req.json();

    const { schedules } = body;

    const { id } = await context.params;

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

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      }
    );
  }
}