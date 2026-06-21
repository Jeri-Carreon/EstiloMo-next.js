import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser()
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing service id" },
        { status: 400 }
      );
    }

    await db.service.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "DELETE SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete service",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser()
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing service id" },
        { status: 400 }
      );
    }

    const toTitleCase = (str: string) =>
      str
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map(
          (word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1)
        )
        .join(" ");

    let {
      name,
      description,
      durationMinutes,
      price,
      isAvailable,
      assignedStaffIds,
      sortOrder,
    } = await req.json();

    console.log("UPDATE SERVICE DATA:", {
  id,
  assignedStaffIds,
  sortOrder,
});

    name = toTitleCase(name ?? "").trim();
    description = (description ?? "").trim();
    durationMinutes = Number(durationMinutes);
    price = Number(price);

    /* ======================================================
       REQUIRED FIELDS
    ====================================================== */

    if (
      !name ||
      !description ||
      !durationMinutes ||
      !price ||
      !sortOrder
    ) {
      return NextResponse.json(
        { error: "Missing Fields" },
        { status: 400 }
      );
    }

    /* ======================================================
       MAX LENGTH VALIDATION
    ====================================================== */

    if (name.length > 50) {
      return NextResponse.json(
        { error: "Service Name too long" },
        { status: 400 }
      );
    }

    if (description.length > 150) {
      return NextResponse.json(
        { error: "Description too long" },
        { status: 400 }
      );
    }

    /* ======================================================
       NUMBER VALIDATION
    ====================================================== */

    if (
      Number.isNaN(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 999
    ) {
      return NextResponse.json(
        {
          error:
            "Duration must only be 3 digits",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(price) ||
      price < 1 ||
      price > 99999
    ) {
      return NextResponse.json(
        {
          error:
            "Price must be 5 digits (Pesos)",
        },
        { status: 400 }
      );
    }

    /* ======================================================
       BOOLEAN VALIDATION
    ====================================================== */

    if (typeof isAvailable !== "boolean") {
      return NextResponse.json(
        {
          error:
            "isAvailable must be boolean",
        },
        { status: 400 }
      );
    }

    /* ======================================================
       STAFF VALIDATION
    ====================================================== */

    if (isAvailable && Array.isArray(assignedStaffIds)) {
  const validBarbers = await db.barber.findMany({
    where: {
      id: { in: assignedStaffIds },
    },
    select: { id: true },
  });

  if (validBarbers.length !== assignedStaffIds.length) {
    return NextResponse.json(
      { error: "One or more barbers not found" },
      { status: 400 }
    );
  }
}

    const updatedService = await db.service.update({
        where: {
          id,
        },

        data: {
          sortOrder,
          name,
          description,
          durationMinutes,
          price,
          isAvailable,

          assignedStaff: {
            set: assignedStaffIds
              .filter(Boolean)
              .map((id: string) => ({ id })),
          }
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
      ok: true,

      service: {
        id: updatedService.id,

        sortOrder: updatedService.sortOrder,

        serviceCode:
          updatedService.serviceCode,

        name: updatedService.name,

        description:
          updatedService.description,

        durationMinutes:
          updatedService.durationMinutes,

        price: Number(
          updatedService.price
        ),

        isAvailable:
          updatedService.isAvailable,

        assignedStaff:
          updatedService.assignedStaff.map(
            (barber) => ({
              id: barber.id,

              name:
                [
                  barber.firstName,
                  barber.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") || "Unknown",
            })
          ),
      },
    });
  } catch (error) {
    console.error(
      "UPDATE SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update service",
      },
      {
        status: 500,
      }
    );
  }
}