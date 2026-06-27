import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
 
export async function GET(req: NextRequest) {
  // Simple bearer authentication to protect your cron endpoint from public spam
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
 
  try {
    // 1. Define the Reservation Expiry Window (e.g., 15 minutes ago)
    const expiryThreshold = new Date(Date.now() - 15 * 60 * 1000);
 
    // 2. Query all Sales that are PENDING and were created more than 15 minutes ago
    const expiredSales = await db.sale.findMany({
      where: {
        createdAt: {
          lt: expiryThreshold,
        },
      },
      select: {
        id: true,
        saleCode: true,
      },
    });
 
    if (expiredSales.length === 0) {
      return NextResponse.json({ message: "No expired reservations found." });
    }
 
    const saleIds = expiredSales.map((sale) => sale.id);
 
    // 3. Atomically purge the abandoned records in foreign-key reference order
    await db.$transaction([
      // A. Delete pending Payment records associated with the expired Sales
      db.payment.deleteMany({
        where: {
          saleId: { in: saleIds },
          status: "PENDING",
        },
      }),
 
      // B. Delete pending Appointment records associated with the expired Sales
      db.appointment.deleteMany({
        where: {
          saleId: { in: saleIds },
          status: "PENDING",
        },
      }),
 
      // C. Delete the SaleItems
      db.saleItem.deleteMany({
        where: {
          saleId: { in: saleIds },
        },
      }),
 
      // D. Finally delete the Sales
      db.sale.deleteMany({
        where: {
          id: { in: saleIds },
          status: "PENDING",
        },
      }),
    ]);
 
    console.log(
      `[CRON] Cleaned up ${expiredSales.length} abandoned reservations:`,
      expiredSales.map((s) => s.saleCode)
    );
 
    return NextResponse.json({
      success: true,
      cleanedCount: expiredSales.length,
    });
  } catch (error: any) {
    console.error("Cron cleanup failed:", error);
    return NextResponse.json(
      { error: "Internal server error during sweep", details: error.message },
      { status: 500 }
    );
  }
}