import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { firstName, lastName, mobileNumber } = await req.json();
    const trimmedFirstName = (firstName ?? "").trim();
    const trimmedLastName = (lastName ?? "").trim();
    const trimmedMobileNumber = (mobileNumber ?? "").trim();

    // Update display name in Supabase auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          full_name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
        },
      }
    );
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update Prisma user table
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        firstName: trimmedFirstName || undefined,
        lastName: trimmedLastName || undefined,
        mobileNumber: trimmedMobileNumber || undefined,
      },
    });

    // Keep customer-facing records in sync for admin/customer views
    await db.customer.updateMany({
      where: { userId: user.id },
      data: {
        firstName: trimmedFirstName || undefined,
        lastName: trimmedLastName || undefined,
        mobileNumber: trimmedMobileNumber || undefined,
      },
    });

    return NextResponse.json({
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
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}