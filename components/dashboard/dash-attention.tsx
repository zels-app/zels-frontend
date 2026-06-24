'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useAlerts, type Alert, type AlertLevel } from '@/hooks/useAlerts'

const LEVEL: Record<AlertLevel, {
  bg: string; border: string; badge: string; btnBg: string; cta: string
}> = {
  urgent: {
    bg: 'rgba(184,52,26,0.06)',
    border: 'rgba(184,52,26,0.2)',
    badge: '#B8341A',
    btnBg: '#B8341A',
    cta: 'Ver detalhes',
  },
  warning: {
    bg: 'rgba(168,110,19,0.06)',
    border: 'rgba(168,110,19,0.2)',
    badge: '#A86E13',
    btnBg: '#A86E13',
    cta: 'Verificar',
  },
  info: {
    bg: '#efece5',
    border: 'rgba(61,43,31,0.08)',
    badge: 'var(--zels-primary)',
    btnBg: 'var(--primary)',
    cta: 'Ver mais',
  },
}

const LEVEL_LABEL: Record<AlertLevel, string> = {
  urgent:  'Urgente',
  warning: 'Atenção',
  info:    'Info',
}

function formatWhen(when: string): string {
  return when
}

function AlertItem({
  alert,
  onDismiss,
  onNavigate,
}: {
  alert: Alert
  onDismiss: () => void
  onNavigate: () => void
}) {
  const cfg          = LEVEL[alert.level]
  const displayTitle =
    alert.level === 'info' && alert.relatedType === 'condition'
      ? (alert.detail.split(' está ')[0] ?? alert.title)
      : alert.title
  return (
    <div style={{
      backgroundColor: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: '10px',
      padding: '0.75rem',
      marginBottom: '0.625rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.08em',
          color: cfg.badge,
        }}>
          {LEVEL_LABEL[alert.level]}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.65625rem', color: 'rgba(61,43,31,0.42)' }}>
          {formatWhen(alert.when)}
        </span>
      </div>
      <p style={{ fontSize: '0.90625rem', fontWeight: 600, color: '#3D2B1F', marginBottom: '0.25rem' }}>
        {displayTitle}
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.68)', marginBottom: '0.625rem' }}>
        {alert.detail}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={onNavigate} style={{
          fontSize: '0.75rem', fontWeight: 500,
          padding: '0.3125rem 0.625rem', borderRadius: '6px',
          backgroundColor: cfg.btnBg, color: '#fff',
          border: 'none', cursor: 'pointer',
        }}>
          {cfg.cta}
        </button>
        <button type="button" onClick={onDismiss} style={{
          fontSize: '0.75rem', fontWeight: 500,
          padding: '0.3125rem 0.625rem', borderRadius: '6px',
          backgroundColor: 'transparent', color: 'rgba(61,43,31,0.68)',
          border: '1px solid rgba(61,43,31,0.12)', cursor: 'pointer',
        }}>
          Dispensar
        </button>
      </div>
    </div>
  )
}

export function DashAttention() {
  const router                      = useRouter()
  const { data: profile }           = useHealthProfile()
  const { data: alerts, isLoading } = useAlerts(profile?.id)
  const [dismissed, setDismissed]   = useState<string[]>([])

  const allAlerts = Array.isArray(alerts) ? alerts : []
  const list      = allAlerts.filter((a, i) => !dismissed.includes(a.id ?? String(i)))

  function dismissAlert(a: Alert, i: number) {
    setDismissed(prev => [...prev, a.id ?? String(i)])
  }

  function navigateAlert(a: Alert) {
    if (a.relatedType === 'medication') router.push('/medicamentos')
    else if (a.relatedType === 'condition') router.push('/condicoes')
  }

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{
          fontFamily: 'monospace',
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
          color: '#B8341A',
        }}>
          ATENÇÃO
        </p>
        <p style={{ fontSize: '0.78125rem', color: 'rgba(61,43,31,0.68)', marginTop: '2px' }}>
          {isLoading ? '…' : `${list.length} iten${list.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isLoading && (
        <>
          <div className="animate-pulse" style={{ height: '5.5rem', backgroundColor: '#efece5', borderRadius: '10px', marginBottom: '0.625rem' }} />
          <div className="animate-pulse" style={{ height: '5.5rem', backgroundColor: '#efece5', borderRadius: '10px' }} />
        </>
      )}

      {!isLoading && list.length === 0 && (
        <p style={{
          textAlign: 'center', paddingTop: '2rem',
          fontSize: '0.8125rem', color: 'rgba(61,43,31,0.42)',
        }}>
          Nenhum alerta no momento
        </p>
      )}

      {!isLoading && list.map((a, i) => (
        <AlertItem
          key={a.id ?? i}
          alert={a}
          onDismiss={() => dismissAlert(a, i)}
          onNavigate={() => navigateAlert(a)}
        />
      ))}
    </div>
  )
}
