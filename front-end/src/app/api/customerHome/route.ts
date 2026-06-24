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

    const customer = await db.customer.findFirst({
      where: {
        OR: [
          { email: user.email },
          {
            user: {
              email: user.email,
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!customer) {
      return NextResponse.json({
        customer: {
          firstName: "Customer",
        },
        latestTransaction: null,
        recommendedServices: [],
      });
    }

    const latestAppointment = await db.appointment.findFirst({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        barber: true,
        service: true,
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

    const latestWalkInSale = await db.sale.findFirst({
      where: {
        customerId: customer.id,
        source: "WALKIN",
        appointments: {
          none: {},
        },
      },
      orderBy: {
        updatedAt: "desc",
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

    const appointmentUpdatedAt = latestAppointment?.updatedAt?.getTime() || 0;
    const walkInUpdatedAt = latestWalkInSale?.updatedAt?.getTime() || 0;

    let latestTransaction = null;

    if (latestAppointment && appointmentUpdatedAt >= walkInUpdatedAt) {
      const sale = latestAppointment.sale;

      const services =
        sale?.items && sale.items.length > 0
          ? sale.items.map((item) => ({
              id: item.id,
              name: item.service.name,
              quantity: item.quantity,
              price: Number(item.price || 0),
              subtotal: Number(item.subtotal || 0),
            }))
          : [
              {
                id: latestAppointment.service.id,
                name: latestAppointment.service.name,
                quantity: 1,
                price: Number(latestAppointment.service.price || 0),
                subtotal: Number(latestAppointment.service.price || 0),
              },
            ];

      const subtotal = sale
        ? Number(sale.subtotal || 0)
        : Number(latestAppointment.service.price || 0);

      const discount = sale ? Number(sale.discount || 0) : 0;
      const totalPrice = sale ? Number(sale.totalAmount || 0) : subtotal;

      latestTransaction = {
        id: latestAppointment.id,
        type: "APPOINTMENT",
        code: sale?.saleCode || latestAppointment.appointmentCode,
        status: latestAppointment.status,
        date: formatDate(latestAppointment.appointmentDate),
        time: `${minutesToTime(latestAppointment.startMinutes)} - ${minutesToTime(
          latestAppointment.endMinutes
        )}`,
        services,
        barber: `${latestAppointment.barber.firstName} ${latestAppointment.barber.lastName}`,
        subtotal,
        discount,
        totalPrice,
      };
    } else if (latestWalkInSale) {
      const services = latestWalkInSale.items.map((item) => ({
        id: item.id,
        name: item.service.name,
        quantity: item.quantity,
        price: Number(item.price || 0),
        subtotal: Number(item.subtotal || 0),
      }));

      latestTransaction = {
        id: latestWalkInSale.id,
        type: "WALKIN",
        code: latestWalkInSale.saleCode,
        status: saleDisplayStatus(latestWalkInSale.status),
        date: formatDate(latestWalkInSale.createdAt),
        time: "Walk-in",
        services,
        barber: latestWalkInSale.barber
          ? `${latestWalkInSale.barber.firstName} ${latestWalkInSale.barber.lastName}`
          : "Walk-in Barber",
        subtotal: Number(latestWalkInSale.subtotal || 0),
        discount: Number(latestWalkInSale.discount || 0),
        totalPrice: Number(latestWalkInSale.totalAmount || 0),
      };
    }

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
    console.error("CUSTOMER HOME GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}