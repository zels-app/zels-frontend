'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Heart, Users, CheckCircle2 } from 'lucide-react'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/lib/api/user'
import { useHealthProfile } from '@/lib/api/health-profile'
import { api, ApiError } from '@/lib/api/client'

type UserRole = 'ELDERLY' | 'CURATOR'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Nome completo obrigatório'),
  birthDate: z.string().min(1, 'Data de nascimento obrigatória'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    error: () => ({ message: 'Selecione um gênero' }),
  }),
  bloodType: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'], {
      error: () => ({ message: 'Selecione um tipo sanguíneo' }),
    }).optional(),
  ),
  hasDigitalDependency: z.boolean(),
  emergencyNotes: z.string().optional(),
})

type ProfileData = z.infer<typeof profileSchema>

// Styled to match the Input component (base-ui) since there is no shadcn Select/Textarea
const fieldClass =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { data: profile, isLoading: profileLoading } = useHealthProfile()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [role, setRole] = useState<UserRole>('CURATOR')
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileLoading && profile) {
      router.replace('/dashboard')
    }
  }, [profile, profileLoading, router])

  const firstName = user?.displayName ?? user?.name?.split(' ')[0] ?? 'você'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { hasDigitalDependency: false },
  })

  function selectRole(chosen: UserRole) {
    setRole(chosen)
    setStep(2)
  }

  async function onSubmit(data: ProfileData) {
    setServerError(null)
    try {
      await api.patch('/users/me', { role })

      const { fullName, birthDate, gender, hasDigitalDependency, bloodType, emergencyNotes } = data
      const body = {
        fullName,
        birthDate,
        gender,
        hasDigitalDependency,
        ...(bloodType ? { bloodType } : {}),
        ...(emergencyNotes ? { emergencyNotes } : {}),
      }
      // Backend endpoint is POST /health-profile (singular) per backend/CLAUDE.md
      await api.post('/health-profile', body)
      await fetch('/api/auth/set-profile-cookie', { method: 'POST' })
      setStep(3)
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível criar o perfil. Tente novamente.',
      )
    }
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center py-10 px-6">
      <div className="w-full max-w-lg space-y-8">
        <p
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--zels-text-faint)' }}
        >
          Passo {step} de 3
        </p>

        {/* ── Passo 1: escolha de papel ─────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <ZelsLogo size={40} />

            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl sm:text-3xl leading-tight">
                Olá, {firstName}!<br />Vamos começar.
              </h1>
              <p className="text-sm" style={{ color: 'var(--zels-text-soft)' }}>
                O Zel's organiza o cuidado de quem você ama. Primeiro, precisamos
                entender seu papel.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => selectRole('ELDERLY')}
                className="flex items-start gap-4 rounded-2xl border-2 border-transparent p-5 text-left transition-all duration-200 hover:border-zels-primary bg-card ring-1 ring-black/5 w-full"
              >
                <span
                  className="mt-0.5 shrink-0 rounded-xl p-2.5 text-zels-primary-strong"
                  style={{ background: 'var(--zels-primary-soft)' }}
                >
                  <Heart size={22} />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Sou o próprio idoso</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--zels-text-soft)' }}>
                    Vou registrar minha própria saúde no Zel's.
                  </p>
                </div>
              </button>

              <button
                onClick={() => selectRole('CURATOR')}
                className="flex items-start gap-4 rounded-2xl border-2 border-transparent p-5 text-left transition-all duration-200 hover:border-zels-primary bg-card ring-1 ring-black/5 w-full"
              >
                <span
                  className="mt-0.5 shrink-0 rounded-xl p-2.5 text-zels-primary-strong"
                  style={{ background: 'var(--zels-primary-soft)' }}
                >
                  <Users size={22} />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Estou cuidando de alguém</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--zels-text-soft)' }}>
                    Sou familiar ou cuidador e vou gerenciar a saúde de outra pessoa.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Passo 2: formulário de perfil ─────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl sm:text-3xl leading-tight">
                {role === 'ELDERLY' ? 'Seus dados de saúde' : 'Dados de quem você cuida'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--zels-text-soft)' }}>
                {role === 'ELDERLY'
                  ? 'Preencha seus dados para que a família possa acompanhar seu cuidado.'
                  : "Preencha os dados da pessoa que você vai cuidar no Zel's."}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ex: José da Silva"
                  className="h-10"
                  aria-invalid={!!errors.fullName}
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  className="h-10"
                  aria-invalid={!!errors.birthDate}
                  {...register('birthDate')}
                />
                {errors.birthDate && (
                  <p className="text-xs text-destructive">{errors.birthDate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender">Gênero</Label>
                <select
                  id="gender"
                  className={fieldClass}
                  aria-invalid={!!errors.gender}
                  {...register('gender')}
                >
                  <option value="">Selecione</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
                {errors.gender && (
                  <p className="text-xs text-destructive">
                    {errors.gender.message || 'Selecione o gênero'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bloodType">Tipo sanguíneo</Label>
                <select
                  id="bloodType"
                  className={fieldClass}
                  aria-invalid={!!errors.bloodType}
                  {...register('bloodType')}
                >
                  <option value="">Não sei / Informar depois</option>
                  <option value="A_POS">A+</option>
                  <option value="A_NEG">A-</option>
                  <option value="B_POS">B+</option>
                  <option value="B_NEG">B-</option>
                  <option value="AB_POS">AB+</option>
                  <option value="AB_NEG">AB-</option>
                  <option value="O_POS">O+</option>
                  <option value="O_NEG">O-</option>
                </select>
                {errors.bloodType && (
                  <p className="text-xs text-destructive">
                    {errors.bloodType.message || 'Selecione o tipo sanguíneo'}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-input p-3">
                <input
                  id="hasDigitalDependency"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded"
                  style={{ accentColor: 'var(--zels-primary)' }}
                  {...register('hasDigitalDependency')}
                />
                <div>
                  <Label
                    htmlFor="hasDigitalDependency"
                    className="cursor-pointer font-normal leading-snug"
                  >
                    Esta pessoa tem dificuldade com tecnologia
                  </Label>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--zels-text-faint)' }}>
                    O Zel's vai priorizar fluxos mais simples, como WhatsApp.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergencyNotes">Observações de emergência (opcional)</Label>
                <textarea
                  id="emergencyNotes"
                  rows={3}
                  placeholder="Ex: Diabético, usa Losartana, alérgico a penicilina"
                  className={`${fieldClass} h-auto py-2 resize-none`}
                  {...register('emergencyNotes')}
                />
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
                {isSubmitting ? 'Criando perfil…' : 'Criar perfil e continuar →'}
              </Button>
            </form>
          </div>
        )}

        {/* ── Passo 3: confirmação ──────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center space-y-5 pt-6">
            <CheckCircle2 size={64} style={{ color: 'var(--zels-primary)' }} />

            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl sm:text-3xl">
                Tudo pronto, {firstName}!
              </h1>
              <p
                className="text-sm max-w-sm mx-auto"
                style={{ color: 'var(--zels-text-soft)' }}
              >
                O perfil de saúde foi criado. Agora você pode convidar familiares e
                cuidadores para o círculo de cuidados.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 w-full max-w-xs pt-2">
              <Button
                className="w-full h-10"
                style={{ color: '#ffffff' }}
                onClick={() => {
                  router.push('/dashboard')
                  router.refresh()
                }}
              >
                Ir para o painel →
              </Button>
              <button
                className="text-sm underline-offset-4 hover:underline"
                style={{ color: 'var(--zels-primary)' }}
                onClick={() => router.push('/ciclo')}
              >
                Convidar pessoas agora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
