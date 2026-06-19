import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function saleDisplayStatus(status: string) {
  if (status === "PAID") return "COMPLETED";
  return status;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const appointments = await db.appointment.findMany({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        appointmentDate: "desc",
      },
      include: {
        barber: true,
        service: true,
        payment: true,
        sale: {
          include: {
            barber: true,
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

    const appointmentHistory = appointments.map((appointment) => {
      const sale = appointment.sale;

      const saleItems = sale?.items && sale.items.length > 0 ? sale.items : [];

      const services =
        saleItems.length > 0
          ? saleItems.map((item) => ({
              id: item.id,
              serviceId: item.serviceId,
              serviceName: item.service.name,
              quantity: item.quantity,
              price: Number(item.price || 0),
              subtotal: Number(item.subtotal || 0),
            }))
          : [
              {
                id: appointment.service.id,
                serviceId: appointment.service.id,
                serviceName: appointment.service.name,
                quantity: 1,
                price: Number(appointment.service.price || 0),
                subtotal: Number(appointment.service.price || 0),
              },
            ];

      const subtotal = sale
        ? Number(sale.subtotal || 0)
        : Number(appointment.service.price || 0);

      const discount = sale ? Number(sale.discount || 0) : 0;
      const totalAmount = sale ? Number(sale.totalAmount || 0) : subtotal;

      const schedule = `${formatDate(
        appointment.appointmentDate
      )} ${minutesToTime(appointment.startMinutes)} - ${minutesToTime(
        appointment.endMinutes
      )}`;

      return {
        id: appointment.id,
        type: "APPOINTMENT",
        saleId: sale?.id || null,
        appointmentId: appointment.id,
        appointmentCode: appointment.appointmentCode,
        saleCode: sale?.saleCode || null,

        barberName: `${appointment.barber.firstName} ${appointment.barber.lastName}`,

        serviceName:
          services.length > 1
            ? services.map((service) => service.serviceName).join(", ")
            : services[0]?.serviceName || appointment.service.name,

        services,

        appointmentDate: appointment.appointmentDate.toISOString(),
        schedule,

        subtotal,
        discount,
        discountPercent:
          subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,
        totalAmount,

        status: appointment.status,
        paymentStatus:
          sale?.payment?.status || appointment.payment?.status || "PENDING",
        paymentMethod:
          sale?.payment?.method || appointment.payment?.method || "N/A",
        paymentScreenshotUrl:
          sale?.payment?.screenshotUrl ||
          appointment.payment?.screenshotUrl ||
          null,
      };
    });

    const walkInSales = await db.sale.findMany({
      where: {
        customerId: customer.id,
        source: "WALKIN",
        appointments: {
          none: {},
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        barber: true,
        payment: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    const walkInHistory = walkInSales.map((sale) => {
      const services = sale.items.map((item) => ({
        id: item.id,
        serviceId: item.serviceId,
        serviceName: item.service.name,
        quantity: item.quantity,
        price: Number(item.price || 0),
        subtotal: Number(item.subtotal || 0),
      }));

      const subtotal = Number(sale.subtotal || 0);
      const discount = Number(sale.discount || 0);
      const totalAmount = Number(sale.totalAmount || 0);

      return {
        id: sale.id,
        type: "WALKIN",
        saleId: sale.id,
        appointmentId: null,
        appointmentCode: sale.saleCode,
        saleCode: sale.saleCode,

        barberName: sale.barber
          ? `${sale.barber.firstName} ${sale.barber.lastName}`
          : "Walk-in Barber",

        serviceName:
          services.length > 1
            ? services.map((service) => service.serviceName).join(", ")
            : services[0]?.serviceName || "Walk-in Service",

        services,

        appointmentDate: sale.createdAt.toISOString(),
        schedule: formatDate(sale.createdAt),

        subtotal,
        discount,
        discountPercent:
          subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,
        totalAmount,

        status: saleDisplayStatus(sale.status),
        paymentStatus: sale.payment?.status || "PENDING",
        paymentMethod: sale.payment?.method || "N/A",
        paymentScreenshotUrl: sale.payment?.screenshotUrl || null,
      };
    });

    const history = [...appointmentHistory, ...walkInHistory].sort(
      (a, b) =>
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime()
    );

    return NextResponse.json({
      appointments: history,
    });
  } catch (error) {
    console.error("CUSTOMER APPOINTMENTS GET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load appointments" },
      { status: 500 }
    );
  }
}
