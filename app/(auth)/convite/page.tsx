'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const inviteSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type InviteFormData = z.infer<typeof inviteSchema>

type TokenStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'used'

type InviteInfo = {
  email: string
  roleInProfile: string
  healthProfileId: string
}

function ConvitePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('loading')
  const [inviteData, setInviteData] = useState<InviteInfo | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  })

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid')
      return
    }

    async function validateToken() {
      const res = await fetch(`/api/proxy/invites/${token}`)

      if (res.status === 404) {
        setTokenStatus('invalid')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data.message ?? '').toLowerCase()
        if (msg.includes('expir')) {
          setTokenStatus('expired')
        } else if (msg.includes('utiliz') || msg.includes('usado') || msg.includes('used')) {
          setTokenStatus('used')
        } else {
          setTokenStatus('invalid')
        }
        return
      }

      const data = await res.json()
      setInviteData(data)
      setTokenStatus('valid')
    }

    validateToken()
  }, [token])

  async function onSubmit(values: InviteFormData) {
    setServerError(null)

    const res = await fetch(`/api/proxy/invites/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        password: values.password,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setServerError(data.message ?? 'Erro ao aceitar convite. Tente novamente.')
      return
    }

    router.push('/login?convite=aceito')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 px-8 py-9 space-y-7">
        <div className="space-y-1.5">
          <ZelsLogo size={48} showTagline />
          <h1 className="text-[1.375rem] font-heading leading-tight text-foreground mt-5">
            Você foi convidado
          </h1>
          <p className="text-sm text-zels-text-soft">
            Crie sua senha para começar a acompanhar o cuidado
          </p>
        </div>

        {tokenStatus === 'loading' && (
          <div className="py-8 text-center text-sm text-zels-text-soft">
            Validando seu convite…
          </div>
        )}

        {tokenStatus !== 'loading' && tokenStatus !== 'valid' && (
          <div
            className="rounded-lg px-4 py-4 text-sm"
            style={{ background: 'rgba(184,52,26,0.08)', color: 'var(--zels-urgent)' }}
          >
            {tokenStatus === 'used' && 'Este convite já foi utilizado.'}
            {tokenStatus === 'expired' &&
              'Este convite expirou. Peça um novo convite ao responsável.'}
            {tokenStatus === 'invalid' &&
              (token
                ? 'Este link de convite é inválido.'
                : 'Nenhum convite encontrado. Verifique o link recebido por e-mail.')}
          </div>
        )}

        {tokenStatus === 'valid' && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={inviteData?.email ?? ''}
                disabled
                className="h-10 text-base md:text-sm opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                className="h-10 text-base md:text-sm"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Criar senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  className="h-10 pr-10 text-base md:text-sm"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zels-text-faint hover:text-zels-text-soft transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {serverError && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(184,52,26,0.08)', color: 'var(--zels-urgent)' }}
              >
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 mt-1"
              style={{ color: '#ffffff' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Aceitando convite…' : 'Aceitar convite'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-zels-text-soft">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="font-medium text-zels-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ConvitePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm">
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 px-8 py-9 text-center text-sm text-zels-text-soft">
            Carregando…
          </div>
        </div>
      }
    >
      <ConvitePageInner />
    </Suspense>
  )
}
