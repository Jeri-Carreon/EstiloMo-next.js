import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barberId = searchParams.get("barberId");

    if (!barberId) {
      return NextResponse.json({ services: [] });
    }

    const services = await db.service.findMany({
      where: {
        isAvailable: true,
        assignedStaff: {
          some: {
            id: barberId,
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        price: true,
      },
    });

    return NextResponse.json({
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: Number(s.price),
      })),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}