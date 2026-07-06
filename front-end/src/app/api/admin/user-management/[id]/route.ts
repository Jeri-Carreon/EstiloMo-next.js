import { NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getAdminUser } from "@/lib/supabase/getUser";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser || !["OWNER"].includes(adminUser.role)){
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params; 

    if (!id) {
      return NextResponse.json(
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const existingUser = await db.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (existingUser.role === "OWNER" && body.role !== "OWNER") {
      return NextResponse.json(
        { error: "Cannot change Owner role." },
        { status: 403 }
      );
    }

    const updatedUser = await db.user.update({
      where: { 
        id 
      },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        mobileNumber: body.mobileNumber,
        role: body.role,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAdminUser()
    if (!adminUser || !["OWNER"].includes(adminUser.role)){
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
    });

    return NextResponse.json({
      user: updated,
      message: "User status updated successfully",
    });
  } catch (error) {
    console.error("PATCH USER ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}