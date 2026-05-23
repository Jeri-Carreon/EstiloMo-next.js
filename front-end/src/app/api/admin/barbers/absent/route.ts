import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// normalize YYYY-MM-DD safely
function toDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// POST = create absence
export async function POST(req: Request) {
  try {
    const { barberId, date } = await req.json();

    if (!barberId || !date) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const normalized = toDate(date);

    const exists = await db.barberAbsent.findFirst({
      where: {
        barberId,
        date: normalized,
      },
    });

    if (!exists) {
      await db.barberAbsent.create({
        data: {
          barberId,
          date: normalized,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// DELETE = remove absence
export async function DELETE(req: Request) {
  try {
    const { barberId, date } = await req.json();

    if (!barberId || !date) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const normalized = toDate(date);

    await db.barberAbsent.deleteMany({
      where: {
        barberId,
        date: normalized,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}