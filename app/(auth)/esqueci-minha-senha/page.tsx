'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function validateEmail(value: string) {
    if (!value) return 'E-mail obrigatório'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail inválido'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validateEmail(email)
    if (err) {
      setEmailError(err)
      return
    }
    setEmailError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/proxy/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Erro na requisição')
      setSent(true)
    } catch {
      toast.error('Não foi possível enviar o e-mail. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 px-8 py-9 space-y-7">
          <div className="space-y-1.5">
            <ZelsLogo size={48} showTagline />
          </div>
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div
              className="flex items-center justify-center rounded-full size-14"
              style={{ background: 'rgba(139,175,138,0.15)' }}
            >
              <Mail size={26} style={{ color: '#5F8260' }} />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-[1.375rem] font-heading leading-tight text-foreground">
                Verifique seu email
              </h1>
              <p className="text-sm text-zels-text-soft leading-relaxed">
                Se este email estiver cadastrado, você receberá as instruções em breve.
                Verifique também a pasta de spam.
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-zels-text-soft">
            <Link
              href="/login"
              className="font-medium text-zels-primary underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 px-8 py-9 space-y-7">
        <div className="space-y-1.5">
          <ZelsLogo size={48} showTagline />
          <h1 className="text-[1.375rem] font-heading leading-tight text-foreground mt-5">
            Esqueceu sua senha?
          </h1>
          <p className="text-sm text-zels-text-soft">
            Digite seu email e enviaremos as instruções para redefinir sua senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="h-10 text-base md:text-sm"
              aria-invalid={!!emailError}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError(null)
              }}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-10 mt-1"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Enviar instruções'}
          </Button>
        </form>

        <p className="text-center text-sm text-zels-text-soft">
          <Link
            href="/login"
            className="font-medium text-zels-primary underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
