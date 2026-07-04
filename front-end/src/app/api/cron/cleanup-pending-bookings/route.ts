import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expirationMinutes = Number(
    process.env.PENDING_CHECKOUT_EXPIRATION_MINUTES || "30"
  );
  const cutoff = new Date(Date.now() - expirationMinutes * 60 * 1000);

  const result = await db.$transaction(async (tx) => {
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: cutoff,
        },
      },
      data: {
        status: "REJECTED",
      },
    });

    const saleUpdate = await tx.sale.updateMany({
      where: {
        status: "PENDING",
        payment: {
          some: {
            status: "REJECTED",
            createdAt: {
              lt: cutoff,
            },
          },
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    const appointmentUpdate = await tx.appointment.updateMany({
      where: {
        status: "PENDING",
        sale: {
          status: "PENDING",
          payment: {
            some: {
              status: "REJECTED",
              createdAt: {
                lt: cutoff,
              },
            },
          },
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    return {
      cancelledPayments: paymentUpdate.count,
      cancelledSales: saleUpdate.count,
      cancelledAppointments: appointmentUpdate.count,
    };
  });

  return NextResponse.json({
    ok: true,
    cutoff: cutoff.toISOString(),
    expirationMinutes,
    ...result,
  });
}
