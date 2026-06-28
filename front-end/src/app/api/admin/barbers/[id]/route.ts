import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

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
    const dbUser = await getAdminUser();

    if (
      !dbUser ||
      !["OWNER", "RECEPTIONIST", "BARBER"].includes(dbUser.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing barber id" },
        { status: 400 }
      );
    }

    const appointments = await db.appointment.findMany({
      where: {
        barberId: id,
      },
      include: {
        customer: true,
        barber: true,
        service: true,
        payment: true,
        afterServicePhotos: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [
        {
          appointmentDate: "desc",
        },
        {
          startMinutes: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const result = appointments.map((appointment) => ({
      id: appointment.id,
      appointmentCode: appointment.appointmentCode,
      customerId: appointment.customerId,
      barberId: appointment.barberId,
      serviceId: appointment.serviceId,
      appointmentDate: appointment.appointmentDate,
      startMinutes: appointment.startMinutes,
      endMinutes: appointment.endMinutes,

      customer: {
        id: appointment.customer.id,
        customerCode: appointment.customer.customerCode,
        name: [appointment.customer.firstName, appointment.customer.lastName]
          .filter(Boolean)
          .join(" "),
      },

      schedule: {
        date: appointment.appointmentDate.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        }),
        startTime: minutesToTime(appointment.startMinutes),
        endTime: minutesToTime(appointment.endMinutes),
        formatted: `${appointment.appointmentDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })} ${minutesToTime(appointment.startMinutes)} - ${minutesToTime(
          appointment.endMinutes
        )}`,
      },

      service: {
        id: appointment.service.id,
        name: appointment.service.name,
      },

      barber: {
        id: appointment.barber.id,
        name: [appointment.barber.firstName, appointment.barber.lastName]
          .filter(Boolean)
          .join(" "),
      },

      payment: {
        id: appointment.payment?.id || null,
        amount: appointment.payment?.amount ?? appointment.service.price ?? 0,
        downPayment: appointment.payment?.downPayment ?? 150,
        method: appointment.payment?.method || "GCASH",
        screenshotUrl: appointment.payment?.screenshotUrl || null,
        proofUrl: appointment.payment?.screenshotUrl || null,
      },

      afterServicePhotos: appointment.afterServicePhotos || [],
      afterServicePhotoUrl:
        appointment.afterServicePhotos?.[0]?.imageUrl || null,

      status: appointment.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("FETCH BARBER APPOINTMENTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch barber appointments",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}