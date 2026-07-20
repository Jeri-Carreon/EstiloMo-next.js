import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

export const dynamic = "force-dynamic";

import {
  logBarberAbsent,
  logBarberAvailable,
} from "@/lib/securityLogEvents";

function toDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminTabAccess("barbers", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

    const { barberId, date } = await req.json();

    if (!barberId || !date) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const normalized = toDate(date);

    const barber = await db.barber.findUnique({
      where: { id: barberId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    if (!barber) {
      return NextResponse.json(
        { ok: false, error: "Barber not found" },
        { status: 404 }
      );
    }

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

      await logBarberAbsent(
        req,
        user,
        `${barber.firstName} ${barber.lastName}`,
        date
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("CREATE BARBER ABSENT ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireAdminTabAccess("barbers");

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const absents = await db.barberAbsent.findMany({
      select: {
        id: true,
        barberId: true,
        date: true,
        reason: true,
      },
    });

    return NextResponse.json(
      absents.map((a) => ({
        ...a,
        date: a.date.toISOString().slice(0, 10),
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminTabAccess("barbers", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

    const { barberId, date } = await req.json();

    if (!barberId || !date) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const normalized = toDate(date);

    const barber = await db.barber.findUnique({
      where: { id: barberId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    if (!barber) {
      return NextResponse.json(
        { ok: false, error: "Barber not found" },
        { status: 404 }
      );
    }

    await db.barberAbsent.deleteMany({
      where: {
        barberId,
        date: normalized,
      },
    });

    await logBarberAvailable(
      req,
      user,
      `${barber.firstName} ${barber.lastName}`,
      date
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE BARBER ABSENT ERROR:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
