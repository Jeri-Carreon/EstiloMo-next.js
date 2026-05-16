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
      return NextResponse.json(
        { error: "Forbidden" }, 
        { status: 403 });
    }

    const toTitleCase = (str: string) =>
    str
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
      
    let {
      name, 
      description, 
      durationMinutes, 
      price, 
      assignedStaffIds,
      isAvailable,} = 
      await req.json();

      name = toTitleCase(name ?? "").trim();
      description = (description ?? "").trim();
      durationMinutes = (durationMinutes ?? "");
      price = (price ?? "");

    if (!name || !description || !durationMinutes || !price ) {
      return NextResponse.json(
        { error: "Missing Fields" },
        { status: 400}
      )
    }

    if (name.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Service Name too long" },
        { status: 400 }
      );
    }

    if (description.length > 150) {
      return NextResponse.json(
        { ok: false, error: "Description too long" },
        { status: 400 }
      );
    }

    const duration = Number(durationMinutes);

    if (Number.isNaN(duration) || duration < 1 || duration > 999) {
      return NextResponse.json(
        { error: "Duration must only be 3 digits" },
        { status: 400 }
      );
    }

    const pricing = Number(price);

    if (Number.isNaN(pricing) || pricing < 1 || pricing > 99999) {
      return NextResponse.json(
        { error: "Price must be 5 digits(Pesos)" },
        { status: 400 }
      );
    }

    if (typeof isAvailable !== "boolean") {
      return NextResponse.json(
        { error: "isAvailable must be boolean" },
        { status: 400 }
      );
    }

    if (isAvailable === true) {
      if (!Array.isArray(assignedStaffIds) || assignedStaffIds.length < 1) {
        return NextResponse.json(
          { error: "Please assign at least 1 staff member" },
          { status: 400 }
        );
      }
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