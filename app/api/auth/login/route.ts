import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!backendRes.ok) {
    const error = await backendRes.json().catch(() => ({}))
    return NextResponse.json(
      { message: error.message ?? 'Credenciais inválidas' },
      { status: backendRes.status }
    )
  }

  const data = await backendRes.json()
  const cookieStore = await cookies()

  cookieStore.set('auth_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  // Verifica se o usuário já tem perfil e grava cookie accordingly
  try {
    const profileRes = await fetch(`${BACKEND_URL}/health-profile/me`, {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    })
    if (profileRes.ok) {
      cookieStore.set('has_profile', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    } else {
      cookieStore.delete('has_profile')
    }
  } catch {
    // Se falhar a verificação, não bloquear o login — apenas não gravar o cookie
    cookieStore.delete('has_profile')
  }

  return NextResponse.json({ user: data.user })
}
