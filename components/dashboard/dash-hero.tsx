'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useEmergency } from '@/lib/api/emergency'
import { useAlerts } from '@/hooks/useAlerts'
import { useMedicationsToday, type DoseSummary } from '@/hooks/useMedicationsToday'
import { useVitalsLatest } from '@/hooks/useVitalsLatest'
import { useAppointmentsUpcoming, type Appointment } from '@/hooks/useAppointmentsUpcoming'

const BLOOD_TYPE: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+',  B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')
}

function HeroStat({
  label, value, sub, urgent,
}: {
  label: string
  value: string
  sub?: string
  urgent?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10.5px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#ffffff',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '26px',
        fontWeight: 600,
        lineHeight: 1,
        color: urgent ? '#E05535' : '#ffffff',
      }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '11.5px', color: 'rgba(250,248,245,0.78)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function SkeletonLine({ width = '75%' }: { width?: string }) {
  return (
    <div className="animate-pulse" style={{ height: '0.875rem', backgroundColor: '#efece5', borderRadius: '4px', width }} />
  )
}

function apptWhen(appt: Appointment): string {
  const d    = new Date(appt.scheduledAt)
  const now  = new Date()
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const apptDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const m  = d.getMinutes()
  const t  = m === 0 ? `${d.getHours()}h` : `${d.getHours()}h${String(m).padStart(2, '0')}`
  if (apptDay.getTime() === today.getTime())    return `hoje às ${t}`
  if (apptDay.getTime() === tomorrow.getTime()) return `amanhã às ${t}`
  return `${d.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${t}`
}

function buildNarrative(
  meds: DoseSummary | undefined,
  appointments: Appointment[] | undefined,
  isSelf: boolean,
): string {
  if (!meds) return isSelf
    ? 'Acompanhe seus registros e atividades de hoje.'
    : 'Acompanhe os registros e atividades de hoje.'

  const next = Array.isArray(appointments) && appointments.length > 0
    ? appointments[0] : null
  const apptSuffix = next
    ? (next.professional
        ? ` ${next.professional} avalia tudo ${apptWhen(next)}.`
        : ` ${next.title} ${apptWhen(next)}.`)
    : ''

  if (meds.late > 0) {
    const n = meds.late
    if (isSelf) {
      return `Manhã em andamento. Você ainda não tomou ${n} dose${n > 1 ? 's' : ''} de medicamento.${apptSuffix}`
    }
    return `Manhã em andamento. ${n} dose${n > 1 ? 's' : ''} de medicamento ainda não administrada${n > 1 ? 's' : ''}.${apptSuffix}`
  }
  if (meds.total > 0 && meds.taken === meds.total) {
    if (isSelf) return `Dia correndo bem. Você tomou todas as doses.${apptSuffix}`
    return `Dia correndo bem. Todas as doses administradas.${apptSuffix}`
  }
  return isSelf
    ? 'Acompanhe seus registros e atividades de hoje.'
    : 'Acompanhe os registros e atividades de hoje.'
}

