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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: {
        email: user.email!,
      },
      include: {
        customer: true,
      },
    });

    if (!dbUser?.customer) {
      return NextResponse.json({
        customer: { firstName: "Customer" },
        latestTransaction: null,
        appointments: [],
        recommendedServices: [],
      });
    }

    const customer = dbUser.customer;

    const appointments = await db.appointment.findMany({
      where: {
        customerId: customer.id,
      },
      orderBy: [
        { appointmentDate: "desc" },
        { startMinutes: "desc" },
      ],
      include: {
        barber: true,
        service: true,
        payment: true,
        afterServicePhotos: {
          orderBy: { createdAt: "desc" },
        },
        sale: {
          include: {
            barber: true,
            payment: true,
          },
        },
      },
    });

    const appointmentHistory = appointments.map((appointment) => {
      const sale = appointment.sale;
      const servicePrice = Number(appointment.service.price || 0);

      return {
        id: appointment.id,
        type: "APPOINTMENT",
        saleId: sale?.id || null,
        appointmentId: appointment.id,
        appointmentCode: appointment.appointmentCode,
        saleCode: sale?.saleCode || null,

        barberName: `${appointment.barber.firstName} ${appointment.barber.lastName}`,
        serviceName: appointment.service.name,

        services: [
          {
            id: appointment.service.id,
            serviceId: appointment.service.id,
            serviceName: appointment.service.name,
            quantity: 1,
            price: servicePrice,
            subtotal: servicePrice,
          },
        ],

        appointmentDate: appointment.appointmentDate.toISOString(),
        date: formatDate(appointment.appointmentDate),
        time: `${minutesToTime(appointment.startMinutes)} - ${minutesToTime(
          appointment.endMinutes
        )}`,
        schedule: `${formatDate(appointment.appointmentDate)} ${minutesToTime(
          appointment.startMinutes
        )} - ${minutesToTime(appointment.endMinutes)}`,

        subtotal: servicePrice,
        discount: 0,
        discountPercent: 0,
        totalAmount: servicePrice,

        status: appointment.status,
        paymentStatus:
          sale?.payment?.status || appointment.payment?.status || "PENDING",
        paymentMethod:
          sale?.payment?.method || appointment.payment?.method || "N/A",
        paymentScreenshotUrl:
          sale?.payment?.screenshotUrl ||
          appointment.payment?.screenshotUrl ||
          null,
        afterServicePhotoUrl:
          appointment.afterServicePhotos?.[0]?.imageUrl || null,

        afterServicePhotoUrls:
          appointment.afterServicePhotos?.map(
            (photo) => photo.imageUrl
          ) || [],
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
        date: formatDate(sale.createdAt),
        time: "Walk-in",
        schedule: `${formatDate(sale.createdAt)} Walk-in`,

        subtotal,
        discount,
        discountPercent:
          subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,
        totalAmount,

        status: saleDisplayStatus(sale.status),
        paymentStatus: sale.payment?.status || "PENDING",
        paymentMethod: sale.payment?.method || "N/A",
        paymentScreenshotUrl: sale.payment?.screenshotUrl || null,
        afterServicePhotoUrl: null,
      };
    });

    const history = [...appointmentHistory, ...walkInHistory].sort(
      (a, b) =>
        new Date(b.appointmentDate).getTime() -
        new Date(a.appointmentDate).getTime()
    );

    const latestTransaction = history[0]
      ? {
          id: history[0].id,
          type: history[0].type,
          code: history[0].saleCode || history[0].appointmentCode,
          status: history[0].status,
          date: history[0].date,
          time: history[0].time,
          services: history[0].services.map((service) => ({
            id: service.id,
            name: service.serviceName,
            quantity: service.quantity,
            price: service.price,
            subtotal: service.subtotal,
          })),
          barber: history[0].barberName,
          subtotal: history[0].subtotal,
          discount: history[0].discount,
          totalPrice: history[0].totalAmount,
        }
      : null;

    const customerHistory = await db.saleItem.groupBy({
      by: ["serviceId"],
      where: {
        sale: {
          customerId: customer.id,
          status: "PAID",
        },
      },
      _count: {
        serviceId: true,
      },
      orderBy: {
        _count: {
          serviceId: "desc",
        },
      },
      take: 5,
    });

    const usedServiceIds = customerHistory.map((item) => item.serviceId);

    let recommendedServices = await db.service.findMany({
      where: {
        isAvailable: true,
        id: {
          notIn: usedServiceIds,
        },
        assignedStaff: {
          some: {},
        },
        imageUrl: {
          not: null,
        },
      },
      orderBy: [
        { totalBookings: "desc" },
        { isFeatured: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
      take: 3,
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
      },
    });

    if (recommendedServices.length < 3) {
      const currentRecommendedIds = recommendedServices.map((s) => s.id);

      const fallbackServices = await db.service.findMany({
        where: {
          isAvailable: true,
          id: {
            notIn: [...usedServiceIds, ...currentRecommendedIds],
          },
          assignedStaff: {
            some: {},
          },
          imageUrl: {
            not: null,
          },
        },
        orderBy: [
          { isFeatured: "desc" },
          { sortOrder: "asc" },
          { createdAt: "desc" },
        ],
        take: 3 - recommendedServices.length,
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
        },
      });

      recommendedServices = [...recommendedServices, ...fallbackServices];
    }

    if (recommendedServices.length === 0) {
      recommendedServices = await db.service.findMany({
        where: {
          isAvailable: true,
          assignedStaff: {
            some: {},
          },
          imageUrl: {
            not: null,
          },
        },
        orderBy: [
          { isFeatured: "desc" },
          { totalBookings: "desc" },
          { sortOrder: "asc" },
        ],
        take: 3,
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
        },
      });
    }

    return NextResponse.json({
      customer: {
        firstName: customer.firstName || "Customer",
      },
      latestTransaction,
      appointments: history,
      recommendedServices: recommendedServices.map((service) => ({
        id: service.id,
        name: service.name,
        price: Number(service.price || 0),
        image: service.imageUrl || "",
        reason:
          usedServiceIds.length > 0
            ? "Recommended based on your appointment and walk-in history."
            : "Popular service you may like.",
      })),
    });
  } catch (error) {
    console.error("CUSTOMER APPOINTMENTS GET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load customer appointment data" },
      { status: 500 }
    );
  }
}