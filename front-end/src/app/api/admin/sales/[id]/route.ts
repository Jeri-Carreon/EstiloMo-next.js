import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logSaleDeleted } from "@/lib/securityLogEvents";
import {
  adminAuthorizationResponse,
  requireAdminTabAccess,
} from "@/lib/adminAuthorization";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminTabAccess("sales", req);

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const user = auth.user;

    const { id } = await params;

    const sale = await db.sale.findUnique({
      where: { id },
      select: {
        id: true,
        saleCode: true,
        status: true,
      },
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

    await logSaleDeleted(req, user, sale.saleCode);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE SALE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}
