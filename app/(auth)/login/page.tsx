'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function InviteBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('convite') !== 'aceito') return null
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm"
      style={{
        background: 'rgba(95,130,96,0.12)',
        color: 'var(--zels-primary-strong)',
        border: '1px solid rgba(95,130,96,0.25)',
      }}
    >
      Conta criada com sucesso! Faça login para acessar o Zel&apos;s.
    </div>
  )
}

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginData) {
    setServerError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setServerError(err.message ?? 'Erro ao entrar. Tente novamente.')
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 px-8 py-9 space-y-7">
        <div className="space-y-1.5">
          <div className="mb-16">
            <ZelsLogo size={72} showTagline />
          </div>
          <h1 className="text-[1.375rem] font-heading leading-tight text-foreground mt-5">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-zels-text-soft">
            Acesse sua conta para continuar
          </p>
        </div>

        <Suspense fallback={null}>
          <InviteBanner />
        </Suspense>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="h-10 text-base md:text-sm"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-10 pr-10 text-base md:text-sm"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zels-text-faint hover:text-zels-text-soft transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
            <div className="flex justify-end">
              <Link
                href="/esqueci-minha-senha"
                className="text-[0.82rem] font-bold text-zels-primary underline-offset-4 hover:underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </div>

          {serverError && (
            <div className="rounded-lg bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 mt-1"
            style={{ color: '#ffffff' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-zels-text-soft">
          Não tem conta?{' '}
          <Link
            href="/cadastro"
            className="font-medium text-zels-primary underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
