'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function signupAction(formData: {
  firstName: string
  lastName: string
  email: string
  password: string
  mobileNumber: string
}) {
  console.log('signupAction called with:', formData.email)

  try {
    const email = formData.email.toLowerCase().trim();

    // Keep as local PH format only
    const cleanedPhone = formData.mobileNumber.replace(/\D/g, "");

    // Validate PH mobile format
    if (!/^09\d{9}$/.test(cleanedPhone)) {
      return {
        ok: false,
        error: "Invalid mobile number format",
      };
    }

    // Store as-is (09XXXXXXXXX)
    const phone = cleanedPhone;


    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        ok: false,
        error: "An account with this email already exists."
      };
    }


    // Check existing phone
    const existingPhone = await prisma.user.findFirst({
      where: {
        mobileNumber: phone,
      },
    });

    if (existingPhone) {
      return {
        ok: false,
        error: "Mobile number already exists."
      };
    }


    const supabase = await createClient();


    // Create Supabase Auth user
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
        error: error.message
      };
    }


    const supabaseUserId = data.user?.id;

    if (!supabaseUserId) {
      return {
        ok: false,
        error: "Failed to create auth user"
      };
    }


    // Create Prisma profile
    await prisma.user.upsert({
      where: { id: supabaseUserId },
      create: {
        id: supabaseUserId,
        email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: phone,
        password: "",
        userCode: nanoid(8),
        role: "CUSTOMER",
        emailVerified: false,
      },
      update: {
        email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: phone,
      },
    });


    return {
      ok: true
    };


  } catch (err: any) {

    console.error("signupAction error:", err);

    return {
      ok: false,
      error: err.message ?? "Unknown error"
    };
  }
}