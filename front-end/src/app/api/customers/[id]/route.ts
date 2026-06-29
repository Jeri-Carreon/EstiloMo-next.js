import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/supabase/getUser";
import { logCustomerUpdated, logCustomerDeactivated, } from "@/lib/securityLogEvents";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await getAdminUser();

    if (!adminUser || !["OWNER", "RECEPTIONIST"].includes(adminUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    console.log("PARAM ID:", id);

    if (!id) {
      return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
    }

    const body = await req.json();
    console.log("BODY:", body);

    let { firstName, lastName, mobileNumber, isActive } = body;

    firstName = (firstName ?? "").trim();
    lastName = (lastName ?? "").trim();
    mobileNumber = (mobileNumber ?? "").replace(/\D/g, "");

    if (!firstName || !lastName || !mobileNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 });
    }

    if (!/^09\d{9}$/.test(mobileNumber)) {
      return NextResponse.json(
        { error: "Mobile number must be valid and formatted like 09123456789" },
        { status: 400 }
      );
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be boolean" }, { status: 400 });
    }

    const currentCustomer = await db.customer.findFirst({
      where: {
        OR: [
          { id },
          { customerCode: id },
          { userId: id },
        ],
      },
      select: {
        id: true,
        mobileNumber: true,
        isActive: true,
      },
    });
    console.log("FOUND CUSTOMER:", currentCustomer);

    if (!currentCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    if (mobileNumber !== currentCustomer.mobileNumber) {
      const existingMobile = await db.customer.findFirst({
        where: {
          mobileNumber,
          NOT: { id: currentCustomer.id },
        },
      });

      if (existingMobile) {
        return NextResponse.json(
          { error: "Mobile number already exists" },
          { status: 400 }
        );
      }
    }

    const updatedCustomer = await db.customer.update({
      where: { id: currentCustomer.id },
      data: { firstName, lastName, mobileNumber, isActive },
    });

    const customerName = `${updatedCustomer.firstName} ${updatedCustomer.lastName}`;

    if (currentCustomer.isActive === true && updatedCustomer.isActive === false) {
      await logCustomerDeactivated(req, adminUser, customerName);
    } else {
      await logCustomerUpdated(req, adminUser, customerName);
    }

    return NextResponse.json({
      ok: true,
      message: "Customer updated successfully",
      customer: {
        id: updatedCustomer.id,
        customerCode: updatedCustomer.customerCode,
        type: updatedCustomer.customerType,
        name: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
        contactNumber: updatedCustomer.mobileNumber,
        email: updatedCustomer.email || "N/A",
        totalAppointments: 0,
        totalSpent: 0,
        isActive: updatedCustomer.isActive,
        createdAt: updatedCustomer.createdAt,
      },
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}