'use client'

import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import { getAccessInfo } from '@/lib/access-level'
import { useMedicationsToday, type Dose } from '@/hooks/useMedicationsToday'
import {
  useMedications,
  type Medication,
  type MedicationFrequency,
} from '@/hooks/useMedications'
import { useLogDose } from '@/hooks/useLogDose'
import type { MedicationLog } from '@/hooks/useMedicationLogs'
import { EditLogDialog, type EditLogProps } from '@/components/medications/edit-log-dialog'
import { PrescriptionDialog } from '@/components/medications/prescription-dialog'
import { useRecentMedicationLogs } from '@/hooks/useRecentMedicationLogs'
import { useDeactivateMedication } from '@/hooks/useDeactivateMedication'
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
  ok: 'var(--zels-ok)',
}

// ── helpers ───────────────────────────────────────────────────────────────────

const FREQUENCY_LABELS: Record<MedicationFrequency, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  CUSTOM: 'Personalizado',
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toLocaleDateString('en-CA')
  })
}

function isoToLocalDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}

function fmtHour(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatSince(date: string | null | undefined): string {
  if (!date) return 'data não informada'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'data não informada'
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months < 1) return 'este mês'
  if (months < 12) return `há ${months} meses`
  const years = Math.floor(months / 12)
  return `há ${years} ano${years > 1 ? 's' : ''}`
}

