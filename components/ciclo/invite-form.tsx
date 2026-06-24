'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInviteByEmail } from '@/hooks/useInviteByEmail'

const schema = z.object({
  email: z.email('Digite um e-mail válido'),
  roleInProfile: z.enum(['FAMILY', 'CAREGIVER', 'CURATOR']),
  canView: z.boolean(),
  canRegister: z.boolean(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  healthProfileId: string
  onSuccess: () => void
  onCancel?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  FAMILY: 'Familiar',
  CAREGIVER: 'Cuidador(a)',
  CURATOR: 'Curador(a)',
}

export function InviteForm({ healthProfileId, onSuccess }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const { mutate, isPending } = useInviteByEmail(healthProfileId)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      roleInProfile: 'FAMILY',
      canView: true,
      canRegister: false,
    },
  })

  const role = watch('roleInProfile')

  function onSubmit(values: FormValues) {
    setServerError(null)
    mutate(
      {
        healthProfileId,
        email: values.email,
        roleInProfile: values.roleInProfile,
        canView: values.canView,
        canRegister: values.roleInProfile === 'CAREGIVER' ? true : values.canRegister,
      },
      {
        onSuccess: () => {
          setShowSuccess(true)
          setTimeout(() => {
            onSuccess()
          }, 1800)
        },
        onError: (err: Error) => {
          setServerError(err.message)
        },
      },
    )
  }

  if (showSuccess) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '32px 0',
          color: '#5F8260',
        }}
      >
        <span style={{ fontSize: 40 }}>💚</span>
        <p style={{ fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>
          Convite enviado com sucesso!
        </p>
        <p
          style={{
            fontSize: '0.85rem',
            color: '#888',
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          A pessoa receberá um e-mail e já aparecerá no ciclo de cuidados.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Campo email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="invite-email"
          style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--zels-primary)' }}
        >
          E-mail
        </label>
        <input
          id="invite-email"
          type="email"
          placeholder="email@exemplo.com"
          {...register('email')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: `1.5px solid ${errors.email ? '#C4846A' : 'rgba(61,43,31,0.15)'}`,
            fontSize: '0.95rem',
            outline: 'none',
            background: '#FDFCFA',
            color: '#3D2B1F',
          }}
        />
        {errors.email && (
          <span style={{ fontSize: '0.8rem', color: '#C4846A' }}>{errors.email.message}</span>
        )}
      </div>

      {/* Papel no ciclo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="invite-role"
          style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--zels-primary)' }}
        >
          Papel no ciclo
        </label>
        <select
          id="invite-role"
          {...register('roleInProfile')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1.5px solid rgba(61,43,31,0.15)',
            fontSize: '0.95rem',
            background: '#FDFCFA',
            color: '#3D2B1F',
            outline: 'none',
          }}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Permissões — ocultas para CAREGIVER (sempre tem canRegister) */}
      {role !== 'CAREGIVER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--zels-primary)' }}>
            Permissões
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: '#3D2B1F', cursor: 'pointer' }}>
            <input type="checkbox" {...register('canView')} />
            Pode visualizar registros
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: '#3D2B1F', cursor: 'pointer' }}>
            <input type="checkbox" {...register('canRegister')} />
            Pode registrar informações
          </label>
        </div>
      )}

      {/* Nota para CAREGIVER */}
      {role === 'CAREGIVER' && (
        <p style={{ fontSize: '0.82rem', color: '#888', background: 'rgba(139,175,138,0.1)', padding: '10px 14px', borderRadius: 10 }}>
          Cuidadores sempre têm permissão de visualizar e registrar informações.
        </p>
      )}

      {/* Erro do servidor */}
      {serverError && (
        <p style={{ fontSize: '0.85rem', color: '#C4846A', background: 'rgba(196,132,106,0.08)', padding: '10px 14px', borderRadius: 10 }}>
          {serverError}
        </p>
      )}

      {/* Botão */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          marginTop: 4,
          padding: '12px 0',
          borderRadius: 100,
          background: isPending ? 'rgba(139,175,138,0.5)' : '#8BAF8A',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.95rem',
          border: 'none',
          cursor: isPending ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {isPending ? 'Enviando...' : 'Enviar convite'}
      </button>
    </form>
  )
}
