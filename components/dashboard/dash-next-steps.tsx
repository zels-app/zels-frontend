'use client'

import Link from 'next/link'
import { useHealthProfile } from '@/lib/api/health-profile'
import {
  useAppointmentsUpcoming,
  type Appointment,
  type AppointmentKind,
} from '@/hooks/useAppointmentsUpcoming'

const KIND_LABELS: Record<AppointmentKind, string> = {
  CONSULTATION: 'CONSULTA',
  EXAM:         'EXAME',
  THERAPY:      'TERAPIA',
  VACCINE:      'VACINA',
  OTHER:        'OUTRO',
}

function formatDate(dateStr: string): string {
  const d    = new Date(dateStr)
  const now  = new Date()
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const day      = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const h = d.getHours()
  const m = d.getMinutes()
  const t = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`

  if (day.getTime() === today.getTime())    return `hoje · ${t}`
  if (day.getTime() === tomorrow.getTime()) return `amanhã · ${t}`

  const wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const dt = d.getDate()
  const mo = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${wd}, ${dt} ${mo} · ${t}`
}

function ApptCard({ appt }: { appt: Appointment }) {
  return (
    <Link href="/agenda" style={{
      display: 'block',
      textDecoration: 'none',
      backgroundColor: '#ffffff',
      border: '1px solid rgba(61,43,31,0.08)',
      borderRadius: '12px',
      padding: '0.75rem',
      marginBottom: '0.5rem',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--zels-primary-strong)',
          backgroundColor: 'rgba(139,175,138,0.12)',
          padding: '0.125rem 0.375rem', borderRadius: '4px',
        }}>
          {KIND_LABELS[appt.kind] ?? appt.kind}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '0.65625rem', color: 'rgba(61,43,31,0.42)' }}>
          {formatDate(appt.scheduledAt)}
        </span>
      </div>
      <p style={{ fontSize: '0.90625rem', fontWeight: 600, color: '#3D2B1F' }}>
        {appt.title}
      </p>
      {appt.professional && (
        <p style={{ fontSize: '0.78125rem', color: 'rgba(61,43,31,0.68)', marginTop: '2px' }}>
          {appt.professional}
        </p>
      )}
      {appt.location && (
        <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)', marginTop: '1px' }}>
          {appt.location}
        </p>
      )}
    </Link>
  )
}

export function DashNextSteps() {
  const { data: profile }                  = useHealthProfile()
  const { data: appointments, isLoading }  = useAppointmentsUpcoming(profile?.id)

  const list = Array.isArray(appointments) ? appointments : []

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <Link href="/agenda" style={{
          fontFamily: 'monospace',
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--zels-primary)',
          textDecoration: 'none',
          cursor: 'pointer',
        }}>
          PRÓXIMOS COMPROMISSOS
        </Link>
      </div>

      {isLoading && (
        <>
          <div className="animate-pulse" style={{ height: '4.5rem', backgroundColor: '#efece5', borderRadius: '12px', marginBottom: '0.5rem' }} />
          <div className="animate-pulse" style={{ height: '4.5rem', backgroundColor: '#efece5', borderRadius: '12px', marginBottom: '0.5rem' }} />
        </>
      )}

      {!isLoading && list.length === 0 && (
        <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.42)', paddingTop: '0.5rem', marginBottom: '0.75rem' }}>
          Nenhum compromisso agendado.
        </p>
      )}

      {!isLoading && list.map(appt => <ApptCard key={appt.id} appt={appt} />)}

      {/* Card resumo médico */}
      <div style={{
        backgroundColor: '#efece5',
        border: '1.5px dashed rgba(61,43,31,0.15)',
        borderRadius: '12px',
        padding: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        marginTop: '0.25rem',
      }}>
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(61,43,31,0.68)', lineHeight: 1.3 }}>
            Resumo médico atualizado
          </p>
          <p style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.42)', marginTop: '2px' }}>
            Pronto para imprimir
          </p>
        </div>
        <Link
          href="/resumo"
          style={{
            fontSize: '0.75rem', fontWeight: 600,
            padding: '0.375rem 0.75rem', borderRadius: '7px',
            backgroundColor: 'var(--primary)', color: '#fff',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          Abrir
        </Link>
      </div>
    </div>
  )
}
