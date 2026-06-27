import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await db.user.findUnique({
    where: { email: user.email! },
    select: { role: true }
  })

  return NextResponse.json({ role: dbUser?.role })
}