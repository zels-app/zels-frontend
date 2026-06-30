'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInviteElderly } from '@/hooks/useInviteElderly'

const schema = z.object({
  email: z.email('Digite um e-mail válido'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  healthProfileId: string
  onSuccess: () => void
  onCancel?: () => void
}

export function InviteElderlyForm({ healthProfileId, onSuccess }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const { mutate, isPending } = useInviteElderly(healthProfileId)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  function onSubmit(values: FormValues) {
    setServerError(null)
    mutate(values.email, {
      onSuccess: () => {
        setShowSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 1800)
      },
      onError: (err: Error) => {
        setServerError(err.message)
      },
    })
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
          A pessoa cuidada receberá um e-mail para criar a própria conta no Zel&apos;s.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Texto explicativo */}
      <p style={{
        fontSize: '0.875rem',
        color: 'rgba(61,43,31,0.68)',
        background: 'rgba(139,175,138,0.1)',
        padding: '10px 14px',
        borderRadius: 10,
        margin: 0,
        lineHeight: 1.5,
      }}>
        Convide a pessoa cuidada para criar a própria conta e acessar o Zel&apos;s.
      </p>

      {/* Campo email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          htmlFor="elderly-invite-email"
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--zels-primary)',
          }}
        >
          E-mail da pessoa cuidada
        </label>
        <input
          id="elderly-invite-email"
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

      {/* Erro do servidor */}
      {serverError && (
        <p style={{
          fontSize: '0.85rem',
          color: '#C4846A',
          background: 'rgba(196,132,106,0.08)',
          padding: '10px 14px',
          borderRadius: 10,
          margin: 0,
        }}>
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
