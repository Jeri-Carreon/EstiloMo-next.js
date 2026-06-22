import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

type LoyaltyActivityWithSale = Awaited<
  ReturnType<typeof db.loyaltyCardActivity.findMany>
>[number] & {
  Sale: {
    id: string;
    saleCode: string;
    source: "BOOKING" | "WALKIN";
    subtotal: any;
    discount: any;
    totalAmount: any;
    updatedAt: Date;
    barber: {
      firstName: string;
      lastName: string;
    } | null;
    payment: any;
    items: {
      id: string;
      serviceId: string;
      quantity: number;
      price: any;
      subtotal: any;
      service: {
        name: string;
      };
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
      service: {
        name: string;
      };
      payment: any;
    }[];
  } | null;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        customer: {
          include: {
            loyaltyCards: true,
          },
        },
      },
    });

    if (!user?.customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = user.customer;

    let loyaltyCard = customer.loyaltyCards;

    if (!loyaltyCard) {
      loyaltyCard = await db.loyaltyCard.create({
        data: {
          customerId: customer.id,
          stars: 0,
          status: "ACTIVE",
        },
      });
    }

    const activities = (await db.loyaltyCardActivity.findMany({
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
    })) as LoyaltyActivityWithSale[];

    const appointments = activities
      .filter((activity) => activity.Sale)
      .map((activity) => {
        const sale = activity.Sale!;
        const appointment = sale.appointments[0];

        const subtotal = Number(sale.subtotal || 0);
        const discount = Number(sale.discount || 0);
        const totalAmount = Number(sale.totalAmount || 0);

        const services = sale.items.map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          name: item.service.name,
          quantity: item.quantity,
          price: Number(item.price || 0),
          subtotal: Number(item.subtotal || 0),
        }));

        return {
          id: appointment?.id || sale.id,
          saleId: sale.id,
          activityId: activity.id,
          appointmentCode: appointment?.appointmentCode || sale.saleCode,
          saleCode: sale.saleCode,
          type: sale.source === "BOOKING" ? "Booking" : "Walk-in",
          stickerNumber: activity.stickerNumber,
          rewardUsed: activity.rewardUsed,

          appointmentDate: appointment?.appointmentDate || sale.updatedAt,
          startMinutes: appointment?.startMinutes || 0,
          endMinutes: appointment?.endMinutes || 0,

          barber:
            appointment?.barber ||
            sale.barber || {
              firstName: "Walk-in",
              lastName: "Barber",
            },

          service: {
            name:
              services.length > 1
                ? services.map((s: { name: string }) => s.name).join(", ")
                : services[0]?.name || "Walk-in Service",
            price:
              services.length > 1
                ? totalAmount
                : services[0]?.price || totalAmount,
          },

          services,
          subtotal,
          discount,
          totalAmount,
          discountPercent:
            subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0,

          payment: sale.payment,
        };
      });

    const customerName = `${customer.firstName} ${customer.lastName}`;

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
        stars: Math.min(loyaltyCard.stars, 10),
        status: loyaltyCard.status,
        fiveRewardRedeemed: loyaltyCard.fiveRewardRedeemed,
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