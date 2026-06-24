import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
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
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const customerEmail =
      appointment.customer?.email || appointment.customer?.user?.email;

    if (customerEmail !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentStatus = appointment.status?.toUpperCase();

    if (!["PENDING", "SCHEDULED"].includes(currentStatus)) {
      return NextResponse.json(
        { error: "This appointment cannot be cancelled" },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      if (appointment.saleId) {
        await tx.appointment.updateMany({
          where: {
            saleId: appointment.saleId,
            customerId: appointment.customerId,
            status: { in: ["PENDING", "SCHEDULED"] },
          },
          data: { status: "CANCELLED" },
        });

        await tx.sale.update({
          where: { id: appointment.saleId },
          data: {
            status: "CANCELLED",
            cancelReason: "Customer cancelled appointment",
          },
        });

        return tx.appointment.findMany({
          where: { saleId: appointment.saleId },
        });
      }

      const updated = await tx.appointment.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return [updated];
    });

    return NextResponse.json({ ok: true, appointments: result });
  } catch (error) {
    console.error("CUSTOMER CANCEL APPOINTMENT ERROR:", error);
    return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 });
  }
}