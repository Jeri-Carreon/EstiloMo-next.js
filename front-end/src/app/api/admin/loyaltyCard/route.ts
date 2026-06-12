import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customers = await db.customer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        loyaltyCards: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        appointments: {
          where: {
            status: "COMPLETED",
          },
          select: {
            id: true,
          },
        },
      },
    });

    const cards = await Promise.all(
      customers.map(async (customer) => {
        const completedCount = customer.appointments.length;

        let card = customer.loyaltyCards[0];

        if (!card) {
          card = await db.loyaltyCard.create({
            data: {
              customerId: customer.id,
              stars: Math.min(completedCount, 10),
              status: completedCount >= 10 ? "COMPLETED" : "ACTIVE",
            },
          });
        }

        return {
          id: card.id,
          cardNumber: customer.customerCode,
          customerId: customer.customerCode,
          name: `${customer.firstName} ${customer.lastName}`,
          stickers: Math.min(completedCount, 10),
          maxStickers: 10,
          status: completedCount >= 10 ? "COMPLETED" : "ACTIVE",
        };
      })
    );

    let settings = await db.loyaltyCardSetting.findFirst();

    if (!settings) {
      settings = await db.loyaltyCardSetting.create({
        data: {},
      });
    }

    const activities = await db.loyaltyCardActivity.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    });

    return NextResponse.json({
      cards,
      settings,
      activities,
    });
  } catch (error) {
    console.error("Admin loyalty cards GET error:", error);

    return NextResponse.json(
      { error: "Failed to load loyalty cards" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const stickersPerTransaction = Number(body.stickersPerTransaction);
    const fiveStickerReward = String(body.fiveStickerReward || "").trim();
    const tenStickerReward = String(body.tenStickerReward || "").trim();

    if (
      Number.isNaN(stickersPerTransaction) ||
      stickersPerTransaction < 1
    ) {
      return NextResponse.json(
        { error: "Invalid stickers per transaction" },
        { status: 400 }
      );
    }

    if (!fiveStickerReward || !tenStickerReward) {
      return NextResponse.json(
        { error: "Reward fields are required" },
        { status: 400 }
      );
    }

    let settings = await db.loyaltyCardSetting.findFirst();

    if (!settings) {
      settings = await db.loyaltyCardSetting.create({
        data: {
          stickersPerTransaction,
          fiveStickerReward,
          tenStickerReward,
        },
      });
    } else {
      settings = await db.loyaltyCardSetting.update({
        where: {
          id: settings.id,
        },
        data: {
          stickersPerTransaction,
          fiveStickerReward,
          tenStickerReward,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin loyalty settings PUT error:", error);

    return NextResponse.json(
      { error: "Failed to save loyalty settings" },
      { status: 500 }
    );
  }
}