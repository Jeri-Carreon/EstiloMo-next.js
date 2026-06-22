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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: {
        email: user.email,
      },
      include: {
        customer: true,
      },
    });

    if (!dbUser?.customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = dbUser.customer;

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

    const groupedAppointments = new Map<string, any[]>();

    appointments.forEach((appointment) => {
      const key = appointment.saleId || appointment.id;

      if (!groupedAppointments.has(key)) {
        groupedAppointments.set(key, []);
      }

      groupedAppointments.get(key)!.push(appointment);
    });

    const appointmentHistory = Array.from(groupedAppointments.values()).map(
      (group) => {
        const firstAppointment = group[0];
        const sale = firstAppointment.sale;

        const services = group.map((appointment) => ({
          id: appointment.service.id,
          serviceId: appointment.service.id,
          serviceName: appointment.service.name,
          quantity: 1,
          price: Number(appointment.service.price || 0),
          subtotal: Number(appointment.service.price || 0),
        }));

        const subtotal = sale
          ? Number(sale.subtotal || 0)
          : services.reduce((sum, service) => sum + service.subtotal, 0);

        const discount = sale ? Number(sale.discount || 0) : 0;
        const totalAmount = sale ? Number(sale.totalAmount || 0) : subtotal;

        const schedules = group.map((appointment) => {
          return `${formatDate(appointment.appointmentDate)} ${minutesToTime(
            appointment.startMinutes
          )} - ${minutesToTime(appointment.endMinutes)}`;
        });

        return {
          id: sale?.id || firstAppointment.id,
          type: "APPOINTMENT",
          saleId: sale?.id || null,
          appointmentId: firstAppointment.id,
          appointmentCode: firstAppointment.appointmentCode,
          saleCode: sale?.saleCode || null,

          barberName: `${firstAppointment.barber.firstName} ${firstAppointment.barber.lastName}`,

          serviceName: services.map((service) => service.serviceName).join(", "),

          services,

          appointmentDate: firstAppointment.appointmentDate.toISOString(),
          schedule: schedules.join("\n"),

          subtotal,
          discount,
          discountPercent:
            subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,
          totalAmount,

          status: firstAppointment.status,
          paymentStatus:
            sale?.payment?.status || firstAppointment.payment?.status || "PENDING",
          paymentMethod:
            sale?.payment?.method || firstAppointment.payment?.method || "N/A",
          paymentScreenshotUrl:
            sale?.payment?.screenshotUrl ||
            firstAppointment.payment?.screenshotUrl ||
            null,
        };
      }
    );

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