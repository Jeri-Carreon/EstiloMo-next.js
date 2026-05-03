import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const customers = users.map((user) => ({
      id: user.id,
      type: user.role || "Regular",
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown",
      contactNumber: user.mobileNumber || "N/A",
      email: user.email || "N/A",
      totalAppointments: 0,
      totalSpent: 0,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ customers });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
