import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const barbers = await db.barber.findMany({
      include: {
        schedules: {
          orderBy: {
            dayOfWeek: 'desc',
          },
        },
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    return NextResponse.json({
      ok: true,
      barbers,
    });
  } catch (error) {
    console.error('FETCH BARBERS ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch barbers',
      },
      { status: 500 }
    );
  }
}
