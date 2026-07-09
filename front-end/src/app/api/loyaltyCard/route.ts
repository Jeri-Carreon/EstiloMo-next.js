import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FIFTY_PERCENT_THRESHOLD = 5;
const FREE_STICKER_THRESHOLD = 10;
const LOYALTY_SETTINGS_SELECT = {
  id: true,
  stickersPerTransaction: true,
  fiveStickerReward: true,
  tenStickerReward: true,
  createdAt: true,
  updatedAt: true,
};

type AuthUser = {
  id: string;
  email?: string | null;
};

type LoyaltySale = {
  id: string;
  saleCode: string;
  source: "BOOKING" | "WALKIN";
  subtotal: unknown;
  discount: unknown;
  totalAmount: unknown;
  createdAt: Date;
  barber: {
    firstName: string;
    lastName: string;
  } | null;
  payment: unknown;
  items: {
    id: string;
    serviceId: string;
    quantity: number;
    price: unknown;
    subtotal: unknown;
    service: {
      name: string;
    } | null;
  }[];
  appointments: {
    id: string;
    appointmentCode: string;
    appointmentDate: Date;
    startMinutes: number;
    endMinutes: number;
    barber: {
      firstName: string;
      lastName: string;
    };
  }[];
};

type LoyaltyActivity = {
  id: string;
  appointmentId: string | null;
  stickerNumber: number | null;
  rewardUsed: string;
  saleId: string | null;
  Sale: LoyaltySale | null;
};

type LoyaltyActivityWithSale = LoyaltyActivity & {
  Sale: LoyaltySale;
};

function hasSale(activity: LoyaltyActivity): activity is LoyaltyActivityWithSale {
  return activity.Sale !== null;
}

async function findCustomerForAuthUser(user: AuthUser) {
  const normalizedEmail = user.email?.toLowerCase().trim() || null;

  const dbUser = await db.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    include: {
      customer: true,
    },
  });

  if (dbUser?.customer) return dbUser.customer;

  if (!normalizedEmail) return null;

  return db.customer.findUnique({
    where: {
      email: normalizedEmail,
    },
  });
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildAppointmentFromSale(sale: LoyaltySale, activity?: LoyaltyActivity) {
  const appointment = activity?.appointmentId
    ? sale.appointments.find((appt) => appt.id === activity.appointmentId) ||
      sale.appointments[0]
    : sale.appointments[0];

  const isBooking = sale.source === "BOOKING";

  const subtotal = Number(sale.subtotal || 0);
  const discount = Number(sale.discount || 0);
  const totalAmount = Number(sale.totalAmount || 0);

  const services = sale.items.map((item) => ({
    id: item.id,
    serviceId: item.serviceId,
    name: item.service?.name || "Service",
    quantity: item.quantity,
    price: Number(item.price || 0),
    subtotal: Number(item.subtotal || 0),
  }));

  return {
    id: appointment?.id || sale.id,
    saleId: sale.id,
    activityId: activity?.id || null,
    appointmentCode: appointment?.appointmentCode || null,
    saleCode: sale.saleCode || null,
    type: isBooking ? "Booking" : "Walk-in",
    stickerNumber: activity?.stickerNumber ?? null,
    rewardUsed: activity?.rewardUsed ?? "NONE",

    appointmentDate: isBooking ? appointment?.appointmentDate || null : sale.createdAt,
    startMinutes: appointment?.startMinutes || 0,
    endMinutes: appointment?.endMinutes || 0,
    schedule: appointment
      ? `${minutesToTime(appointment.startMinutes)} - ${minutesToTime(
          appointment.endMinutes
        )}`
      : "—",

    barber:
      appointment?.barber ||
      sale.barber || {
        firstName: "Walk-in",
        lastName: "Barber",
      },

    service: {
      name:
        services.length > 1
          ? services.map((service) => service.name).join(", ")
          : services[0]?.name || "Walk-in Service",
      price: services.length > 1 ? totalAmount : services[0]?.price || totalAmount,
    },

    services,
    subtotal,
    discount,
    totalAmount,
    discountPercent: subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,

    payment: sale.payment,
  };
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

    const customer = await findCustomerForAuthUser(user);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let loyaltyCard = await db.loyaltyCard.findFirst({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!loyaltyCard) {
      loyaltyCard = await db.loyaltyCard.create({
        data: {
          customerId: customer.id,
          stars: 0,
          status: "ACTIVE",
        },
      });
    }

    let settings = await db.loyaltyCardSetting.findFirst({
      select: LOYALTY_SETTINGS_SELECT,
    });

    if (!settings) {
      settings = await db.loyaltyCardSetting.create({
        data: {},
        select: LOYALTY_SETTINGS_SELECT,
      });
    }

    const activities: LoyaltyActivity[] = await db.loyaltyCardActivity.findMany({
      where: {
        customerId: customer.id,
        saleId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        Sale: {
          include: {
            barber: true,
            payment: true,
            items: {
              include: {
                service: true,
              },
            },
            appointments: {
              include: {
                barber: true,
                service: true,
                payment: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    const activitySaleIds = activities
      .map((activity) => activity.saleId)
      .filter((saleId): saleId is string => Boolean(saleId));

    const fallbackSales: LoyaltySale[] = await db.sale.findMany({
      where: {
        customerId: customer.id,
        status: "PAID",
        id: {
          notIn: activitySaleIds,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        barber: true,
        payment: true,
        items: {
          include: {
            service: true,
          },
        },
        appointments: {
          include: {
            barber: true,
            service: true,
            payment: true,
          },
        },
      },
      take: FREE_STICKER_THRESHOLD,
    });

    const appointments = [
      ...activities
        .filter(hasSale)
        .map((activity) => buildAppointmentFromSale(activity.Sale, activity)),
      ...fallbackSales.map((sale) => buildAppointmentFromSale(sale)),
    ].sort((a, b) => {
      const aDate = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
      const bDate = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;

      return aDate - bDate;
    });

    const customerName =
      `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
      "Customer";

    return NextResponse.json({
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customerName,
        email: customer.email || user.email,
        mobileNumber: customer.mobileNumber,
      },

      loyaltyCard: {
        id: loyaltyCard.id,
        customerId: customer.id,
        customerCode: customer.customerCode,
        customerName,
        stars: Math.min(loyaltyCard.stars, FREE_STICKER_THRESHOLD),
        status: loyaltyCard.status,
        fiveRewardRedeemed: loyaltyCard.fiveRewardRedeemed,
      },

      settings: {
        stickersPerTransaction: settings.stickersPerTransaction,
        fiveStickerReward: settings.fiveStickerReward,
        tenStickerReward: settings.tenStickerReward,
        fiftyPercentStickerThreshold: FIFTY_PERCENT_THRESHOLD,
        freeStickerThreshold: FREE_STICKER_THRESHOLD,
      },

      appointments,
    });
  } catch (error) {
    console.error("Loyalty card error:", error);

    return NextResponse.json(
      { error: "Failed to load loyalty card" },
      { status: 500 }
    );
  }
}
