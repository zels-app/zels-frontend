import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, name } = body

  const registerRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  if (!registerRes.ok) {
    const error = await registerRes.json().catch(() => ({}))
    return NextResponse.json(
      { message: error.message ?? 'Erro ao criar conta' },
      { status: registerRes.status }
    )
  }

  // Registro bem-sucedido — faz login automático para obter o token
  const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!loginRes.ok) {
    // Conta criada mas login automático falhou — usuário faz login manualmente
    return NextResponse.json({ redirectToLogin: true }, { status: 201 })
  }

  const loginData = await loginRes.json()
  const cookieStore = await cookies()

  cookieStore.set('auth_token', loginData.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return NextResponse.json({ user: loginData.user })
}
