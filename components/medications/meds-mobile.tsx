'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, MoreHorizontal, Plus, ChevronDown, ChevronUp, Clock, Pill } from 'lucide-react'
import { toast } from 'sonner'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import { getAccessInfo } from '@/lib/access-level'
import { useMedicationsToday, type Dose } from '@/hooks/useMedicationsToday'
import { useMedications, type Medication } from '@/hooks/useMedications'
import { useLogDose } from '@/hooks/useLogDose'
import { EditLogDialog, type EditLogProps } from '@/components/medications/edit-log-dialog'
import { PrescriptionDialog } from '@/components/medications/prescription-dialog'
import { PageHeader } from '@/components/layout/page-header'

// ── design tokens ─────────────────────────────────────────────────────────────

const c = {
  sans: 'var(--font-sans, sans-serif)',
  mono: 'var(--font-jetbrains-mono, monospace)',
  ink: '#3D2B1F',
  inkSoft: 'rgba(61,43,31,0.68)',
  inkFaint: 'rgba(61,43,31,0.42)',
  raised: '#ffffff',
  sunken: '#efece5',
  primary: 'var(--zels-primary-strong)',
  urgent: '#b8341a',
  warn: '#a86e13',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function todayLabel() {
  return new Date()
    .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase()
}

function fmtHour(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getOverdueTime(scheduledTime?: string): string {
  if (!scheduledTime || !scheduledTime.includes(':')) return 'atrasada'
  const [hh, mm] = scheduledTime.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return 'atrasada'
  const scheduled = new Date()
  scheduled.setHours(hh, mm, 0, 0)
  const diffMin = Math.floor((Date.now() - scheduled.getTime()) / 60000)
  if (diffMin <= 0) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  return `há ${h}h`
}

function doseName(d: Dose) {
  return d.medicationName ?? d.name ?? 'Medicamento'
}

function normalizeStatus(s: string): 'taken' | 'late' | 'pending' {
  const l = s.toLowerCase()
  if (l === 'taken') return 'taken'
  if (l === 'late') return 'late'
  return 'pending'
}

function buildScheduledAt(timeStr: string | undefined): string | undefined {
  if (!timeStr) return undefined
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return undefined
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function timeUntil(scheduledTime: string): string {
  if (!scheduledTime || !scheduledTime.includes(':')) return ''
  const [hh, mm] = scheduledTime.split(':').map(Number)
  if (isNaN(hh) || isNaN(mm)) return ''
  const scheduled = new Date()
  scheduled.setHours(hh, mm, 0, 0)
  const diffMin = Math.round((scheduled.getTime() - Date.now()) / 60000)
  if (diffMin < 5) return 'agora'
  if (diffMin < 60) return `em ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? `em ${h}h ${m}min` : `em ${h}h`
}

function barColor(taken: number, total: number) {
  if (total === 0) return c.sunken
  const pct = (taken / total) * 100
  if (pct >= 100) return c.primary
  if (pct >= 80) return c.warn
  return c.urgent
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {([132, 164, 96] as const).map((h, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ height: h, borderRadius: 14, background: c.sunken }}
        />
      ))}
    </div>
  )
}

// ── DayProgress ───────────────────────────────────────────────────────────────

function DayProgress({
  taken,
  total,
  late,
  pending,
}: {
  taken: number
  total: number
  late: number
  pending: number
}) {
  const pct = total === 0 ? 0 : Math.min((taken / total) * 100, 100)
  const barW = taken === 0 && late > 0 ? 2 : pct

  return (
    <div
      style={{
        background: c.raised,
        border: '1px solid rgba(61,43,31,0.08)',
        borderRadius: 14,
        padding: 16,
      }}
    >
      {/* mono label */}
      <p
        style={{
          fontFamily: c.mono,
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: c.inkFaint,
          marginBottom: 10,
        }}
      >
        Dia em andamento
      </p>

      {/* counter row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 4 }}>
        <p style={{ fontFamily: c.sans, fontSize: 40, fontWeight: 700, lineHeight: 1, color: c.ink }}>
          {taken}
        </p>
        <p style={{ fontSize: 15, color: c.inkFaint, marginBottom: 6 }}>de {total}</p>
        {late > 0 && (
          <span
            style={{
              fontFamily: c.mono,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'rgba(184,52,26,0.1)',
              color: c.urgent,
              borderRadius: 20,
              padding: '3px 10px',
              marginBottom: 6,
            }}
          >
            {late} atrasada{late > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: c.inkFaint, marginBottom: 12 }}>administradas</p>

      {/* progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: c.sunken,
          overflow: 'hidden',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            background: barColor(taken, total),
            width: `${barW}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {/* legend */}
      <p style={{ fontFamily: c.mono, fontSize: 11, color: c.inkFaint }}>
        <span style={{ color: c.primary }}>✓ {taken} tomadas</span>
        {' · '}
        <span style={{ color: c.urgent }}>⚠ {late} atrasadas</span>
        {' · '}
        <span>○ {pending} pendentes</span>
      </p>
    </div>
  )
}

// ── LateCard ──────────────────────────────────────────────────────────────────

function LateCard({
  dose,
  onTaken,
  onSkip,
  onMiss,
  isPending,
}: {
  dose: Dose
  onTaken: () => void
  onSkip: () => void
  onMiss: () => void
  isPending: boolean
}) {
  return (
    <div
      style={{
        background: 'rgba(184,52,26,0.05)',
        border: '1px solid rgba(184,52,26,0.25)',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span
        style={{
          fontFamily: c.mono,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: c.urgent,
        }}
      >
        ATRASADA{getOverdueTime(dose.scheduledTime) ? ` · ${getOverdueTime(dose.scheduledTime)}` : ''}{dose.scheduledTime ? ` · (previsto às ${dose.scheduledTime})` : ''}
      </span>

      <div>
        <p
          style={{
            fontFamily: c.sans,
            fontSize: 22,
            fontWeight: 600,
            color: c.ink,
            lineHeight: 1.1,
          }}
        >
          {doseName(dose)}
        </p>
        <p style={{ fontSize: 14, color: c.inkSoft, marginTop: 2 }}>{dose.dosage}</p>
        {dose.scheduledTime && (
          <p style={{ fontFamily: c.mono, fontSize: '1rem', fontWeight: 700, color: c.ink, marginTop: 6 }}>
            {dose.scheduledTime}
          </p>
        )}
      </div>

      {/* primary CTA */}
      <button
        type="button"
        onClick={onTaken}
        disabled={isPending}
        style={{
          background: c.urgent,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '14px 0',
          fontSize: 15,
          fontWeight: 600,
          width: '100%',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Check size={18} />
        {isPending ? 'Registrando…' : 'Administrei agora'}
      </button>

      {/* secondary CTAs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {([
          { label: 'Pulei', fn: onSkip },
          { label: 'Esqueci', fn: onMiss },
        ] as const).map(({ label, fn }) => (
          <button
            key={label}
            type="button"
            onClick={fn}
            disabled={isPending}
            style={{
              background: 'transparent',
              border: '1px solid rgba(184,52,26,0.3)',
              borderRadius: 10,
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 500,
              color: c.urgent,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── NextDoseHero ──────────────────────────────────────────────────────────────

function NextDoseHero({
  dose,
  onTaken,
  isPending,
}: {
  dose: Dose
  onTaken: () => void
  isPending: boolean
}) {
  const until = dose.scheduledTime ? timeUntil(dose.scheduledTime) : ''
  const instructions = (dose as Dose & { instructions?: string }).instructions

  return (
    <div
      style={{
        background: c.raised,
        borderRadius: 14,
        borderLeft: `3px solid ${c.primary}`,
        border: '1px solid rgba(139,175,138,0.25)',
        borderLeftWidth: 3,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* topo: horário + tempo restante */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: c.mono,
            fontSize: '1rem',
            fontWeight: 700,
            color: c.ink,
            letterSpacing: '0.02em',
          }}
        >
          {dose.scheduledTime ?? (dose.scheduledAt ? fmtHour(dose.scheduledAt) : '—')}
        </span>
        {until && (
          <span style={{ fontSize: '0.8125rem', color: c.inkSoft }}>{until}</span>
        )}
      </div>

      {/* nome + dosagem + instruções */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: c.ink, lineHeight: 1.2 }}>
          {doseName(dose)}
        </p>
        <p style={{ fontSize: '0.875rem', color: c.inkSoft }}>{dose.dosage}</p>
        {instructions && (
          <p style={{ fontSize: '0.8rem', color: c.inkFaint, fontStyle: 'italic' }}>
            {instructions}
          </p>
        )}
      </div>

      {/* botão */}
      <button
        type="button"
        onClick={onTaken}
        disabled={isPending}
        style={{
          background: isPending ? 'rgba(139,175,138,0.5)' : 'var(--primary)',
          border: 'none',
          borderRadius: 10,
          padding: '12px 0',
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: '#ffffff',
          width: '100%',
          cursor: isPending ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'opacity 0.15s ease',
        }}
      >
        <Check size={16} />
        {isPending ? 'Registrando…' : 'Marcar quando administrar'}
      </button>
    </div>
  )
}

// ── UpcomingRow ───────────────────────────────────────────────────────────────

function UpcomingRow({
  dose,
  onTaken,
  isPending,
  isLast,
}: {
  dose: Dose
  onTaken: () => void
  isPending: boolean
  isLast: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom: isLast ? 'none' : '1px solid rgba(61,43,31,0.06)',
      }}
    >
      {/* horário fixo */}
      <span
        style={{
          fontFamily: c.mono,
          fontSize: '1rem',
          fontWeight: 700,
          color: c.ink,
          width: 52,
          flexShrink: 0,
        }}
      >
        {dose.scheduledTime ?? (dose.scheduledAt ? fmtHour(dose.scheduledAt) : '—')}
      </span>

      {/* nome + dosagem */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.9rem',
            fontWeight: 500,
            color: c.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {doseName(dose)}
        </p>
        <p style={{ fontSize: '0.8rem', color: c.inkSoft, marginTop: 1 }}>{dose.dosage}</p>
      </div>

      {/* botão outline verde */}
      <button
        type="button"
        onClick={onTaken}
        disabled={isPending}
        style={{
          background: 'transparent',
          border: `1px solid ${c.primary}`,
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: c.primary,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.5 : 1,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {isPending ? '…' : 'Marcar'}
      </button>
    </div>
  )
}

// ── TakenSection ──────────────────────────────────────────────────────────────

function TakenSection({ doses, onEdit }: { doses: Dose[]; onEdit: (dose: Dose) => void }) {
  if (doses.length === 0) return null
  return (
    <div>
      <p
        style={{
          fontFamily: c.mono,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: c.inkFaint,
          marginBottom: 10,
        }}
      >
        Administradas hoje · {doses.length}
      </p>
      <div
        style={{
          background: c.raised,
          border: '1px solid rgba(61,43,31,0.08)',
          borderRadius: 14,
          padding: '0 14px',
        }}
      >
        {doses.map((dose, i) => (
          <div
            key={`taken-${dose.medicationId}-${dose.scheduledTime}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 0',
              borderBottom:
                i < doses.length - 1 ? '1px solid rgba(61,43,31,0.06)' : 'none',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'rgba(139,175,138,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={12} color={c.primary} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  color: c.inkFaint,
                  textDecoration: 'line-through',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {doseName(dose)}
              </span>
              {dose.scheduledAt && (
                <span style={{ fontFamily: c.mono, fontSize: 11, color: c.inkFaint }}>
                  às {fmtHour(dose.scheduledAt)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEdit(dose)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 4,
                cursor: dose.logId ? 'pointer' : 'default',
                color: c.inkFaint,
                flexShrink: 0,
                opacity: dose.logId ? 1 : 0.4,
              }}
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function MedsMobile() {
  const router = useRouter()
  const { data: profile } = useHealthProfile()
  const { data: user }    = useCurrentUser()
  const access = getAccessInfo(user, profile)
  const { data, isLoading, isError } = useMedicationsToday(profile?.id)
  const { mutate: logDose, isPending: isLogging, variables: loggingVars } =
    useLogDose(profile?.id)
  const { data: medications = [] } = useMedications(profile?.id, true)

  const summary = data?.summary
  const doses = Array.isArray(data?.doses) ? data.doses : []

  const lateDoses = doses.filter((d) => normalizeStatus(d.status) === 'late')
  const pendingDoses = doses.filter((d) => normalizeStatus(d.status) === 'pending')
  const takenDoses = doses.filter((d) => normalizeStatus(d.status) === 'taken')

  const [firstPending, ...restPending] = pendingDoses

  const [editLog, setEditLog] = useState<EditLogProps | null>(null)
  const [showNewMed, setShowNewMed] = useState(false)
  const [editMed, setEditMed] = useState<Medication | null>(null)
  const [showPrescriptions, setShowPrescriptions] = useState(false)

  const isLoggingDose = (dose: Dose) =>
    isLogging && loggingVars?.medicationId === dose.medicationId

  function logAs(dose: Dose, status: 'TAKEN' | 'MISSED' | 'SKIPPED') {
    const scheduledAt = dose.scheduledAt ?? buildScheduledAt(dose.scheduledTime)
    if (!scheduledAt) {
      toast.error('Horário não encontrado para este medicamento.')
      return
    }
    logDose({ medicationId: dose.medicationId, scheduledAt, status })
  }

  function openEdit(dose: Dose) {
    if (!dose.logId) return
    setEditLog({
      logId: dose.logId,
      medicationId: dose.medicationId,
      medicationName: dose.medicationName ?? dose.name ?? '',
      scheduledTime: dose.scheduledTime ?? '',
      status: dose.status,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              paddingTop: 2,
              cursor: 'pointer',
              color: c.inkFaint,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <PageHeader
            overline={profile?.fullName}
            title="Medicamentos"
            subtitle={new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          />
        </div>

        {/* header actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {access.canCreate && (
            <button
              type="button"
              onClick={() => setShowNewMed(true)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: c.primary,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={16} color="#fff" />
            </button>
          )}
          {/* caregiver avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--zels-avatar-caregiver)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>C</span>
          </div>
        </div>
      </div>

      {isLoading && <Skeleton />}

      {isError && (
        <p style={{ fontSize: 14, color: c.inkSoft }}>
          Não foi possível carregar as doses de hoje.
        </p>
      )}

      {!isLoading && !isError && summary && (
        <>
          {/* ── DayProgress ── */}
          {summary.total > 0 && (
            <DayProgress
              taken={summary.taken}
              total={summary.total}
              late={summary.late}
              pending={summary.pending}
            />
          )}

          {/* ── Late section ── */}
          {lateDoses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p
                style={{
                  fontFamily: c.mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: c.urgent,
                }}
              >
                Atrasada · Resolver agora
              </p>
              {lateDoses.map((dose) => (
                <LateCard
                  key={`late-${dose.medicationId}-${dose.scheduledTime}`}
                  dose={dose}
                  onTaken={() => logAs(dose, 'TAKEN')}
                  onSkip={() => logAs(dose, 'SKIPPED')}
                  onMiss={() => logAs(dose, 'MISSED')}
                  isPending={isLoggingDose(dose)}
                />
              ))}
            </div>
          )}

          {/* ── Pending section ── */}
          {pendingDoses.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p
                style={{
                  fontFamily: c.mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: c.inkFaint,
                }}
              >
                Próximas doses
              </p>

              {firstPending && (
                <NextDoseHero
                  dose={firstPending}
                  onTaken={() => logAs(firstPending, 'TAKEN')}
                  isPending={isLoggingDose(firstPending)}
                />
              )}

              {restPending.length > 0 && (
                <div
                  style={{
                    background: c.raised,
                    border: '1px solid rgba(61,43,31,0.08)',
                    borderRadius: 14,
                    padding: '0 14px',
                  }}
                >
                  {restPending.map((dose, i) => (
                    <UpcomingRow
                      key={`upcoming-${dose.medicationId}-${dose.scheduledTime}`}
                      dose={dose}
                      onTaken={() => logAs(dose, 'TAKEN')}
                      isPending={isLoggingDose(dose)}
                      isLast={i === restPending.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Taken section ── */}
          <TakenSection doses={takenDoses} onEdit={openEdit} />

          {summary.total === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: c.inkSoft }}>
                Nenhuma dose programada para hoje.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Prescrições ativas ── */}
      {medications.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPrescriptions((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
              marginBottom: showPrescriptions ? 10 : 0,
            }}
          >
            <span
              style={{
                fontFamily: c.mono,
                fontSize: '0.656rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: c.inkFaint,
              }}
            >
              Prescrições ativas · {medications.length}
            </span>
            {showPrescriptions ? (
              <ChevronUp size={15} color={c.inkFaint} />
            ) : (
              <ChevronDown size={15} color={c.inkFaint} />
            )}
          </button>

          {showPrescriptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medications.map((med) => (
                <div
                  key={med.id}
                  style={{
                    background: c.raised,
                    border: '1px solid rgba(61,43,31,0.08)',
                    borderRadius: 14,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Pill size={13} color={c.primary} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: c.ink }}>{med.name}</span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: c.inkSoft }}>{med.dosage}</span>
                    </div>
                    {access.canManage && (
                      <button
                        type="button"
                        onClick={() => setEditMed(med)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(61,43,31,0.15)',
                          background: 'transparent',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: c.inkSoft,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {med.schedule.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={11} color={c.inkFaint} />
                      <span style={{ fontFamily: c.mono, fontSize: '0.6875rem', color: c.inkFaint }}>
                        {med.schedule.join(' · ')}
                      </span>
                    </div>
                  )}

                  {med.instructions && (
                    <p style={{ fontSize: '0.75rem', color: c.inkFaint, fontStyle: 'italic', margin: 0 }}>
                      {med.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editLog && (
        <EditLogDialog
          open={!!editLog}
          onClose={() => setEditLog(null)}
          log={editLog}
        />
      )}

      {profile?.id && (showNewMed || editMed !== null) && (
        <PrescriptionDialog
          key={editMed ? editMed.id : 'create'}
          open={true}
          onClose={() => { setShowNewMed(false); setEditMed(null) }}
          healthProfileId={profile.id}
          medication={editMed ?? undefined}
          medications={medications}
        />
      )}
    </div>
  )
}
