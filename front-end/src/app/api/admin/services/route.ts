import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const services = await db.service.findMany({
      include: {
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },

      orderBy: {
        id: "asc",
      },
    });

    const result = services.map((service) => ({
      id: service.id,

      name: service.name,

      description: service.description,
      
      durationMinutes:
        service.durationMinutes,

      price: Number(service.price),

      isAvailable:
        service.isAvailable,

      assignedStaff:
        service.assignedStaff.map(
          (staff) => ({
            id: staff.id,

            name:
              [
                staff.firstName,
                staff.lastName,
              ]
                .filter(Boolean)
                .join(" ") || "Unknown",
          })
        ),
    }));

    return NextResponse.json({
      services: result,
    });
  } catch (error) {
    console.error(
      "GET SERVICES ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to fetch services",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || (session.user as any).role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const {
      name,
      description,
      durationMinutes,
      price,
      assignedStaffIds,
      isAvailable,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Service name is required" },
        { status: 400 }
      );
    }

    const service = await db.service.create({
      data: {
        name,
        description,
        durationMinutes: Number(durationMinutes),
        price: Number(price),
        isAvailable: Boolean(isAvailable),

         assignedStaff: {
          connect:
            assignedStaffIds?.map(
              (id: string) => ({
                id,
              })
            ) || [],
        },
      },
      include: {
        assignedStaff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: Number(service.price),
        isAvailable: service.isAvailable,
        assignedStaff:
          service.assignedStaff.map(
            (staff) => ({
              id: staff.id,

              name:
                [
                  staff.firstName,
                  staff.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                "Unknown",
            })
          ),
      },
    });
  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}