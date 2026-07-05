import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EXPIRE_AFTER_MINUTES = Number(
  process.env.PENDING_CHECKOUT_EXPIRATION_MINUTES || 5
);

export async function POST() {
  try {
    const cutoff = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60 * 1000);

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
      return NextResponse.json({
        ok: true,
        expired: 0,
      });
    }

    await db.$transaction([
      db.payment.updateMany({
        where: {
          id: {
            in: expiredPayments.map((payment) => payment.id),
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

    return NextResponse.json({
      ok: true,
      expired: saleIds.length,
      saleIds,
    });
  } catch (error) {
    console.error("expire-pending error:", error);

    return NextResponse.json(
      { error: "Failed to expire pending payments" },
      { status: 500 }
    );
  }
}