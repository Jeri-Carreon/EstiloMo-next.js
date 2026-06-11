import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const sale = await db.sale.findUnique({
      where: {
        id,
      },
      include: {
        payment: true,
        appointments: true,
        customer: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    if (!sale.payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    if (sale.payment.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Payment already confirmed",
      });
    }

    await db.$transaction(async (tx) => {
      // Payment
      await tx.payment.update({
        where: {
          id: sale.payment!.id,
        },
        data: {
          status: "PAID",
        },
      });

      // Sale
      await tx.sale.update({
        where: {
          id: sale.id,
        },
        data: {
          status: "PAID",
        },
      });

      // Related appointments
      if (sale.appointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            saleId: sale.id,
          },
          data: {
            status: "COMPLETED",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
      saleId: sale.id,
      paymentId: sale.payment.id,
    });
  } catch (error) {
    console.error("CONFIRM PAYMENT ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to confirm payment",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}