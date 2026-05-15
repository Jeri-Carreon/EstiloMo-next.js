import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(
        (session.user as any).role
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const staff = await db.user.findMany({
      where: {
        role: "BARBER",
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    return NextResponse.json({
      staff: staff.map((s) => ({
        id: s.id,
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
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