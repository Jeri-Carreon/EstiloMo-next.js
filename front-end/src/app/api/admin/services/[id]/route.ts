import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { logServiceAvailabilityChanged, logServiceDeleted, logServiceUpdated } from "@/lib/securityLogEvents";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminTabAccess("services", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing service id" },
        { status: 400 }
      );
    }

    const service = await db.service.delete({
      where: {
        id,
      },
    });

    await logServiceDeleted(req, user, service.name);

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
    const auth = await requireAdminTabAccess("services", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

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
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const {
      name,
      description,
      durationMinutes,
      price,
      isAvailable,
      assignedStaffIds,
      sortOrder,
      imageUrl,
    } = await req.json();

    const normalizedName = toTitleCase(name ?? "").trim();
    const normalizedDescription = (description ?? "").trim();
    const normalizedDurationMinutes = Number(durationMinutes);
    const normalizedPrice = Number(price);
    const normalizedSortOrder = Number(sortOrder);
    let normalizedAssignedStaffIds = assignedStaffIds;

    if (
      !normalizedName ||
      !normalizedDescription ||
      !normalizedDurationMinutes ||
      !normalizedPrice ||
      Number.isNaN(normalizedSortOrder)
    ) {
      return NextResponse.json(
        { error: "Missing Fields" },
        { status: 400 }
      );
    }

    if (normalizedName.length > 50) {
      return NextResponse.json(
        { error: "Service Name too long" },
        { status: 400 }
      );
    }

    if (normalizedDescription.length > 150) {
      return NextResponse.json(
        { error: "Description too long" },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(normalizedDurationMinutes) ||
      normalizedDurationMinutes < 1 ||
      normalizedDurationMinutes > 999
    ) {
      return NextResponse.json(
        { error: "Duration must only be 3 digits" },
        { status: 400 }
      );
    }

    if (Number.isNaN(normalizedPrice) || normalizedPrice < 1 || normalizedPrice > 99999) {
      return NextResponse.json(
        { error: "Price must be 5 digits (Pesos)" },
        { status: 400 }
      );
    }

    if (typeof isAvailable !== "boolean") {
      return NextResponse.json(
        { error: "isAvailable must be boolean" },
        { status: 400 }
      );
    }

    if (!Array.isArray(normalizedAssignedStaffIds)) {
      normalizedAssignedStaffIds = [];
    }

    if (isAvailable && normalizedAssignedStaffIds.length < 1) {
      return NextResponse.json(
        { error: "Please assign at least 1 staff member" },
        { status: 400 }
      );
    }

    if (isAvailable && normalizedAssignedStaffIds.length > 0) {
      const validBarbers = await db.barber.findMany({
        where: {
          id: {
              in: normalizedAssignedStaffIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (validBarbers.length !== normalizedAssignedStaffIds.length) {
        return NextResponse.json(
          { error: "One or more barbers not found" },
          { status: 400 }
        );
      }
    }

    const existingService = await db.service.findUnique({ where: { id }, select: { isAvailable: true } });
    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updatedService = await db.service.update({
      where: {
        id,
      },
      data: {
        sortOrder: normalizedSortOrder,
        name: normalizedName,
        description: normalizedDescription,
        durationMinutes: normalizedDurationMinutes,
        price: normalizedPrice,
        isAvailable,
        imageUrl: imageUrl || null,

        assignedStaff: {
          set: normalizedAssignedStaffIds
            .filter(Boolean)
            .map((id: string) => ({ id })),
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

    await logServiceUpdated(req, user, updatedService.name);
    if (existingService.isAvailable !== updatedService.isAvailable) {
      await logServiceAvailabilityChanged(req, user, updatedService.name, updatedService.isAvailable);
    }

    return NextResponse.json({
      ok: true,
      service: {
        id: updatedService.id,
        sortOrder: updatedService.sortOrder,
        serviceCode: updatedService.serviceCode,
        name: updatedService.name,
        description: updatedService.description,
        durationMinutes: updatedService.durationMinutes,
        price: Number(updatedService.price),
        isAvailable: updatedService.isAvailable,
        imageUrl: updatedService.imageUrl,
        assignedStaff: updatedService.assignedStaff.map((barber) => ({
          id: barber.id,
          name:
            [barber.firstName, barber.lastName].filter(Boolean).join(" ") ||
            "Unknown",
        })),
      },
    });
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}
