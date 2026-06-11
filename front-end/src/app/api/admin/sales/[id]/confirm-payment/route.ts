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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        appointment: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: {
          status: "PAID",
        },
      });

      await tx.appointment.update({
        where: {
          id: payment.appointmentId,
        },
        data: {
          status: "COMPLETED",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
    });
  } catch (error) {
    console.error("CONFIRM PAYMENT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}