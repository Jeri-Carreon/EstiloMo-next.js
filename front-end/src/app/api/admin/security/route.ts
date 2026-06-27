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
    const section = searchParams.get("section") || "ALL";
    const role = searchParams.get("role") || "ALL";
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const limit = 5;

    const where: any = {
      AND: [],
    };

    if (search.trim()) {
      where.AND.push({
        OR: [
          { userName: { contains: search, mode: "insensitive" } },
          { section: { contains: search, mode: "insensitive" } },
          { action: { contains: search, mode: "insensitive" } },
          {
            user: {
              role: {
                equals: search.toUpperCase(),
              },
            },
          },
        ],
      });
    }

    if (section !== "ALL") {
      where.AND.push({
        section,
      });
    }

    if (role !== "ALL") {
      where.AND.push({
        user: {
          role,
        },
      });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    const [logs, total] = await Promise.all([
      db.securityLog.findMany({
        where,
        include: {
          user: {
            select: {
              role: true,
            },
          },
        },
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
        userName: log.userName,
        userRole: log.user?.role || "UNKNOWN",
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