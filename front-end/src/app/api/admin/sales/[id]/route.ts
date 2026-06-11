import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !["OWNER", "RECEPTIONIST"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const sale = await db.sale.findUnique({
      where: { id },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status === "PAID") {
      return NextResponse.json(
        { error: "Paid sales cannot be deleted" },
        { status: 400 }
      );
    }

    await db.sale.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE SALE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}