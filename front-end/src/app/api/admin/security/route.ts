import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

export async function GET(req: Request) {
  try {
    const user = await getAdminUser();

    if (!user || user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || "1");
    const limit = 5;

    const where = search
      ? {
          OR: [
            { userName: { contains: search, mode: "insensitive" as const } },
            { section: { contains: search, mode: "insensitive" as const } },
            { action: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [logs, total] = await Promise.all([
      db.securityLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.securityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET SECURITY LOGS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load security logs" },
      { status: 500 }
    );
  }
}