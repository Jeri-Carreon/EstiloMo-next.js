import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type CancelReason = "PARTIAL" | "CANCELLED" | "REFUNDED";
type AppointmentCancelStatus = "CANCELLED" | "NOSHOW";

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

    const reason = body.reason as CancelReason | undefined;
    const appointmentStatus = body.appointmentStatus as
      | AppointmentCancelStatus
      | undefined;

    if (!reason || !["PARTIAL", "CANCELLED", "REFUNDED"].includes(reason)) {
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

    if (sale.source === "WALKIN" && reason === "PARTIAL") {
      return NextResponse.json(
        { error: "PARTIAL is only allowed for appointment bookings" },
        { status: 400 }
      );
    }

    if (sale.source === "BOOKING" && reason === "CANCELLED") {
      return NextResponse.json(
        { error: "Use PARTIAL for cancelled/no-show appointment bookings" },
        { status: 400 }
      );
    }

    if (
      sale.source === "BOOKING" &&
      reason === "PARTIAL" &&
      !["CANCELLED", "NOSHOW"].includes(appointmentStatus || "")
    ) {
      return NextResponse.json(
        { error: "Appointment status must be CANCELLED or NOSHOW" },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: {
          status: reason,
          cancelReason:
            reason === "PARTIAL"
              ? `PARTIAL_${appointmentStatus}`
              : reason,
        },
      });

      if (sale.payment) {
        await tx.payment.update({
          where: { id: sale.payment.id },
          data: {
            status: sale.payment.status,
          },
        });
      }

      if (sale.appointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            saleId: id,
          },
          data: {
            status:
              reason === "PARTIAL"
                ? appointmentStatus
                : "CANCELLED",
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Transaction cancellation status updated",
      status: reason,
      appointmentStatus:
        reason === "PARTIAL" ? appointmentStatus : "CANCELLED",
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