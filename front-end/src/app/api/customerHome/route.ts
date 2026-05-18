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

    const customer = await db.customer.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          {
            user: {
              email: session.user.email,
            },
          },
        ],
      },
      select: {
        firstName: true,
      },
    });

    return NextResponse.json({
      customer: {
        firstName: customer?.firstName || "Customer",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}