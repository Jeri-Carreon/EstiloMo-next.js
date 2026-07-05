import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EXPIRE_AFTER_MINUTES = Number(
  process.env.PENDING_CHECKOUT_EXPIRATION_MINUTES || 5
);

async function cleanupExpiredBookings() {
  const cutoff = new Date(
    Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000
  );

  const expiredPayments = await db.payment.findMany({
    where: {
      status: "PENDING",
      paymongoCheckoutSessionId: {
        not: null,
      },
      createdAt: {
        lt: cutoff,
      },
      saleId: {
        not: null,
      },
    },
    select: {
      id: true,
      saleId: true,
    },
  });

  const saleIds = expiredPayments
    .map((payment) => payment.saleId)
    .filter(Boolean) as string[];

  if (saleIds.length === 0) {
    return;
  }

  await db.$transaction([
    db.payment.updateMany({
      where: {
        id: {
          in: expiredPayments.map((p) => p.id),
        },
      },
      data: {
        status: "REJECTED",
      },
    }),

    db.sale.updateMany({
      where: {
        id: {
          in: saleIds,
        },
      },
      data: {
        status: "CANCELLED",
        downPaymentStatus: "EXPIRED",
        cancelReason: "PayMongo checkout expired",
      },
    }),

    db.appointment.updateMany({
      where: {
        saleId: {
          in: saleIds,
        },
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
      },
    }),
  ]);
}

export async function GET() {
  try {
    await cleanupExpiredBookings();

    const barbers = await db.barber.findMany({
      where: {
        user: {
          isActive: true,
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const result = barbers.map((barber) => ({
      id: barber.id,
      name:
        [barber.firstName, barber.lastName]
          .filter(Boolean)
          .join(" ") ||
        barber.email ||
        "Unknown",
    }));

    return NextResponse.json({
      barbers: result,
    });
  } catch (error) {
    console.error("GET BARBERS ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch barbers",
      },
      {
        status: 500,
      }
    );
  }
}