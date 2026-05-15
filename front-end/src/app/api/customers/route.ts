import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const customers = await db.customer.findMany({
      include: {
        user: true,
      },
      orderBy: {
        user: {
          createdAt: "asc",
        },
      },
    });

    const result = customers.map((customer) => ({
      id: customer.id,
      type: customer.customerType || "CASUAL",
      name:
        [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
        [customer.user?.firstName, customer.user?.lastName].filter(Boolean).join(" ") ||
        customer.email ||
        customer.user?.email ||
        "Unknown",

      contactNumber:
        customer.mobileNumber || customer.user?.mobileNumber || "N/A",

      email: customer.email || customer.user?.email || "N/A",

      totalAppointments: 0,
      totalSpent: 0,

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