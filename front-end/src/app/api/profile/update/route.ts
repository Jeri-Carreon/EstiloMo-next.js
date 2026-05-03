import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { firstName, lastName, mobileNumber } = await req.json();

    const updatedUser = await db.user.update({
      where: { id: session.user.id as string },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        mobileNumber: mobileNumber || undefined,
      },
    });

    return Response.json({
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return Response.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
