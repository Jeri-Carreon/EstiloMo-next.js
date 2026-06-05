import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const { status, isVisible } = body;

    const data: any = {};

    if (status) {
      data.status = status;
      data.isVisible = status === "COMPLETED";
    }

    if (typeof isVisible === "boolean") {
      data.isVisible = isVisible;
    }

    const review = await db.review.update({
      where: { id },
      data: data as any,
    });

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to update review." },
      { status: 500 }
    );
  }
}