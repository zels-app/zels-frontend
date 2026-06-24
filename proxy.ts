import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const authToken  = request.cookies.get('auth_token')?.value
  const hasProfile = request.cookies.get('has_profile')?.value

  // Rotas públicas — nunca interceptar
  const publicPaths = [
    '/login',
    '/cadastro',
    '/esqueci-minha-senha',
    '/redefinir-senha',
    '/convite',
  ]
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Sem token → vai para login
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Com token mas sem perfil → vai para onboarding
  if (!hasProfile && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Com token e com perfil tentando acessar onboarding → vai para dashboard
  if (hasProfile && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*$).*)',
  ],
}
