import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export async function GET(req: Request) {
  try {
    const user = await getAdminUser()
    if (!user || !["OWNER"].includes(user.role)){
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: {
        role: {
          in: ["OWNER", "RECEPTIONIST", "BARBER"],
        },
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const result = users.map((user) => ({
      id: user.id,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "Unknown",

      mobileNumber:
        user.mobileNumber || "N/A",

      email:
        user.email,
        
      role: user.role,

      isActive: user.isActive,

      createdAt: user.createdAt,
    }));

    return NextResponse.json({ users: result });
    } catch (error) {
      console.error("GET USERS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}