function fmtWhen(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

function adaptiveColor(pct: number): string {
  if (pct >= 80) return c.ok
  if (pct >= 50) return c.warn
  return c.urgent
}

function doseName(d: Dose) {
  return d.medicationName ?? d.name ?? 'Medicamento'
}

function normalizeStatus(s: string): 'taken' | 'late' | 'pending' | 'skipped' | 'missed' {
  const l = s.toLowerCase()
  if (l === 'taken')   return 'taken'
  if (l === 'late')    return 'late'
  if (l === 'skipped') return 'skipped'
  if (l === 'missed')  return 'missed'
  return 'pending'
}

function buildScheduledAt(timeStr: string | undefined): string | undefined {
  if (!timeStr || !timeStr.includes(':')) return undefined
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return undefined
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// ── heatmap cell logic ────────────────────────────────────────────────────────

type CellStatus = 'taken' | 'takenLate' | 'late' | 'missed' | 'skipped' | 'pending' | 'empty'

function getCellStatus(med: Medication, day: string, logs: MedicationLog[]): CellStatus {
  const today = new Date().toLocaleDateString('en-CA')
  const medStart = med.startDate.slice(0, 10)
  const medEnd = med.endDate?.slice(0, 10)

  if (day < medStart) return 'empty'
  if (medEnd && day > medEnd) return 'empty'

  const dayLogs = logs.filter((log) => isoToLocalDate(log.scheduledAt) === day)

  if (dayLogs.length === 0) {
    if (day < today) return 'missed'
    return 'pending'
  }

  if (dayLogs.some((log) => log.status === 'MISSED'))  return 'missed'
  if (dayLogs.some((log) => log.status === 'SKIPPED')) return 'skipped'
  if (dayLogs.every((log) => log.status === 'TAKEN')) {
    const hasLate = dayLogs.some((log) => {
      if (!log.confirmedAt) return false
      return new Date(log.confirmedAt).getTime() - new Date(log.scheduledAt).getTime() >= 30 * 60 * 1000
    })
    return hasLate ? 'takenLate' : 'taken'
  }
  if (dayLogs.some((log) => log.status === 'TAKEN'))   return 'skipped'
  if (day < today) return 'missed'
  return 'pending'
}

const CELL_COLOR: Record<CellStatus, string> = {
  taken:      c.ok,
  takenLate:  'rgba(168,110,19,0.6)',
  late:       c.urgent,
  missed:     c.urgent,
  skipped:    c.warn,
  pending:    'transparent',
  empty:      'transparent',
}

const CELL_BORDER: Record<CellStatus, string> = {
  taken:      'none',
  takenLate:  'none',
  late:       'none',
  missed:     'none',
  skipped:    'none',
  pending:    `1.5px dashed rgba(61,43,31,0.2)`,
  empty:      'none',
}

// ── weekly stats ──────────────────────────────────────────────────────────────

function computeWeeklyStats(
  medications: Medication[],
  logsByMedId: Record<string, MedicationLog[]>,
  days: string[]
) {
  const today = new Date().toLocaleDateString('en-CA')
  const pastDays = days.filter((d) => d < today)

  let totalExpected = 0
  let totalTaken = 0
  let lateCount = 0
  const dayMap: Record<string, { exp: number; taken: number }> = {}

  for (const day of pastDays) {
    let dayExp = 0
    let dayTaken = 0
    for (const med of medications) {
      const status = getCellStatus(med, day, logsByMedId[med.id] ?? [])
      if (status === 'empty') continue
      dayExp++
      totalExpected++
      if (status === 'taken' || status === 'takenLate') { totalTaken++; dayTaken++ }
      else if (status === 'missed') lateCount++
    }
    if (dayExp > 0) dayMap[day] = { exp: dayExp, taken: dayTaken }
  }

  const adherence = totalExpected === 0 ? 100 : Math.round((totalTaken / totalExpected) * 100)
  const perfectDays = Object.values(dayMap).filter((r) => r.exp > 0 && r.taken === r.exp).length

  return { adherence, lateCount, perfectDays }
}

function medAdherence(
  med: Medication,
  logs: MedicationLog[],
  days: string[]
): number {
  const today = new Date().toLocaleDateString('en-CA')
  const relevant = days.filter((d) => {
    if (d >= today) return false
    const st = getCellStatus(med, d, logs)
    return st !== 'empty'
  })
  if (relevant.length === 0) return 100
  const taken = relevant.filter((d) => {
    const s = getCellStatus(med, d, logs)
    return s === 'taken' || s === 'takenLate'
  }).length
  return Math.round((taken / relevant.length) * 100)
}

function compute30DayStats(
  medications: Medication[],
  logsByMedId: Record<string, MedicationLog[]>,
  days: string[]
): { adherence: number | null } {
  const today = new Date().toLocaleDateString('en-CA')
  const pastDays = days.filter((d) => d < today)

  let totalExpected = 0
  let totalTaken = 0

  for (const day of pastDays) {
    for (const med of medications) {
      const status = getCellStatus(med, day, logsByMedId[med.id] ?? [])
      if (status === 'empty') continue
      totalExpected++
      if (status === 'taken' || status === 'takenLate') totalTaken++
    }
  }

  if (totalExpected === 0) return { adherence: null }
  return { adherence: Math.round((totalTaken / totalExpected) * 100) }
}

// ── dialog state ──────────────────────────────────────────────────────────────

type DialogState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; medication: Medication }

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="animate-pulse" style={{ height: 64, borderRadius: 12, background: c.sunken }} />
  )
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string
  sub: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        background: c.raised,
        border: '1px solid rgba(61,43,31,0.08)',
        borderRadius: 12,
        padding: 16,
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontFamily: c.mono,
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: c.inkFaint,
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: c.mono,
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1,
          color: valueColor ?? c.ink,
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 12, color: c.inkSoft }}>{sub}</p>
    </div>
  )
}

// ── PrescriptionsList ─────────────────────────────────────────────────────────

