import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma, ReviewStatus } from "@prisma/client";

import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminTabAccess("reviews", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const { id } = await params;
    const body = await req.json();

    const { status, isVisible } = body;

    const data: Prisma.ReviewUpdateInput = {};

    if (status) {
      data.status = status as ReviewStatus;
      data.isVisible = status === "COMPLETED";
    }

    if (typeof isVisible === "boolean") {
      data.isVisible = isVisible;
    }

    const review = await db.review.update({
      where: { id },
      data,
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error("ADMIN REVIEW UPDATE ERROR:", error);

    return NextResponse.json(
      { error: "Unable to update review." },
      { status: 500 }
    );
  }
}
