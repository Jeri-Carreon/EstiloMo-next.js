import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(
      authOptions
    );

    if (
      !session?.user?.email ||
      !["OWNER"].includes(
        (session.user as any).role
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
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
    const session = await getServerSession(
      authOptions
    );

    if (
      !session?.user?.email ||
      !["OWNER"].includes(
        (session.user as any).role
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing service id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      name,
      description,
      durationMinutes,
      price,
      isAvailable,
      assignedStaffIds,
    } = body;

    const updatedService =
      await db.service.update({
        where: {
          id,
        },

        data: {
          ...(name && {
            name,
          }),

          ...(description && {
            description,
          }),

          ...(durationMinutes && {
            durationMinutes:
              Number(durationMinutes),
          }),

          ...(price && {
            price,
          }),

          ...(typeof isAvailable ===
            "boolean" && {
            isAvailable,
          }),

          ...(assignedStaffIds && {
            assignedStaff: {
              set:
                assignedStaffIds.map(
                  (staffId: string) => ({
                    id: staffId,
                  })
                ),
            },
          }),
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

        name: updatedService.name,

        description: updatedService.description,
        
        durationMinutes:
          updatedService.durationMinutes,

        price: Number(
          updatedService.price
        ),

        isAvailable:
          updatedService.isAvailable,

        assignedStaff:
          updatedService.assignedStaff.map(
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