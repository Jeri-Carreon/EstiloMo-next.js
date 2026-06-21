'use server'

import { createClient } from '@supabase/supabase-js'
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
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