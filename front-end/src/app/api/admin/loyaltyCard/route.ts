import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { logLoyaltySettingsUpdated } from "@/lib/securityLogEvents";

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

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const customers = await db.customer.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const cards = await Promise.all(
      customers.map(async (customer) => {
        let card = await db.loyaltyCard.findFirst({
          where: {
            customerId: customer.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (!card) {
          card = await db.loyaltyCard.create({
            data: {
              customerId: customer.id,
              stars: 0,
              status: "ACTIVE",
            },
          });
        }

        return {
          id: card.id,
          cardNumber: customer.customerCode,
          customerId: customer.id,
          customerCode: customer.customerCode,
          name:
            `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
            "Unknown",
          stickers: Math.min(card.stars, FREE_STICKER_THRESHOLD),
          maxStickers: FREE_STICKER_THRESHOLD,
          status: card.status,
          fiveRewardRedeemed: card.fiveRewardRedeemed,
        };
      })
    );

    const activities = await db.loyaltyCardActivity.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    });

    return NextResponse.json({
      cards,
      settings: {
        ...settings,
        fiftyPercentStickerThreshold: FIFTY_PERCENT_THRESHOLD,
        freeStickerThreshold: FREE_STICKER_THRESHOLD,
      },
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
    const user = await getAdminUser();

    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const stickersPerTransaction = Number(body.stickersPerTransaction);
    const fiveStickerReward = String(body.fiveStickerReward || "").trim();
    const tenStickerReward = String(body.tenStickerReward || "").trim();

    if (Number.isNaN(stickersPerTransaction) || stickersPerTransaction < 1) {
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

    let settings = await db.loyaltyCardSetting.findFirst({
      select: LOYALTY_SETTINGS_SELECT,
    });

    if (!settings) {
      settings = await db.loyaltyCardSetting.create({
        data: {
          stickersPerTransaction,
          fiveStickerReward,
          tenStickerReward,
        },
        select: LOYALTY_SETTINGS_SELECT,
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
        select: LOYALTY_SETTINGS_SELECT,
      });
    }

    await logLoyaltySettingsUpdated(req, user);

    return NextResponse.json({
      settings: {
        ...settings,
        fiftyPercentStickerThreshold: FIFTY_PERCENT_THRESHOLD,
        freeStickerThreshold: FREE_STICKER_THRESHOLD,
      },
    });
  } catch (error) {
    console.error("Admin loyalty settings PUT error:", error);

    return NextResponse.json(
      { error: "Failed to save loyalty settings" },
      { status: 500 }
    );
  }
}
