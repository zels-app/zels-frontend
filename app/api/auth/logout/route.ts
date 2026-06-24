import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  cookieStore.delete('has_profile')
  return NextResponse.json({ ok: true })
}
