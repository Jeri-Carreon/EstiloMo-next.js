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
      !["OWNER"].includes(
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
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}