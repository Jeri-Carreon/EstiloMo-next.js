import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logLoyaltySettingsUpdated } from "@/lib/securityLogEvents";
import { adminAuthorizationResponse, requireAnyAdminTabAccess, requireAdminTabAccess } from "@/lib/adminAuthorization";

export const dynamic = "force-dynamic";

const LOYALTY_SETTINGS_SELECT = {
  id: true, stickersPerTransaction: true, fiveStickerReward: true, tenStickerReward: true,
  fiftyPercentStickerThreshold: true, freeStickerThreshold: true, createdAt: true, updatedAt: true,
};

async function getSettings() {
  return (await db.loyaltyCardSetting.findFirst({ select: LOYALTY_SETTINGS_SELECT }))
    ?? db.loyaltyCardSetting.create({ data: {}, select: LOYALTY_SETTINGS_SELECT });
}

export async function GET(req: Request) {
  try {
    const auth = await requireAnyAdminTabAccess(["loyaltyCard", "sales"]);
    if (auth.status !== 200) return adminAuthorizationResponse(auth.status);

    const settings = await getSettings();
    const rewardOptions = await db.loyaltyRewardOption.findMany({ orderBy: { value: "asc" } });
    const url = new URL(req.url);
    const activityType = url.searchParams.get("activityType");
    const type = activityType === "EARNED" || activityType === "REDEEMED" ? activityType : null;
    const customers = await db.customer.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    const cards = await Promise.all(customers.map(async (customer) => {
      const card = (await db.loyaltyCard.findUnique({ where: { customerId: customer.id } }))
        ?? await db.loyaltyCard.create({ data: { customerId: customer.id, stars: 0, status: "ACTIVE" } });
      return {
        id: card.id, cardNumber: customer.customerCode, customerId: customer.id, customerCode: customer.customerCode,
        name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unknown",
        stickers: Math.min(card.stars, settings.freeStickerThreshold), maxStickers: settings.freeStickerThreshold,
        status: card.status, fiveRewardRedeemed: card.fiveRewardRedeemed,
      };
    }));
    const activities = await db.loyaltyCardActivity.findMany({ where: type ? { type } : undefined, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ cards, settings, rewardOptions, activities });
  } catch (error) {
    console.error("Admin loyalty cards GET error:", error);
    return NextResponse.json({ error: "Failed to load loyalty cards" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdminTabAccess("loyaltyCard", req);
    if (auth.status !== 200) return adminAuthorizationResponse(auth.status);
    const body = await req.json();
    const stickersPerTransaction = Number(body.stickersPerTransaction);
    const firstReward = String(body.firstReward ?? body.fiveStickerReward ?? "").trim();
    const secondReward = String(body.secondReward ?? body.tenStickerReward ?? "").trim();
    const firstRewardThreshold = Number(body.firstRewardThreshold ?? body.fiftyPercentStickerThreshold);
    const secondRewardThreshold = Number(body.secondRewardThreshold ?? body.freeStickerThreshold);
    if (!Number.isInteger(stickersPerTransaction) || stickersPerTransaction < 1 ||
        !Number.isInteger(firstRewardThreshold) || !Number.isInteger(secondRewardThreshold) ||
        firstRewardThreshold < 1 || secondRewardThreshold <= firstRewardThreshold) {
      return NextResponse.json({ error: "First reward must be at least 1 sticker and second reward must be higher." }, { status: 400 });
    }
    const options = await db.loyaltyRewardOption.findMany({ where: { name: { in: [firstReward, secondReward] } } });
    if (!firstReward || !secondReward || options.length !== new Set([firstReward, secondReward]).size) {
      return NextResponse.json({ error: "Select valid first and second reward options." }, { status: 400 });
    }
    const existing = await db.loyaltyCardSetting.findFirst({ select: { id: true } });
    const data = { stickersPerTransaction, fiveStickerReward: firstReward, tenStickerReward: secondReward,
      fiftyPercentStickerThreshold: firstRewardThreshold, freeStickerThreshold: secondRewardThreshold };
    const settings = existing ? await db.loyaltyCardSetting.update({ where: { id: existing.id }, data, select: LOYALTY_SETTINGS_SELECT })
      : await db.loyaltyCardSetting.create({ data, select: LOYALTY_SETTINGS_SELECT });
    await logLoyaltySettingsUpdated(req, auth.user);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin loyalty settings PUT error:", error);
    return NextResponse.json({ error: "Failed to save loyalty settings" }, { status: 500 });
  }
}
