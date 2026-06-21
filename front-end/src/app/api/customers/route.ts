import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      include: {
        user: true,
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const result = customers.map((customer) => ({
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

      contactNumber:
        customer.mobileNumber || customer.user?.mobileNumber || "N/A",

      email: customer.email || customer.user?.email || "N/A",

      totalAppointments: 0,
      totalSpent: 0,

      isActive: customer.isActive,

      createdAt: customer.createdAt,
    }));

    return NextResponse.json({ customers: result });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}