import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { logAppointmentCreated } from "@/lib/securityLogEvents";
import { parsePHDateOnly } from "@/lib/dateUtils";
import { ensureSingleAppointmentSetting } from "@/lib/appointmentSettings";
import { createUniqueCode } from "@/lib/createCode";

export const dynamic = "force-dynamic";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appointments = await db.appointment.findMany({
      include: {
        barber: true,
        customer: true,
        payment: true,
        service: true,
        sale: { include: { payment: true } },
        afterServicePhotos: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [
        { appointmentDate: "desc" },
        { startMinutes: "desc" },
        { createdAt: "desc" },
      ],
    });

    const result = appointments.map((a) => {
      const payment = a.payment || a.sale?.payment || null;
      const appointmentDate = new Date(a.appointmentDate);

      return {
        id: a.id,
        appointmentCode: a.appointmentCode,
        customerId: a.customerId,
        barberId: a.barberId,
        serviceId: a.serviceId,
        appointmentDate,
        startMinutes: a.startMinutes,
        endMinutes: a.endMinutes,

        customer: a.customer
          ? {
              id: a.customer.id,
              customerCode: a.customer.customerCode,
              name: `${a.customer.firstName ?? ""} ${
                a.customer.lastName ?? ""
              }`.trim(),
            }
          : null,

        barber: a.barber
          ? {
              id: a.barber.id,
              name: `${a.barber.firstName ?? ""} ${
                a.barber.lastName ?? ""
              }`.trim(),
            }
          : null,

        service: a.service
          ? {
              id: a.service.id,
              name: a.service.name,
            }
          : null,

        schedule: {
          formatted: `${appointmentDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })} ${minutesToTime(a.startMinutes)} - ${minutesToTime(
            a.endMinutes
          )}`,
          date: appointmentDate.toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          }),
          startTime: minutesToTime(a.startMinutes),
          endTime: minutesToTime(a.endMinutes),
        },

        payment: {
          id: payment?.id ?? null,
          amount: Number(a.service?.price ?? 0),
          saleAmount: Number(
            payment?.amount ?? a.sale?.totalAmount ?? a.service?.price ?? 0
          ),
          downPayment: Number(payment?.downPayment ?? 0),
          method: payment?.method ?? "GCASH",
          status: payment?.status ?? "PENDING",
          screenshotUrl: payment?.screenshotUrl ?? null,
        },

        afterServicePhotos: a.afterServicePhotos ?? [],
        afterServicePhotoUrl: a.afterServicePhotos?.[0]?.imageUrl ?? null,
        status: a.status,
      };
    });

    const settings = await ensureSingleAppointmentSetting();

    return NextResponse.json({ appointments: result, settings });
  } catch (error) {
    console.error("Error fetching appointments:", error);

    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST", "BARBER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const {
      customerId,
      barberId,
      serviceId,
      appointmentDate,
      startMinutes,
      endMinutes,
      paymentScreenshotUrl,
      downPayment = 150,
    } = body;

    if (
      !customerId ||
      !barberId ||
      !serviceId ||
      !appointmentDate ||
      startMinutes === undefined ||
      endMinutes === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const start = Number(startMinutes);
    const end = Number(endMinutes);

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return NextResponse.json(
        { error: "Invalid appointment time" },
        { status: 400 }
      );
    }

    const service = await db.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const result = await db.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          appointmentCode: await createUniqueCode("APT"),
          customerId,
          barberId,
          serviceId,
          appointmentDate: parsePHDateOnly(appointmentDate),
          startMinutes: start,
          endMinutes: end,
          source: "BOOKING",
          status: "SCHEDULED",
        },
      });

      const sale = await tx.sale.create({
        data: {
          saleCode: await createUniqueCode("TRX"),
          customerId,
          barberId,
          source: "BOOKING",
          status: "PENDING",
          subtotal: Number(service.price),
          discount: 0,
          totalAmount: Number(service.price),
        },
      });

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          serviceId,
          quantity: 1,
          price: Number(service.price),
          subtotal: Number(service.price),
        },
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: { saleId: sale.id },
      });

      await tx.payment.create({
        data: {
          saleId: sale.id,
          paymentCode: await createUniqueCode("PAY"),
          amount: Number(service.price),
          downPayment: Number(downPayment || 0),
          method: "GCASH",
          status: "PENDING",
          screenshotUrl: paymentScreenshotUrl ?? null,
        },
      });

      return tx.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          customer: true,
          barber: true,
          service: true,
          payment: true,
          sale: true,
          afterServicePhotos: {
            orderBy: { createdAt: "desc" },
          },
        },
      });
    });

    if (result) {
      await logAppointmentCreated(req, user, result.appointmentCode);
    }

    return NextResponse.json(
      { success: true, appointment: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating appointment:", error);

    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const bookingCutoffHours = Number(body.bookingCutoffHours);

    if (Number.isNaN(bookingCutoffHours) || bookingCutoffHours < 0) {
      return NextResponse.json(
        { error: "Invalid bookingCutoffHours value" },
        { status: 400 }
      );
    }

    const settings = await ensureSingleAppointmentSetting({ bookingCutoffHours });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin appointment settings PUT error:", error);

    return NextResponse.json(
      { error: "Failed to save appointment settings" },
      { status: 500 }
    );
  }
}
