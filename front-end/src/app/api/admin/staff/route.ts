import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAdminUser()
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await db.barber.findMany({
  include: {
    user: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  },
});

    return NextResponse.json({
  staff: staff.map((b) => ({
    id: b.id,
    name: `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim(),
  })),
});
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 }
    );
  }
}