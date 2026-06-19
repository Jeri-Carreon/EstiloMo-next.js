import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

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
      include: {
        loyaltyCards: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

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

    const activities = await db.loyaltyCardActivity.findMany({
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
        sale: {
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

    const appointments = activities
      .filter((activity) => activity.sale)
      .map((activity) => {
        const sale = activity.sale!;
        const appointment = sale.appointments[0];
        const firstItem = sale.items[0];

        const subtotal = Number(sale.subtotal || 0);
        const discount = Number(sale.discount || 0);
        const totalAmount = Number(sale.totalAmount || 0);

        return {
          id: appointment?.id || sale.id,
          saleId: sale.id,
          activityId: activity.id,
          appointmentCode: appointment?.appointmentCode || sale.saleCode,
          saleCode: sale.saleCode,
          type: sale.source === "BOOKING" ? "Appointment" : "Walk-in",
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

          service:
            appointment?.service ||
            firstItem?.service || {
              name: "Walk-in Service",
              price: String(firstItem?.price || totalAmount || 0),
            },

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
        email: customer.email,
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
