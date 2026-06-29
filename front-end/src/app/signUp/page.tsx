"use server";

import { POST } from "@/app/api/register/route";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logSignup } from "@/lib/securityLogEvents";

export async function signupAction(formData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  mobileNumber: string;
}) {
  try {
    const email = formData.email.toLowerCase().trim();
    const cleanedPhone = formData.mobileNumber.replace(/\D/g, "");

    if (!/^09\d{9}$/.test(cleanedPhone)) {
      return {
        ok: false,
        error: "Invalid mobile number format",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        ok: false,
        error: "An account with this email already exists.",
      };
    }

    const existingPhone = await prisma.user.findFirst({
      where: {
        mobileNumber: cleanedPhone,
      },
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
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          first_name: formData.firstName,
          last_name: formData.lastName,
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
        error: "Failed to create auth user",
      };
    }

    const apiRequest = new Request("http://localhost/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: supabaseUserId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email,
        password: formData.password,
        mobileNumber: cleanedPhone,
      }),
    });

    const apiResponse = await POST(apiRequest);
    const apiResult = await apiResponse.json();

    if (!apiResponse.ok || !apiResult.ok) {
      return {
        ok: false,
        error: apiResult.error ?? "Registration failed",
      };
    }

    await logSignup(apiRequest, {
      id: supabaseUserId,
      firstName: formData.firstName,
      lastName: formData.lastName,
    });

    return {
      ok: true,
    };
  } catch (err: any) {
    console.error("signupAction error:", err);

    return {
      ok: false,
      error: err.message ?? "Unknown error",
    };
  }
}