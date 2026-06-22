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
    // Check if email already exists in Prisma before attempting Supabase signup
    const existingUser = await prisma.user.findUnique({
      where: { email: formData.email },
    })

    if (existingUser) {
      return { ok: false, error: 'An account with this email already exists.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
      },
    })

    console.log('Supabase signUp result:', JSON.stringify({ data, error }))

    if (error) {
      return { ok: false, error: error.message }
    }

    const supabaseUserId = data.user?.id
    if (!supabaseUserId) {
      return { ok: false, error: 'Failed to create auth user' }
    }

    await prisma.user.upsert({
      where: { id: supabaseUserId },
      update: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: formData.mobileNumber,
        emailVerified: false,
      },
      create: {
        id: supabaseUserId,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: formData.mobileNumber,
        password: '',
        userCode: nanoid(8),
        role: 'CUSTOMER',
        emailVerified: false,
      },
    })

    console.log('Prisma user created successfully')
    return { ok: true }

  } catch (err: any) {
    console.error('signupAction error:', err)
    return { ok: false, error: err.message ?? 'Unknown error' }
  }
}