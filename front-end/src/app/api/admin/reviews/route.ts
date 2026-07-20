import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { hasAnyRole } from "@/lib/adminTabs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAdminUser();

    if (!hasAnyRole(user, ["OWNER", "RECEPTIONIST"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviews = await db.review.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appointment: {
          include: {
            barber: true,
            service: true,
            payment: true,
          },
        },
        sale: {
          include: {
            barber: true,
            payment: true,
            items: {
              include: {
                service: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("ADMIN REVIEWS GET ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load customer reviews." },
      { status: 500 }
    );
  }
}
