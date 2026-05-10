import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation"
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  {/*
  if (
    !session?.user?.email || 
    !["OWNER","RECEPTIONIST"].includes(session.user.role)
    ){
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403}
      );
    }  
    */}
  

  try {
    const customers = await db.customer.findMany({
      include: {
        user: true,
      },
      orderBy: {
        user: {
          createdAt: "desc",
        }
      }
    });

    const result = customers.map((customer) => ({
      id: customer.id,
      type: customer.customerType || "CASUAL",
      name: 
        [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ") ||  
        
        [customer.user?.firstName, customer.user?.lastName]
        .filter(Boolean)
        .join(" ") ||  

        customer.email ||
        customer.user?.email || 
        "Unknown",

      contactNumber: 
        customer.mobileNumber ||
        customer.user?.mobileNumber || "N/A",

      email: 
        customer.email ||
        customer.user?.email || "N/A",

      totalAppointments: 0,
      totalSpent: 0,
      
      createdAt: customer.createdAt,
    }));

    return NextResponse.json({ customers: result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
