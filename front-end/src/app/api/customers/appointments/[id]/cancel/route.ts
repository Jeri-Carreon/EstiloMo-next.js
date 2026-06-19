import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const appointment = await db.appointment.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        sale: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const customerEmail =
      appointment.customer?.email || appointment.customer?.user?.email;

    if (customerEmail !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentStatus = appointment.status?.toUpperCase();

    if (!["PENDING", "SCHEDULED"].includes(currentStatus)) {
      return NextResponse.json(
        { error: "This appointment cannot be cancelled" },
        { status: 400 }
      );
    }

    const updatedAppointment = await db.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
      });

      if (appointment.saleId) {
        await tx.sale.update({
          where: {
            id: appointment.saleId,
          },
          data: {
            status: "PARTIAL",
            cancelReason: "Customer cancelled appointment",
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      ok: true,
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("CUSTOMER CANCEL APPOINTMENT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}
