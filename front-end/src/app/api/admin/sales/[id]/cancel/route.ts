import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type CancelReason = "CANCELLED" | "REFUNDED";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const reason = body.reason as CancelReason;

    if (!["CANCELLED", "REFUNDED"].includes(reason)) {
      return NextResponse.json(
        { error: "Invalid cancellation reason" },
        { status: 400 }
      );
    }

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        appointments: true,
        payment: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status === "PAID") {
      return NextResponse.json(
        { error: "Paid transactions cannot be cancelled here" },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: {
          status: reason,
          cancelReason: reason,
        },
      });

      if (reason === "REFUNDED" && sale.payment) {
        await tx.payment.update({
          where: { id: sale.payment.id },
          data: {
            status: "REJECTED",
          },
        });
      }

      if (sale.appointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            saleId: id,
          },
          data: {
            status: "CANCELLED",
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Transaction cancellation status updated",
      status: reason,
    });
  } catch (error) {
    console.error("CANCEL SALE ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to cancel transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}