function PrescriptionsList({
  medications,
  logsByMedId,
  days,
  isLoading,
  healthProfileId,
  onEdit,
  onNew,
  canCreate,
  canManage,
}: {
  medications: Medication[]
  logsByMedId: Record<string, MedicationLog[]>
  days: string[]
  isLoading: boolean
  healthProfileId: string | undefined
  onEdit: (med: Medication) => void
  onNew: () => void
  canCreate: boolean
  canManage: boolean
}) {
  const { mutate: deactivate, isPending: deactivating, variables: deactivatingVars } =
    useDeactivateMedication()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div
      style={{
        background: c.raised,
        border: '1px solid rgba(61,43,31,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(61,43,31,0.06)',
        }}
      >
        <div>
          <p style={{ fontFamily: c.sans, fontSize: 16, fontWeight: 600, color: c.ink }}>
            Prescrições ativas
          </p>
          <p style={{ fontSize: 12, color: c.inkFaint, marginTop: 2 }}>
            {medications.length} medicamento{medications.length !== 1 ? 's' : ''} · ordem por horário
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={onNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              background: 'rgba(139,175,138,0.12)',
              color: c.primary,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={14} />
            Nova prescrição
          </button>
        )}
      </div>

      {/* rows */}
      <div style={{ padding: '8px 0' }}>
        {isLoading && (
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!isLoading && medications.length === 0 && (
          <p style={{ padding: '24px 20px', fontSize: 14, color: c.inkSoft, textAlign: 'center' }}>
            Nenhum medicamento ativo.
          </p>
        )}

        {!isLoading &&
          medications.map((med, i) => {
            const logs = logsByMedId[med.id] ?? []
            const adh = medAdherence(med, logs, days)
            const adhColor = adaptiveColor(adh)
            const isExpired = !!med.endDate && new Date(med.endDate) < today
            const isDeactivating = deactivating && deactivatingVars?.medicationId === med.id
            return (
              <div
                key={med.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  padding: '12px 20px',
                  borderBottom:
                    i < medications.length - 1 ? '1px solid rgba(61,43,31,0.05)' : 'none',
                  alignItems: 'start',
                }}
              >
                {/* left: info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontFamily: c.sans, fontSize: 17, fontWeight: 600, color: c.ink, lineHeight: 1.2 }}>
                      {med.name}
                      <span style={{ fontSize: 13, fontWeight: 400, color: c.inkFaint, marginLeft: 8 }}>
                        {med.dosage}
                      </span>
                    </p>
                    {isExpired && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: c.urgent,
                          background: 'rgba(184,52,26,0.08)',
                          borderRadius: 20,
                          padding: '2px 7px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Prescrição vencida
                      </span>
                    )}
                  </div>
                  {med.schedule.length > 0 && (
                    <p style={{ fontFamily: c.mono, fontSize: 12, color: c.inkSoft, marginTop: 3 }}>
                      {med.schedule.slice(0, 3).join(' · ')}
                      {med.schedule.length > 3 && ' …'}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: c.inkFaint, marginTop: 3 }}>
                    {med.instructions ? `para ${med.instructions} · ` : ''}
                    desde {formatSince(med.startDate)}
                  </p>
                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => onEdit(med)}
                        style={{
                          fontSize: 11,
                          color: c.primary,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Editar
                      </button>
                      {isExpired && (
                        <button
                          type="button"
                          disabled={isDeactivating}
                          onClick={() => deactivate({ medicationId: med.id, healthProfileId: healthProfileId ?? '' })}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: c.urgent,
                            background: 'transparent',
                            border: `1px solid rgba(184,52,26,0.3)`,
                            borderRadius: 5,
                            padding: '2px 8px',
                            cursor: isDeactivating ? 'not-allowed' : 'pointer',
                            opacity: isDeactivating ? 0.5 : 1,
                          }}
                        >
                          {isDeactivating ? 'Desativando…' : 'Desativar'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* right: adherence */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingTop: 2 }}>
                  <span
                    style={{
                      fontFamily: c.mono,
                      fontSize: 14,
                      fontWeight: 700,
                      color: adhColor,
                    }}
                  >
                    {adh}%
                  </span>
                  <div
                    style={{
                      width: 56,
                      height: 4,
                      borderRadius: 2,
                      background: c.sunken,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${adh}%`,
                        background: adhColor,
                        borderRadius: 2,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: c.mono, fontSize: 10, color: c.inkFaint }}>
                    {FREQUENCY_LABELS[med.frequency]}
                  </span>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ── HeatmapCard ───────────────────────────────────────────────────────────────

function HeatmapCard({
  medications,
  logsByMedId,
  days,
  isLoading,
}: {
  medications: Medication[]
  logsByMedId: Record<string, MedicationLog[]>
  days: string[]
  isLoading: boolean
}) {
  const today = new Date().toLocaleDateString('en-CA')

  return (
    <div
      style={{
        background: c.raised,
        border: '1px solid rgba(61,43,31,0.08)',
        borderRadius: 14,
        padding: '16px 20px',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontFamily: c.sans, fontSize: 15, fontWeight: 600, color: c.ink }}>
          Últimos 7 dias
        </p>
        <p style={{ fontSize: 11, color: c.inkFaint }}>cada bloco = uma dose</p>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        {([
          { label: 'Tomada',   color: c.ok,          border: 'none' },
          { label: 'Atrasada', color: c.warn,        border: 'none' },
          { label: 'Pulada',   color: c.warn,        border: 'none' },
          { label: 'Esquecida', color: c.urgent,     border: 'none' },
          { label: 'Pendente', color: 'transparent', border: '1.5px dashed rgba(61,43,31,0.2)' },
        ] as const).map(({ label, color, border }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: color,
                border: border,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: c.inkFaint }}>{label}</span>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 28, borderRadius: 6, background: c.sunken }} />
          ))}
        </div>
      )}

      {!isLoading && medications.length === 0 && (
        <p style={{ fontSize: 14, color: c.inkSoft, textAlign: 'center', padding: '16px 0' }}>
          Nenhum medicamento ativo.
        </p>
      )}

      {!isLoading && medications.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          {/* day headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px repeat(7, 1fr)',
              gap: 4,
              marginBottom: 6,
            }}
          >
            <div />
            {days.map((day) => {
              const d = new Date(day + 'T00:00:00')
              const isToday = day === today
              return (
                <div
                  key={day}
                  style={{ textAlign: 'center' }}
                >
                  <p
                    style={{
                      fontFamily: c.mono,
                      fontSize: 10,
                      color: isToday ? c.primary : c.inkFaint,
                      fontWeight: isToday ? 700 : 400,
                      lineHeight: 1.3,
                    }}
                  >
                    {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}
                  </p>
                  <p
                    style={{
                      fontFamily: c.mono,
                      fontSize: 10,
                      color: isToday ? c.primary : c.inkFaint,
                    }}
                  >
                    {d.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* medication rows */}
          {medications.map((med) => {
            const logs = logsByMedId[med.id] ?? []
            return (
              <div
                key={med.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px repeat(7, 1fr)',
                  gap: 4,
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <div style={{ paddingRight: 8 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: c.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {med.name}
                  </p>
                  <p style={{ fontFamily: c.mono, fontSize: 10, color: c.inkFaint }}>{med.dosage}</p>
                </div>
                {days.map((day) => {
                  const status = getCellStatus(med, day, logs)
                  return (
                    <div
                      key={day}
                      title={`${med.name} — ${day}`}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: CELL_COLOR[status],
                        border: CELL_BORDER[status],
                        margin: '0 auto',
                        flexShrink: 0,
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TakenTimeDialog ───────────────────────────────────────────────────────────

function TakenTimeDialog({
  dose,
  onClose,
  onConfirm,
}: {
  dose: Dose | null
  onClose: () => void
  onConfirm: (scheduledAt: string, confirmedAt: string) => void
}) {
  const [option, setOption] = useState<'scheduled' | 'now' | 'custom'>('now')
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  if (!dose) return null

  const scheduledAt = dose.scheduledAt ?? buildScheduledAt(dose.scheduledTime) ?? new Date().toISOString()
  const scheduledTimeStr = dose.scheduledTime ?? (dose.scheduledAt ? fmtHour(dose.scheduledAt) : '—')
  const medName = dose.medicationName ?? dose.name ?? 'Medicamento'

  function handleConfirm() {
    let confirmedAt: string
    if (option === 'scheduled') {
      confirmedAt = scheduledAt
    } else if (option === 'now') {
      confirmedAt = new Date().toISOString()
    } else {
      const [h, m] = customTime.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      confirmedAt = d.toISOString()
    }
    onConfirm(scheduledAt, confirmedAt)
  }

  const OPTIONS = [
    { key: 'scheduled' as const, label: 'Na hora prevista', sub: scheduledTimeStr },
    { key: 'now'       as const, label: 'Agora',            sub: 'Registrar horário atual' },
    { key: 'custom'    as const, label: 'Outro horário',    sub: null },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(61,43,31,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '1.5rem',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 32px rgba(61,43,31,0.16)',
      }}>
        <p style={{ fontFamily: c.sans, fontSize: 16, fontWeight: 600, color: c.ink, marginBottom: 4 }}>
          Confirmar dose
        </p>
        <p style={{ fontSize: 13, color: c.inkSoft, marginBottom: 20 }}>
          {medName} · {scheduledTimeStr}
        </p>

        <p style={{
          fontSize: 11, fontWeight: 600, color: c.inkFaint,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
        }}>
          Quando foi tomado?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {OPTIONS.map(({ key, label, sub }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOption(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, width: '100%',
                border: option === key ? `1.5px solid ${c.primary}` : '1.5px solid rgba(61,43,31,0.12)',
                background: option === key ? 'rgba(139,175,138,0.08)' : '#fff',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: option === key ? `4px solid ${c.primary}` : '2px solid rgba(61,43,31,0.2)',
                transition: 'border 0.15s',
              }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: c.ink }}>{label}</p>
                {sub && <p style={{ fontSize: 11, color: c.inkFaint, marginTop: 1 }}>{sub}</p>}
              </div>
            </button>
          ))}
        </div>

        {option === 'custom' && (
          <input
            type="time"
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: '1.5px solid rgba(61,43,31,0.15)', fontSize: 14,
              fontFamily: c.mono, color: c.ink, background: '#efece5',
              marginBottom: 20, boxSizing: 'border-box',
            }}
          />
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: 'none', background: 'transparent',
              color: c.inkSoft, fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: 'none', background: 'var(--primary)',
              color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DosesToday ────────────────────────────────────────────────────────────────

function DosesToday({
  doses,
  summary,
  healthProfileId,
  isLoading,
  canCreate,
}: {
  doses: Dose[]
  summary: { taken: number; total: number } | undefined
  healthProfileId: string | undefined
  isLoading: boolean
  canCreate: boolean
}) {
  const { mutate: logDose, isPending: isLogging, variables: loggingVars } =
    useLogDose(healthProfileId)

  const [editLog,      setEditLog]      = useState<EditLogProps | null>(null)
  const [takenDialog,  setTakenDialog]  = useState<Dose | null>(null)

  function handleTaken(dose: Dose) {
    setTakenDialog(dose)
  }

  function handleConfirmTaken(scheduledAt: string, confirmedAt: string) {
    if (!takenDialog) return
    logDose({ medicationId: takenDialog.medicationId, scheduledAt, status: 'TAKEN', confirmedAt })
    setTakenDialog(null)
  }

  function handleSkipped(dose: Dose) {
    const scheduledAt = dose.scheduledAt ?? buildScheduledAt(dose.scheduledTime)
    if (!scheduledAt) {
      toast.error('Horário não encontrado para esta dose.')
      return
    }
    logDose({ medicationId: dose.medicationId, scheduledAt, status: 'SKIPPED' })
  }

  function handleMissed(dose: Dose) {
    const scheduledAt = dose.scheduledAt ?? buildScheduledAt(dose.scheduledTime)
    if (!scheduledAt) {
      toast.error('Horário não encontrado para esta dose.')
      return
    }
    logDose({ medicationId: dose.medicationId, scheduledAt, status: 'MISSED' })
  }

  const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    taken:      { label: 'Tomada',          bg: 'rgba(139,175,138,0.12)', color: c.ok },
    takenLate:  { label: 'Tomada atrasada', bg: 'rgba(168,110,19,0.1)', color: c.warn },
    late:       { label: 'Atrasada',        bg: 'rgba(184,52,26,0.08)', color: c.urgent },
    pending:    { label: 'Pendente',        bg: 'rgba(61,43,31,0.06)',  color: c.inkSoft },
    skipped:    { label: 'Pulada',          bg: 'rgba(168,110,19,0.1)', color: c.warn },
    missed:     { label: 'Esquecida',       bg: 'rgba(184,52,26,0.08)', color: c.urgent },
  }

  return (
    <div
      style={{
        background: c.raised,
        border: '1px solid rgba(61,43,31,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(61,43,31,0.06)',
        }}
      >
        <p style={{ fontFamily: c.sans, fontSize: 15, fontWeight: 600, color: c.ink }}>
          Doses de hoje
        </p>
        {summary && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontFamily: c.mono,
              fontSize: 15,
              fontWeight: 700,
              color: c.ink,
            }}>
              {summary.taken}/{summary.total}
            </span>
            {summary.total > 0 && (() => {
              const pct = Math.round((summary.taken / summary.total) * 100)
              const color = pct === 100 ? c.primary : pct >= 75 ? c.warn : c.urgent
              return (
                <span style={{
                  fontFamily: c.mono,
                  fontSize: 12,
                  fontWeight: 600,
                  color: color,
                }}>
                  · {pct}% hoje
                </span>
              )
            })()}
          </div>
        )}
      </div>

      {isLoading && (
        <div
          className="animate-pulse"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 36, borderRadius: 8, background: c.sunken }} />
          ))}
        </div>
      )}

      {!isLoading && doses.length === 0 && (
        <p style={{ padding: '24px 18px', fontSize: 14, color: c.inkSoft, textAlign: 'center' }}>
          Nenhuma dose programada para hoje.
        </p>
      )}

      {!isLoading && doses.length > 0 && (
        <div style={{ padding: '4px 0' }}>
          {/* table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 8,
              padding: '8px 18px',
              borderBottom: '1px solid rgba(61,43,31,0.05)',
            }}
          >
            {['Medicamento', 'Horário', 'Status', ''].map((h) => (
              <span
                key={h}
                style={{
                  fontFamily: c.mono,
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: c.inkFaint,
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {doses.map((dose, i) => {
            const ns = normalizeStatus(dose.status)
            const scheduledISO = dose.scheduledAt ?? buildScheduledAt(dose.scheduledTime)
            const isLate =
              ns === 'taken' &&
              !!dose.takenAt &&
              !!scheduledISO &&
              (new Date(dose.takenAt).getTime() - new Date(scheduledISO).getTime()) >= 30 * 60 * 1000
            const effectiveStatus = isLate ? 'takenLate' : ns
            const badge = STATUS_BADGE[effectiveStatus] ?? STATUS_BADGE.pending
            const isPending =
              isLogging && loggingVars?.medicationId === dose.medicationId

            return (
              <div
                key={dose.id ?? `dose-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '9px 18px',
                  borderBottom:
                    i < doses.length - 1 ? '1px solid rgba(61,43,31,0.04)' : 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: c.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {dose.medicationName ?? dose.name ?? '—'}
                  </p>
                  <p style={{ fontSize: 11, color: c.inkFaint }}>{dose.dosage}</p>
                  {isLate && dose.takenAt && (
                    <p style={{ fontSize: 11, color: c.warn }}>
                      tomada às {fmtHour(dose.takenAt)}
                    </p>
                  )}
                </div>
                <span style={{ fontFamily: c.mono, fontSize: 12, color: c.inkSoft, whiteSpace: 'nowrap' }}>
                  {dose.scheduledAt
                    ? fmtHour(dose.scheduledAt)
                    : dose.scheduledTime ?? '—'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    background: badge.bg,
                    color: badge.color,
                    borderRadius: 20,
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {canCreate && (ns === 'taken' || ns === 'skipped' || ns === 'missed') && dose.logId && (
                    <button
                      type="button"
                      onClick={() => setEditLog({
                        logId: dose.logId!,
                        medicationId: dose.medicationId,
                        medicationName: dose.medicationName ?? dose.name ?? '—',
                        scheduledTime: dose.scheduledTime ?? '—',
                        status: dose.status,
                      })}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 400,
                        color: 'rgba(61,43,31,0.42)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Alterar
                    </button>
                  )}
                  {canCreate && (ns === 'pending' || ns === 'late') && (
                    <>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleTaken(dose)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          color: c.primary,
                          background: 'rgba(139,175,138,0.10)',
                          border: 'none',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          opacity: isPending ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Check size={11} />
                        {isPending ? '…' : 'Marcar'}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSkipped(dose)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 400,
                          color: c.inkSoft,
                          background: 'transparent',
                          border: '1px solid rgba(61,43,31,0.12)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          opacity: isPending ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Pulei
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleMissed(dose)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 400,
                          color: c.inkSoft,
                          background: 'transparent',
                          border: '1px solid rgba(61,43,31,0.12)',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          opacity: isPending ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Esqueci
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editLog && (
        <EditLogDialog
          open={true}
          onClose={() => setEditLog(null)}
          log={editLog}
        />
      )}

      {takenDialog && (
        <TakenTimeDialog
          dose={takenDialog}
          onClose={() => setTakenDialog(null)}
          onConfirm={handleConfirmTaken}
        />
      )}
    </div>
  )
}

// ── ActivityLog ───────────────────────────────────────────────────────────────

const STATUS_PT: Record<string, string> = {
  TAKEN: 'administrada',
  MISSED: 'não tomada',
  SKIPPED: 'pulada',
}

function ActivityLog({ healthProfileId }: { healthProfileId: string | undefined }) {
  const { data: recentLogs, isLoading, isError, error } = useRecentMedicationLogs(healthProfileId)

  if (isError) console.error('[ActivityLog] erro:', error)

  const logs = [...(recentLogs ?? [])].sort((a, b) => {
    const ta = new Date(a.confirmedAt ?? a.scheduledAt).getTime()
    const tb = new Date(b.confirmedAt ?? b.scheduledAt).getTime()
    return tb - ta
  })

  return (
    <div
      style={{
        background: c.raised,
        border: '1px solid rgba(61,43,31,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(61,43,31,0.06)',
        }}
      >
        <p style={{ fontFamily: c.sans, fontSize: 15, fontWeight: 600, color: c.ink }}>
          Atividade recente
        </p>
        <span style={{ fontSize: 12, color: c.primary, cursor: 'pointer' }}>
          histórico →
        </span>
      </div>

      {isLoading && (
        <div className="animate-pulse" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 28, borderRadius: 6, background: c.sunken }} />
          ))}
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <p style={{ padding: '24px 18px', fontSize: 14, color: c.inkSoft, textAlign: 'center' }}>
          Nenhum registro recente.
        </p>
      )}

      {!isLoading && logs.map((log, i) => {
        const ts = new Date(log.confirmedAt ?? log.scheduledAt).getTime()
        return (
          <div
            key={log.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr',
              gap: 12,
              padding: '10px 18px',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(61,43,31,0.04)' : 'none',
              alignItems: 'start',
            }}
          >
            <span style={{ fontFamily: c.mono, fontSize: 12, color: c.inkSoft, paddingTop: 1 }}>
              {fmtWhen(ts)}
            </span>
            <p style={{ fontSize: 13.5, color: c.ink }}>
              Marcou{' '}
              <span style={{ fontWeight: 600, color: c.inkSoft }}>{log.medicationName}</span>
              {!log.isActive && (
                <span style={{ fontSize: 11, color: c.inkFaint, marginLeft: 4 }}>
                  (prescrição encerrada)
                </span>
              )}
              {' '}como {STATUS_PT[log.status] ?? log.status.toLowerCase()}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export function MedsDesktop() {
  const { data: profile } = useHealthProfile()
  const { data: user }    = useCurrentUser()
  const { data: medications, isLoading: medsLoading } = useMedications(profile?.id)
  const { data: todayData, isLoading: todayLoading } = useMedicationsToday(profile?.id)
  const [dialogState, setDialogState] = useState<DialogState>({ mode: 'closed' })
  const access = getAccessInfo(user, profile)

  const days = getLast7Days()
  const days30 = getLast30Days()
  const fromDate = days30[0]
  const toDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA')
  })()

  const logQueries = useQueries({
    queries: (medications ?? []).map((med) => ({
      queryKey: ['medications', 'logs', med.id, fromDate, toDate],
      queryFn: () =>
        api
          .get<MedicationLog[]>(`/medications/${med.id}/logs?from=${fromDate}&to=${toDate}`)
          .then((res) => (Array.isArray(res) ? res : [])),
      enabled: !!medications,
    })),
  })

  const logsByMedId: Record<string, MedicationLog[]> = {}
  ;(medications ?? []).forEach((med, i) => {
    logsByMedId[med.id] = Array.isArray(logQueries[i]?.data) ? logQueries[i].data! : []
  })

  const anyLogsLoading = logQueries.some((q) => q.isLoading)
  const doses = Array.isArray(todayData?.doses) ? todayData.doses : []

  const { adherence, lateCount, perfectDays } = computeWeeklyStats(
    medications ?? [],
    logsByMedId,
    days
  )
  const { adherence: adherence30 } = compute30DayStats(
    medications ?? [],
    logsByMedId,
    days30
  )

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <>
      {profile && dialogState.mode !== 'closed' && (
        <PrescriptionDialog
          key={dialogState.mode === 'edit' ? dialogState.medication.id : 'create'}
          open={true}
          onClose={() => setDialogState({ mode: 'closed' })}
          healthProfileId={profile.id}
          medication={dialogState.mode === 'edit' ? dialogState.medication : undefined}
          medications={medications ?? []}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ── page header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <PageHeader
            overline={profile?.fullName}
            title="Medicamentos"
            subtitle={todayLabel}
          />
          {access.canCreate && (
            <button
              type="button"
              onClick={() => setDialogState({ mode: 'create' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <Plus size={16} />
              Nova prescrição
            </button>
          )}
        </div>

        {/* ── KPI row ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <KpiCard
            label="Aderência últimos 7 dias"
            value={medsLoading || anyLogsLoading ? '—' : `${adherence}%`}
            sub="últimos 7 dias"
            valueColor={medsLoading || anyLogsLoading ? c.inkFaint : adaptiveColor(adherence)}
          />
          <KpiCard
            label="Aderência últimos 30 dias"
            value={medsLoading || anyLogsLoading ? '—' : adherence30 === null ? '--%' : `${adherence30}%`}
            sub="últimos 30 dias"
            valueColor={
              medsLoading || anyLogsLoading || adherence30 === null ? c.inkFaint : adaptiveColor(adherence30)
            }
          />
          <KpiCard
            label="Dias 100%"
            value={medsLoading || anyLogsLoading ? '—' : String(perfectDays)}
            sub="perfeitos esta semana"
            valueColor={c.ink}
          />
          <KpiCard
            label="Atrasos últimos 7 dias"
            value={medsLoading || anyLogsLoading ? '—' : String(lateCount)}
            sub="doses esquecidas"
            valueColor={lateCount > 0 ? c.urgent : c.ink}
          />
        </div>

        {/* ── main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 16, alignItems: 'stretch' }}>
          {/* left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <DosesToday
              doses={doses}
              summary={todayData?.summary}
              healthProfileId={profile?.id}
              isLoading={todayLoading}
              canCreate={access.canCreate}
            />
            <ActivityLog healthProfileId={profile?.id} />
          </div>

          {/* right column — PrescriptionsList ocupa toda a altura */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <PrescriptionsList
              medications={medications ?? []}
              logsByMedId={logsByMedId}
              days={days}
              isLoading={medsLoading}
              healthProfileId={profile?.id}
              onEdit={(med) => setDialogState({ mode: 'edit', medication: med })}
              onNew={() => setDialogState({ mode: 'create' })}
              canCreate={access.canCreate}
              canManage={access.canManage}
            />
          </div>
        </div>

        {/* ── HeatmapCard em largura total ── */}
        <HeatmapCard
          medications={medications ?? []}
          logsByMedId={logsByMedId}
          days={days}
          isLoading={medsLoading || anyLogsLoading}
        />
      </div>
    </>
  )
}
