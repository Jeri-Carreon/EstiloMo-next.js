import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { createClient } from "@/lib/supabase/server";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const appointment = await db.appointment.findUnique({
      where: {
        id,
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        barber: true,
        service: true,
        payment: true,
        sale: {
          include: {
            payment: true,
            items: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const customerEmail =
      appointment.customer?.email ||
      appointment.customer?.user?.email;

    if (customerEmail !== user.email) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const services =
      appointment.sale?.items?.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service.name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.subtotal),
      })) ?? [
        {
          id: appointment.service.id,
          serviceId: appointment.service.id,
          serviceName: appointment.service.name,
          quantity: 1,
          price: Number(appointment.service.price),
          subtotal: Number(appointment.service.price),
        },
      ];

    return NextResponse.json({
      id: appointment.id,
      appointmentCode: appointment.appointmentCode,
      saleCode: appointment.sale?.saleCode ?? null,
      appointmentDate: appointment.appointmentDate,
      schedule: `${minutesToTime(
        appointment.startMinutes
      )} - ${minutesToTime(appointment.endMinutes)}`,
      status: appointment.status,

      barber: appointment.barber,
      service: appointment.service,

      services,

      subtotal: Number(
        appointment.sale?.subtotal ??
          appointment.service.price
      ),

      discount: Number(
        appointment.sale?.discount ?? 0
      ),

      totalAmount: Number(
        appointment.sale?.totalAmount ??
          appointment.service.price
      ),

      payment:
        appointment.sale?.payment ??
        appointment.payment,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to load appointment",
      },
      {
        status: 500,
      }
    );
  }
}