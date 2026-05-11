import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(
        (session.user as any).role
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing customer id" },
        { status: 400 }
      );
    }

    await db.customer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !["OWNER", "RECEPTIONIST"].includes(
        (session.user as any).role
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const body = await req.json();

    const {
      firstName,
      lastName,
      email,
      mobileNumber,
    } = body;

    const updatedCustomer =
      await db.customer.update({
        where: {
          id,
        },
        data: {
          firstName,
          lastName,
          email,
          mobileNumber,
        },
      });

    return NextResponse.json({
      ok: true,
      customer: updatedCustomer,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}