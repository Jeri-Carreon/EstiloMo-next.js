import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { DateTime } from 'luxon';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const barberId = searchParams.get('barberId');
    const year = parseInt(searchParams.get('year')!);
    const month = parseInt(searchParams.get('month')!); // 1-indexed

    if (!barberId || !year || !month) {
      return NextResponse.json(
        { ok: false, message: 'Missing barberId, year, or month' },
        { status: 400 }
      );
    }

    // First and last day of the month
    // Fix 1: month range in PH timezone
    const startOfMonth = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: 'Asia/Manila' }
    ).startOf('month').toUTC().toJSDate();

    const endOfMonth = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: 'Asia/Manila' }
    ).endOf('month').toUTC().toJSDate();

    // GET ALL ABSENCES FOR THE MONTH
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
    
    // GET ALL DAY-OFF SCHEDULES FOR THIS BARBER
    const dayOffSchedules = await db.barberSchedule.findMany({
      where: {
        barberId,
        isDayOff: true,
      },
      select: { dayOfWeek: true },
    });

    const dayOffSet = new Set(
      dayOffSchedules.map((s) => s.dayOfWeek)
    );

    // BUILD LIST OF UNAVAILABLE DATES
    const unavailableDates: string[] = [];

    // Fix 2: format absence dates in PH timezone
    for (const absence of absences) {
      const formatted = DateTime.fromJSDate(absence.date)
        .setZone('Asia/Manila')
        .toFormat('yyyy-MM-dd');

      unavailableDates.push(formatted);
    }

    // Add all dates in the month that fall on a day-off weekday
    const totalDays = endOfMonth.getDate();

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (dayOffSet.has(dayOfWeek)) {
        const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Avoid duplicates (e.g. absent AND day off)
        if (!unavailableDates.includes(formatted)) {
          unavailableDates.push(formatted);
        }
      }
    }

    return NextResponse.json({ ok: true, unavailableDates });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}