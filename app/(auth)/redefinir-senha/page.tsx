'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive leading-relaxed">
          Link inválido. Solicite um novo link de redefinição de senha.
        </div>
        <p className="text-center text-sm text-zels-text-soft">
          <Link
            href="/esqueci-minha-senha"
            className="font-medium text-zels-primary underline-offset-4 hover:underline"
          >
            Solicitar novo link
          </Link>
        </p>
      </div>
    )
  }

  function validate() {
    const errors: { newPassword?: string; confirmPassword?: string } = {}
    if (!newPassword) {
      errors.newPassword = 'Nova senha obrigatória'
    } else if (newPassword.length < 8) {
      errors.newPassword = 'A senha deve ter pelo menos 8 caracteres'
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmação obrigatória'
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem'
    }
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setServerError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/proxy/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      if (res.ok) {
        setSuccess(true)
        return
      }
      if (res.status === 400) {
        setServerError('Este link é inválido ou já expirou. Solicite um novo link.')
        return
      }
      setServerError('Erro ao redefinir a senha. Tente novamente.')
    } catch {
      setServerError('Não foi possível conectar ao servidor. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-5 py-2">
        <div
          className="flex items-center justify-center rounded-full size-14"
          style={{ background: 'rgba(139,175,138,0.15)' }}
        >
          <CheckCircle size={26} style={{ color: '#5F8260' }} />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[1.375rem] font-heading leading-tight text-foreground">
            Senha redefinida!
          </h1>
          <p className="text-sm text-zels-text-soft">
            Sua senha foi atualizada com sucesso.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium transition-colors w-full"
          style={{ background: '#8BAF8A', color: '#ffffff' }}
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Nova senha</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-10 pr-10 text-base md:text-sm"
            aria-invalid={!!fieldErrors.newPassword}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }))
            }}
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
        {fieldErrors.newPassword && (
          <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-10 pr-10 text-base md:text-sm"
            aria-invalid={!!fieldErrors.confirmPassword}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
            }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zels-text-faint hover:text-zels-text-soft transition-colors"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-lg bg-destructive/8 px-3 py-2.5 text-sm text-destructive leading-relaxed">
          {serverError}{' '}
          {serverError.includes('expirou') && (
            <Link
              href="/esqueci-minha-senha"
              className="font-medium underline underline-offset-4"
            >
              Solicitar novo link
            </Link>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-10 mt-1"
        disabled={loading}
      >
        {loading ? 'Redefinindo…' : 'Redefinir senha'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 px-8 py-9 space-y-7">
        <div className="space-y-1.5">
          <ZelsLogo size={48} showTagline />
          <h1 className="text-[1.375rem] font-heading leading-tight text-foreground mt-5">
            Redefinir senha
          </h1>
          <p className="text-sm text-zels-text-soft">
            Crie uma nova senha para sua conta.
          </p>
        </div>

        <Suspense fallback={<div className="text-sm text-zels-text-soft">Carregando…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