export function DashHero({ isSelf }: { isSelf: boolean }) {
  const { data: profile }      = useHealthProfile()
  const { data: emergency }    = useEmergency(profile?.id)
  const { data: alertsData }   = useAlerts(profile?.id)
  const alertCount = Array.isArray(alertsData)
    ? alertsData.filter((a) => a.level === 'urgent' || a.level === 'warning').length
    : (alertsData as { alerts?: { level: string }[] } | undefined)?.alerts?.filter((a) => a.level === 'urgent' || a.level === 'warning').length ?? 0
  const { data: medsData }     = useMedicationsToday(profile?.id)
  const { data: vitals }       = useVitalsLatest(profile?.id)
  const { data: appointments } = useAppointmentsUpcoming(profile?.id)

  const patient    = emergency?.patient
  const firstName  = patient?.name.split(' ')[0] ?? '…'
  const bloodLabel = BLOOD_TYPE[patient?.bloodType ?? ''] ?? patient?.bloodType ?? '—'

  const meds      = medsData?.summary
  const medsValue = meds ? `${meds.taken}/${meds.total}` : '—'
  const medsLate  = meds?.late ?? 0
  const medsUrgent = medsLate > 0

  const bp      = vitals?.blood_pressure
  const bpValue = bp
    ? (bp.systolic !== undefined && bp.diastolic !== undefined
        ? `${bp.systolic}/${bp.diastolic}`
        : String(bp.value ?? '—'))
    : '--/--'

  const hr      = vitals?.heart_rate
  const hrValue = hr?.value !== undefined ? String(hr.value) : '—'

  const glucose      = vitals?.blood_glucose
  const glucoseValue = glucose?.value !== undefined ? String(glucose.value) : '—'

  const narrative = buildNarrative(medsData?.summary, appointments, isSelf)
  const medsLoaded = medsData !== undefined

  return (
    <div className="flex flex-col lg:flex-row gap-6" style={{ alignItems: 'flex-start' }}>

      {/* ── Coluna esquerda ─────────────────────────────────── */}
      <div className="lg:flex-[1.5]" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Identidade do paciente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.75rem', height: '2.75rem',
            borderRadius: '50%',
            backgroundColor: 'var(--zels-avatar-patient)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: '0.875rem',
            flexShrink: 0,
          }}>
            {patient ? initials(patient.name) : '…'}
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#3D2B1F' }}>
              {patient?.name ?? '…'}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)', marginTop: '1px' }}>
              {patient ? `Pessoa cuidada · ${patient.age} anos · ${bloodLabel}` : '…'}
            </p>
          </div>
        </div>

        {/* Título gigante */}
        <div>
          <h1 style={{
            fontSize: 'clamp(2rem, 6vw, 3.25rem)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.02,
            color: '#3D2B1F',
            margin: 0,
          }}>
            {isSelf ? 'Seu dia' : `O dia de ${firstName}`}
          </h1>
          <h1 style={{
            fontSize: 'clamp(2rem, 6vw, 3.25rem)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.02,
            color: '#3D2B1F',
            marginTop: '0.1em',
          }}>
            {alertCount > 0 ? (
              <span style={{ color: '#B8341A', fontStyle: 'italic' }}>
                precisa de atenção
              </span>
            ) : (
              <span style={{ color: '#5F8260', fontStyle: 'italic' }}>
                está acompanhado
              </span>
            )}
          </h1>
        </div>

        {/* Parágrafo descritivo */}
        <div style={{ maxWidth: '42ch' }}>
          {medsLoaded ? (
            <p style={{
              fontSize: '0.96875rem',
              lineHeight: 1.55,
              color: 'rgba(61,43,31,0.68)',
              margin: 0,
            }}>
              {narrative}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <SkeletonLine />
              <SkeletonLine width="90%" />
              <SkeletonLine width="60%" />
            </div>
          )}
        </div>
      </div>

      {/* ── Coluna direita ──────────────────────────────────── */}
      <div className="lg:flex-1" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Card de stats */}
        <div style={{
          backgroundColor: '#2C3E2D',
          border: '1px solid rgba(250,248,245,0.08)',
          borderRadius: '14px',
          padding: '1.25rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem 1.5rem' }}>
            <HeroStat
              label="MEDS HOJE"
              value={medsValue}
              sub={medsUrgent ? `${medsLate} atrasada${medsLate > 1 ? 's' : ''}` : undefined}
              urgent={medsUrgent}
            />
            <HeroStat
              label="PRESSÃO 7d"
              value={bpValue}
              sub={bp?.unit ?? 'mmHg'}
            />
            <HeroStat
              label="GLICEMIA"
              value={glucoseValue}
              sub={glucose?.unit ?? 'mg/dL'}
            />
            <HeroStat
              label="FREQ. CARDÍACA"
              value={hrValue}
              sub={hr?.unit ?? 'bpm'}
            />
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px',
          padding: '6px 2px 2px',
        }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#3D2B1F', opacity: 0.35, marginTop: '2px', flexShrink: 0 }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{
            fontSize: '0.625rem',
            color: '#3D2B1F',
            opacity: 0.4,
            lineHeight: 1.5,
          }}>
            O zel&apos;s exibe os registros inseridos pelo ciclo de cuidados. Não interpreta nem emite alertas sobre sinais vitais.
          </span>
        </div>

        {/* Banner de emergência */}
        <Link
          href="/ficha-emergencia"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(184,52,26,0.06)',
            border: '1px solid rgba(184,52,26,0.15)',
            borderRadius: '12px',
            textDecoration: 'none',
          }}
        >
          <ShieldAlert size={16} style={{ color: '#B8341A', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'rgba(61,43,31,0.68)' }}>
            Ficha rápida de emergência
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#B8341A', flexShrink: 0 }}>
            Abrir →
          </span>
        </Link>
      </div>

    </div>
  )
}
