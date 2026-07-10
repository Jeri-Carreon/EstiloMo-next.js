"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/register/route";
import { db } from "@/lib/db";
import { isStrongPassword } from "@/lib/passwordValidation";

function getSupabaseAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function signupAction(formData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobileNumber: string;
}) {
  let createdAuthUserId: string | null = null;

  try {
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = formData.email.toLowerCase().trim();
    const password = formData.password;
    const mobileNumber = formData.mobileNumber.replace(/\D/g, "");

    if (!firstName) return { ok: false, error: "First name is required." };
    if (!lastName) return { ok: false, error: "Last name is required." };
    if (!email) return { ok: false, error: "Email is required." };

    if (!isStrongPassword(password)) {
      return {
        ok: false,
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.",
      };
    }

    if (!/^09\d{9}$/.test(mobileNumber)) {
      return {
        ok: false,
        error: "Mobile number must start with 09 and contain exactly 11 digits.",
      };
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        ok: false,
        error: "An account with this email already exists.",
      };
    }

    const existingPhone = await db.user.findFirst({
      where: { mobileNumber },
    });

    if (existingPhone) {
      return {
        ok: false,
        error: "Mobile number already exists.",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobileNumber,
        },
      },
    });

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    const supabaseUserId = data.user?.id;

    if (!supabaseUserId) {
      return {
        ok: false,
        error: "Failed to create auth user.",
      };
    }

    createdAuthUserId = supabaseUserId;

    const apiRequest = new Request("http://localhost/api/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: supabaseUserId,
        firstName,
        lastName,
        email,
        password,
        mobileNumber,
      }),
    });

    const apiResponse = await POST(apiRequest);
    const apiResult = await apiResponse.json();

    if (!apiResponse.ok || !apiResult.ok) {
      const supabaseAdmin = getSupabaseAdminClient();

      await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

      createdAuthUserId = null;

      return {
        ok: false,
        error: apiResult.error ?? "Registration failed.",
      };
    }

    return { ok: true };
  } catch (err: unknown) {
    console.error("signupAction error:", err);

    if (createdAuthUserId) {
      try {
        const supabaseAdmin = getSupabaseAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (deleteError) {
        console.error("Failed to rollback Supabase auth user:", deleteError);
      }
    }

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed.",
    };
  }
}
