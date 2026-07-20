import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  adminAuthorizationResponse,
  requireAnyAdminTabAccess,
} from "@/lib/adminAuthorization";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAnyAdminTabAccess(
      ["customers", "appointments", "sales", "loyaltyCard"],
      req
    );

    if (auth.status !== 200) {
      return adminAuthorizationResponse(auth.status);
    }

    const customers = await db.customer.findMany({
      include: {
        user: true,
        appointments: true,
        sales: {
          where: {
            status: "PAID",
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { createdAt: "asc" },
      ],
    });

    const result = customers.map((customer) => {
      const totalAppointments = customer.appointments.length;

      const totalSpent = customer.sales.reduce((sum, sale) => {
        return sum + Number(sale.totalAmount || 0);
      }, 0);

      return {
        id: customer.id,
        customerCode: customer.customerCode,
        type: customer.customerType || "CASUAL",

        name:
          [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
          [customer.user?.firstName, customer.user?.lastName]
            .filter(Boolean)
            .join(" ") ||
          customer.email ||
          customer.user?.email ||
          "Unknown",

        mobileNumber:
          customer.mobileNumber || customer.user?.mobileNumber || "N/A",

        email: customer.email || customer.user?.email || "N/A",

        totalAppointments,
        totalSpent,

        isActive: customer.isActive,
        createdAt: customer.createdAt,
      };
    });

    return NextResponse.json({ customers: result });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
