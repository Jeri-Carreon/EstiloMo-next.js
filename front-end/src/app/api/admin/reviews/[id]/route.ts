import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser()
    if (!user || !["OWNER", "RECEPTIONIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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