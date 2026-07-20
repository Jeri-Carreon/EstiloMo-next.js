import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

const FIXED_DISCOUNTS = [
  { id: "fixed-0", percent: 0, label: "0%", fixed: true },
  { id: "fixed-50", percent: 50, label: "50%", fixed: true },
  { id: "fixed-100", percent: 100, label: "100%", fixed: true },
];

const LOCKED_PERCENTAGES = new Set([0, 50, 100]);

type DiscountButtonRow = {
  id: string;
  percent: number;
};

async function ensureDiscountButtonTable() {
  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "DiscountButtonSetting" (
      "id" TEXT NOT NULL,
      "percent" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "DiscountButtonSetting_pkey" PRIMARY KEY ("id")
    )
  `;

  await db.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "DiscountButtonSetting_percent_key"
    ON "DiscountButtonSetting"("percent")
  `;
}

function isValidCustomPercent(value: unknown) {
  const percent = Number(value);
  return Number.isInteger(percent) && percent > 0 && percent < 100 && !LOCKED_PERCENTAGES.has(percent);
}

function isUniqueError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "P2002" ||
    maybeError.code === "P2010" ||
    Boolean(maybeError.message?.includes("unique"))
  );
}

async function requireSalesManager() {
  const user = await getAdminUser();

  if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
    return null;
  }

  return user;
}

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureDiscountButtonTable();

    const customButtons = await db.$queryRaw<DiscountButtonRow[]>`
      SELECT id, percent
      FROM "DiscountButtonSetting"
      ORDER BY percent ASC
    `;

    return NextResponse.json({
      buttons: [
        ...FIXED_DISCOUNTS,
        ...customButtons.map((button) => ({
          id: button.id,
          percent: button.percent,
          label: `${button.percent}%`,
          fixed: false,
        })),
      ].sort((a, b) => a.percent - b.percent),
    });
  } catch (error) {
    console.error("GET DISCOUNT BUTTONS ERROR:", error);

    return NextResponse.json({ buttons: FIXED_DISCOUNTS });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSalesManager();

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureDiscountButtonTable();

    const body = await req.json();
    const percent = Number(body.percent);

    if (!isValidCustomPercent(percent)) {
      return NextResponse.json(
        { error: "Enter a custom discount from 1% to 99%, excluding 50%." },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const [button] = await db.$queryRaw<DiscountButtonRow[]>`
      INSERT INTO "DiscountButtonSetting" (id, percent, "createdAt", "updatedAt")
      VALUES (${id}, ${percent}, NOW(), NOW())
      RETURNING id, percent
    `;

    return NextResponse.json({
      button: {
        id: button.id,
        percent: button.percent,
        label: `${button.percent}%`,
        fixed: false,
      },
    });
  } catch (error) {
    if (isUniqueError(error)) {
      return NextResponse.json(
        { error: "That discount button already exists." },
        { status: 409 }
      );
    }

    console.error("CREATE DISCOUNT BUTTON ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create discount button" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireSalesManager();

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureDiscountButtonTable();

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const percent = Number(body.percent);

    if (!id) {
      return NextResponse.json({ error: "Missing discount button id" }, { status: 400 });
    }

    if (!isValidCustomPercent(percent)) {
      return NextResponse.json(
        { error: "Enter a custom discount from 1% to 99%, excluding 50%." },
        { status: 400 }
      );
    }

    const [button] = await db.$queryRaw<DiscountButtonRow[]>`
      UPDATE "DiscountButtonSetting"
      SET percent = ${percent}, "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, percent
    `;

    if (!button) {
      return NextResponse.json({ error: "Discount button not found" }, { status: 404 });
    }

    return NextResponse.json({
      button: {
        id: button.id,
        percent: button.percent,
        label: `${button.percent}%`,
        fixed: false,
      },
    });
  } catch (error) {
    if (isUniqueError(error)) {
      return NextResponse.json(
        { error: "That discount button already exists." },
        { status: 409 }
      );
    }

    console.error("UPDATE DISCOUNT BUTTON ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update discount button" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireSalesManager();

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureDiscountButtonTable();

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";

    if (!id) {
      return NextResponse.json({ error: "Missing discount button id" }, { status: 400 });
    }

    await db.$executeRaw`
      DELETE FROM "DiscountButtonSetting"
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE DISCOUNT BUTTON ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete discount button" },
      { status: 500 }
    );
  }
}
