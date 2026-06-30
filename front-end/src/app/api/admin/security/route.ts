import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";

export async function GET(req: Request) {
  try {
    const admin = await getAdminUser();

    if (!admin || admin.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const section = searchParams.get("section") || "ALL";
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const limit = 5;

    const filters: any[] = [];

    if (search) {
      filters.push({
        OR: [
          {
            userName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            section: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            action: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (section !== "ALL") {
      filters.push({
        section: {
          equals: section,
        },
      });
    }

    const where = filters.length > 0 ? { AND: filters } : {};

    const [logs, total] = await Promise.all([
      db.securityLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      db.securityLog.count({
        where,
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        userName: log.userName || "Unknown",
        section: log.section,
        action: log.action,
        createdAt: log.createdAt,
      })),
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