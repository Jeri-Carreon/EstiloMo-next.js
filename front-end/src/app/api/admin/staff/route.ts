import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!hasAnyRole(user, ["OWNER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await db.barber.findMany({
      where: {
        user: {
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        {
          user: {
            firstName: "asc",
          },
        },
        {
          user: {
            lastName: "asc",
          },
        },
      ],
    });

    return NextResponse.json({
      staff: staff.map((b) => ({
        id: b.id,
        name: `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim(),
        isActive: b.user?.isActive ?? true,
      })),
    });
  } catch (error) {
    console.error("LOAD STAFF ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 }
    );
  }
}
