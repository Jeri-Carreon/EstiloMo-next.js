import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAbsolute } from "path";
import { isAsyncFunction } from "util/types";

export async function GET(req: Request) {
  try {
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