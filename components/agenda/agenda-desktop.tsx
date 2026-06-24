'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useAppointments } from '@/hooks/useAppointments'
import { useUpdateAppointmentStatus } from '@/hooks/useUpdateAppointmentStatus'
import { useDeleteAppointment } from '@/hooks/useDeleteAppointment'
import { KindBadge, kindTone } from './kind-badge'
import { AppointmentForm } from './appointment-form'
import { formatAppointmentDate, toISOLocal } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Appointment, AppointmentKind, AppointmentStatus } from '@/hooks/useAppointmentsUpcoming'
import { PageHeader } from '@/components/layout/page-header'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_SHORT  = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const LEGEND_KINDS: AppointmentKind[] = ['CONSULTATION', 'EXAM', 'THERAPY', 'VACCINE']
const LEGEND_LABEL: Record<AppointmentKind, string> = {
  CONSULTATION: 'Consulta',
  EXAM:         'Exame',
  THERAPY:      'Terapia',
  VACCINE:      'Vacina',
  OTHER:        'Outro',
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeUntil(scheduledAt: string): string {
  const diff  = new Date(scheduledAt).getTime() - Date.now()
  if (diff <= 0) return 'agora'
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `em ${hours} hora${hours !== 1 ? 's' : ''}`
  const days  = Math.floor(hours / 24)
  return `em ${days} dia${days !== 1 ? 's' : ''}`
}

function patientFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 m-4 w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl max-h-[90vh]">
        {children}
      </div>
    </div>
  )
}

// ─── CalendarStrip ────────────────────────────────────────────────────────────

function CalendarStrip({
  days,
  byDate,
  selectedDay,
  todayKey,
  onSelect,
  title,
}: {
  days: Date[]
  byDate: Map<string, Appointment[]>
  selectedDay: Date | null
  todayKey: string
  onSelect: (day: Date | null) => void
  title?: string
}) {
  const selectedKey = selectedDay ? toISOLocal(selectedDay) : null

  return (
    <div
      className="rounded-[14px] border"
      style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de', padding: '14px 18px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {title && (
          <p className="font-[600] text-[#3D2B1F]" style={{ fontSize: '1rem' }}>
            {title}
          </p>
        )}
        <div className="flex items-center gap-4">
          {LEGEND_KINDS.map((kind) => {
            const tone = kindTone(kind)
            return (
              <span key={kind} className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: tone.fg }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.68)' }}>
                  {LEGEND_LABEL[kind]}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(30, 1fr)',
          gap: '3px',
        }}
      >
        {days.map((day) => {
          const key      = toISOLocal(day)
          const appts    = byDate.get(key) ?? []
          const isSelected = key === selectedKey
          const isToday    = key === todayKey
          const hasAppts   = appts.length > 0
          const pills      = appts.slice(0, 2)
          const extra      = appts.length - 2

          return (
            <button
              key={key}
              onClick={() => onSelect(isSelected ? null : day)}
              className="flex flex-col items-center py-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: isSelected
                  ? 'rgba(139,175,138,0.12)'
                  : hasAppts
                  ? '#efece5'
                  : 'transparent',
                border: `1px solid ${isSelected ? 'var(--zels-primary)' : 'transparent'}`,
                gap: '2px',
              }}
              title={day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: '0.5625rem', color: 'rgba(61,43,31,0.42)', lineHeight: 1 }}
              >
                {WEEK_SHORT[day.getDay()]}
              </span>
              <span
                className="font-mono font-[600] tabular-nums"
                style={{
                  fontSize: '0.8125rem',
                  color: isToday ? 'var(--zels-primary-strong)' : '#3D2B1F',
                  lineHeight: 1.2,
                }}
              >
                {day.getDate()}
              </span>

              {/* Pills */}
              <div
                className="flex gap-px items-center w-full"
                style={{ height: '4px', padding: '0 2px' }}
              >
                {pills.map((appt, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: '3px',
                      backgroundColor: kindTone(appt.kind).fg,
                    }}
                  />
                ))}
                {extra > 0 && (
                  <span
                    className="font-mono"
                    style={{ fontSize: '0.4375rem', color: 'rgba(61,43,31,0.42)' }}
                  >
                    +{extra}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── AppointmentRow (left column) ─────────────────────────────────────────────

const MONTHS_SHORT_ROW = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatShortDate(isoString: string): string {
  const date = new Date(isoString)
  const h    = date.getHours()
  const m    = date.getMinutes()
  const t    = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
  return `${WEEK_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT_ROW[date.getMonth()]} · ${t}`
}

function AppointmentRow({
  appt,
  onEdit,
  onComplete,
  onRestore,
  onReschedule,
  isUpdating,
}: {
  appt: Appointment
  onEdit: () => void
  onComplete: () => void
  onRestore?: () => void
  onReschedule?: () => void
  isUpdating: boolean
}) {
  const isCancelled = appt.status === 'CANCELLED'
  const isScheduled = appt.status === 'SCHEDULED'
  const { mutate: deleteAppt } = useDeleteAppointment()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="rounded-[14px] border p-4 space-y-2"
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#e8e5de',
        opacity: isCancelled ? 0.55 : 1,
      }}
    >
      {/* Linha 1: badge + data curta */}
      <div className="flex items-center justify-between">
        <KindBadge kind={appt.kind} />
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
        >
          {formatShortDate(appt.scheduledAt)}
        </span>
      </div>

      {/* Linha 2: título — largura total, sem compressão lateral */}
      <p
        style={{
          fontSize: '1.0625rem',
          fontWeight: 600,
          color: isCancelled ? 'rgba(61,43,31,0.68)' : '#3D2B1F',
          textDecoration: isCancelled ? 'line-through' : 'none',
          lineHeight: 1.3,
        }}
      >
        {appt.title}
      </p>

      {/* Linha 3: profissional */}
      {appt.professional && (
        <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.68)' }}>
          {appt.professional}
        </p>
      )}

      {/* Linha 4: local */}
      {appt.location && (
        <p
          className="font-mono"
          style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}
        >
          {appt.location}
        </p>
      )}

      {/* Linha 5: notas */}
      {appt.notes && (
        <div
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: '#efece5', borderLeft: '3px solid #A86E13' }}
        >
          <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.68)' }}>
            <span className="font-medium" style={{ color: '#A86E13' }}>Obs.: </span>
            {appt.notes}
          </p>
        </div>
      )}

      {/* Ações em linha horizontal */}
      <div className="flex gap-2 pt-1 flex-wrap items-center">
        {isScheduled && (
          <>
            <button
              onClick={onComplete}
              disabled={isUpdating}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: 'rgba(139,175,138,0.10)', color: 'var(--zels-primary-strong)' }}
            >
              Realizado
            </button>
            {onReschedule && (
              <button
                onClick={onReschedule}
                disabled={isUpdating}
                className="rounded-md px-3 py-1.5 text-xs font-medium border transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
              >
                Reagendar
              </button>
            )}
            {confirmDelete ? (
              <>
                <button
                  onClick={() => deleteAppt(appt.id, {
                    onSuccess: () => toast.success('Compromisso excluído'),
                    onError:   () => toast.error('Erro ao excluir compromisso'),
                  })}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#B8341A' }}
                >
                  Confirmar exclusão
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(61,43,31,0.42)' }}
                >
                  Manter
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-opacity hover:opacity-80"
                style={{ color: 'rgba(61,43,31,0.42)' }}
                title="Excluir compromisso"
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
        {!isScheduled && onRestore && (
          <>
            <button
              onClick={onRestore}
              disabled={isUpdating}
              className="rounded-md px-3 py-1.5 text-xs font-medium border transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ borderColor: 'rgba(139,175,138,0.45)', color: 'var(--zels-primary-strong)' }}
            >
              Desfazer
            </button>
            {onReschedule && (
              <button
                onClick={onReschedule}
                disabled={isUpdating}
                className="rounded-md px-3 py-1.5 text-xs font-medium border transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
              >
                Reagendar
              </button>
            )}
          </>
        )}
        <button
          onClick={onEdit}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#efece5', color: 'rgba(61,43,31,0.68)' }}
        >
          Editar
        </button>
      </div>
    </div>
  )
}

// ─── NextAppointmentCard (right column) ───────────────────────────────────────

function NextAppointmentCard({
  appointment,
  onEdit,
  onComplete,
  onReschedule,
  isUpdating,
}: {
  appointment: Appointment
  onEdit: () => void
  onComplete: () => void
  onReschedule: () => void
  isUpdating: boolean
}) {
  const router  = useRouter()
  const tone    = kindTone(appointment.kind)
  const date    = new Date(appointment.scheduledAt)
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const { mutate: deleteAppt } = useDeleteAppointment()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div
      className="rounded-[14px] border p-5 space-y-4"
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#e8e5de',
        borderLeftWidth: '4px',
        borderLeftColor: tone.fg,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <KindBadge kind={appointment.kind} />
        <span
          className="font-mono"
          style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}
        >
          {formatAppointmentDate(appointment.scheduledAt)}
        </span>
      </div>

      <div>
        <h3
          className="font-[700] text-[#3D2B1F] leading-snug"
          style={{ fontSize: '1.375rem' }}
        >
          {appointment.title}
        </h3>
        {appointment.professional && (
          <p className="mt-1" style={{ fontSize: '0.84375rem', color: 'rgba(61,43,31,0.68)' }}>
            {appointment.professional}
          </p>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="font-mono font-[600]" style={{ fontSize: '0.8125rem', color: '#3D2B1F' }}>
          {timeStr}
          {appointment.durationMinutes && (
            <span style={{ fontWeight: 400, color: 'rgba(61,43,31,0.42)' }}>
              {' '}· {appointment.durationMinutes} min
            </span>
          )}
        </p>
        {appointment.location && (
          <p className="font-mono font-[600]" style={{ fontSize: '0.8125rem', color: '#3D2B1F' }}>
            {appointment.location}
          </p>
        )}
      </div>

      {appointment.notes && (
        <div
          className="rounded-md px-3 py-2"
          style={{ backgroundColor: '#efece5', borderLeft: '3px solid #A86E13' }}
        >
          <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.68)' }}>
            <span className="font-medium" style={{ color: '#A86E13' }}>Obs.: </span>
            {appointment.notes}
          </p>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <button
          onClick={() => router.push('/resumo')}
          className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Abrir Resumo Médico
        </button>
        <button
          onClick={onComplete}
          disabled={isUpdating}
          className="w-full rounded-xl border py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ borderColor: 'rgba(139,175,138,0.45)', color: 'var(--zels-primary-strong)' }}
        >
          Marcar como realizado
        </button>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
          >
            Editar
          </button>
          <button
            onClick={onReschedule}
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
          >
            Reagendar
          </button>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => deleteAppt(appointment.id, {
                onSuccess: () => toast.success('Compromisso excluído'),
                onError:   () => toast.error('Erro ao excluir compromisso'),
              })}
              className="flex-1 rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#B8341A' }}
            >
              Confirmar exclusão
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm transition-opacity hover:opacity-80"
              style={{ color: 'rgba(61,43,31,0.42)' }}
            >
              Manter
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs pt-1 transition-opacity hover:opacity-80"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <Trash2 size={13} />
            Excluir compromisso
          </button>
        )}
      </div>
    </div>
  )
}

// ─── MonthlyView ─────────────────────────────────────────────────────────────

function MonthlyView({
  safeAppts,
  onEdit,
  updatingStatus,
  updateStatus,
}: {
  safeAppts: Appointment[]
  onEdit: (appt: Appointment) => void
  updatingStatus: boolean
  updateStatus: (args: { id: string; status: AppointmentStatus }) => void
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date())
  const [selectedDay,   setSelectedDay]   = useState<Date | null>(null)

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    const base = new Date()
    base.setDate(1)
    for (let i = -1; i <= 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
      opts.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${MONTH_NAMES_PT[d.getMonth()]} ${d.getFullYear()}`,
      })
    }
    return opts
  }, [])

  const selectedMonthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`

  const daysInMonth = useMemo(() => {
    const year  = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const count = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1))
  }, [selectedMonth])

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const appt of safeAppts) {
      const key = toISOLocal(new Date(appt.scheduledAt))
      const arr = map.get(key) ?? []
      arr.push(appt)
      map.set(key, arr)
    }
    return map
  }, [safeAppts])

  const monthAppts = useMemo(
    () => safeAppts.filter((a) => toISOLocal(new Date(a.scheduledAt)).startsWith(selectedMonthKey)),
    [safeAppts, selectedMonthKey],
  )

  const selectedDayKey = selectedDay ? toISOLocal(selectedDay) : null

  const displayedAppts = useMemo(() => {
    const filtered = selectedDayKey
      ? monthAppts.filter((a) => toISOLocal(new Date(a.scheduledAt)) === selectedDayKey)
      : monthAppts
    return [...filtered].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }, [monthAppts, selectedDayKey])

  const todayKey = useMemo(() => toISOLocal(new Date()), [])

  function handleMonthChange(value: string) {
    const [y, m] = value.split('-').map(Number)
    setSelectedMonth(new Date(y, m - 1, 1))
    setSelectedDay(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select
          value={selectedMonthKey}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
          style={{ borderColor: '#e8e5de', backgroundColor: '#ffffff', color: '#3D2B1F' }}
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {selectedDay && (
          <button
            onClick={() => setSelectedDay(null)}
            className="text-xs transition-opacity hover:opacity-80"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            Ver mês completo
          </button>
        )}
      </div>

      <CalendarStrip
        days={daysInMonth}
        byDate={byDate}
        selectedDay={selectedDay}
        todayKey={todayKey}
        onSelect={setSelectedDay}
      />

      <div className="space-y-4">
        <p className="font-[600] text-[#3D2B1F]" style={{ fontSize: '1rem' }}>
          {selectedDay
            ? selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
            : `Compromissos em ${MONTH_NAMES_PT[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
          }
        </p>
        {displayedAppts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
              Nenhum compromisso neste mês.
            </p>
          </div>
        ) : (
          displayedAppts.map((appt) => (
            <AppointmentRow
              key={appt.id}
              appt={appt}
              isUpdating={updatingStatus}
              onEdit={() => onEdit(appt)}
              onComplete={() => updateStatus({ id: appt.id, status: 'COMPLETED' })}
              onRestore={() => updateStatus({ id: appt.id, status: 'SCHEDULED' })}
              onReschedule={() => onEdit(appt)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── AllAppointmentsView ──────────────────────────────────────────────────────

function AllAppointmentsView({
  safeAppts,
  onEdit,
  updatingStatus,
  updateStatus,
}: {
  safeAppts: Appointment[]
  onEdit: (appt: Appointment) => void
  updatingStatus: boolean
  updateStatus: (args: { id: string; status: AppointmentStatus }) => void
}) {
  const now = useMemo(() => new Date(), [])

  const grouped = useMemo(() => {
    const future = safeAppts
      .filter((a) => a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

    return future.reduce<{ key: string; label: string; appts: Appointment[] }[]>((acc, appt) => {
      const d   = new Date(appt.scheduledAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const existing = acc.find((g) => g.key === key)
      if (existing) {
        existing.appts.push(appt)
      } else {
        acc.push({ key, label: `${MONTH_NAMES_PT[d.getMonth()]} ${d.getFullYear()}`, appts: [appt] })
      }
      return acc
    }, [])
  }, [safeAppts, now])

  if (grouped.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
          Nenhum compromisso agendado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {grouped.map((group) => (
        <div key={group.key} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: '#e8e5de' }} />
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: '0.6875rem', color: 'var(--zels-primary)', letterSpacing: '0.1em' }}
            >
              {group.label}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#e8e5de' }} />
          </div>
          {group.appts.map((appt) => (
            <AppointmentRow
              key={appt.id}
              appt={appt}
              isUpdating={updatingStatus}
              onEdit={() => onEdit(appt)}
              onComplete={() => updateStatus({ id: appt.id, status: 'COMPLETED' })}
              onReschedule={() => onEdit(appt)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DesktopSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded" style={{ backgroundColor: '#efece5' }} />
        <div className="h-8 w-56 rounded" style={{ backgroundColor: '#efece5' }} />
        <div className="h-3 w-40 rounded" style={{ backgroundColor: '#efece5' }} />
      </div>
      <div className="h-20 rounded-[14px]" style={{ backgroundColor: '#efece5' }} />
      <div className="grid items-start gap-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[14px]" style={{ backgroundColor: '#efece5' }} />
          ))}
        </div>
        <div className="h-64 rounded-[14px]" style={{ backgroundColor: '#efece5' }} />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AgendaDesktop() {
  const { data: profile } = useHealthProfile()
  const healthProfileId   = profile?.id

  const today = useMemo(() => new Date(), [])

  const [viewMode,      setViewMode]      = useState<'30days' | 'monthly' | 'all'>('30days')
  const [selectedDay,   setSelectedDay]   = useState<Date | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [editingAppt,   setEditingAppt]   = useState<Appointment | null>(null)

  const filters = useMemo(() => {
    const past   = new Date(today); past.setDate(today.getDate() - 30)
    const future = new Date(today); future.setDate(today.getDate() + 365)
    return { from: toISOLocal(past), to: toISOLocal(future) }
  }, [today])

  const { data: appointments, isLoading } = useAppointments(healthProfileId, filters)
  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateAppointmentStatus()

  const safeAppts = Array.isArray(appointments) ? appointments : []
  const now = new Date()
  const todayKey = toISOLocal(today)

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const appt of safeAppts) {
      const key = toISOLocal(new Date(appt.scheduledAt))
      const arr = map.get(key) ?? []
      arr.push(appt)
      map.set(key, arr)
    }
    return map
  }, [safeAppts])

  const upcoming = useMemo(
    () =>
      safeAppts
        .filter((a) => a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= now)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [safeAppts],
  )

  const history = useMemo(
    () =>
      safeAppts
        .filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [safeAppts],
  )

  const nextAppt = upcoming[0] ?? null

  const next10 = useMemo(() => {
    const d = new Date(today); d.setDate(today.getDate() + 10); return d
  }, [today])
  const count10 = upcoming.filter((a) => new Date(a.scheduledAt) <= next10).length

  const selectedKey = selectedDay ? toISOLocal(selectedDay) : null

  const displayedUpcoming = selectedKey
    ? safeAppts
        .filter((a) => toISOLocal(new Date(a.scheduledAt)) === selectedKey && a.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    : upcoming

  const displayedHistory = selectedKey
    ? safeAppts
        .filter(
          (a) =>
            toISOLocal(new Date(a.scheduledAt)) === selectedKey &&
            (a.status === 'COMPLETED' || a.status === 'CANCELLED'),
        )
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    : history

  const days = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        return d
      }),
    [today],
  )

  const leftTitle = selectedDay
    ? `Compromissos · ${selectedDay.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}`
    : 'Próximos compromissos'

  if (!healthProfileId || isLoading) return <DesktopSkeleton />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <PageHeader
            overline={profile?.fullName}
            title="Agenda de saúde"
            subtitle={`${count10} compromisso${count10 !== 1 ? 's' : ''} nos próximos 10 dias`}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-2 flex-wrap justify-end">
          {/* View mode buttons */}
          <div
            className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: '#e8e5de' }}
          >
            {(
              [
                { key: '30days',  label: 'Próximos 30 dias' },
                { key: 'monthly', label: 'Mês a mês' },
                { key: 'all',     label: 'Todos' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key)}
                className="px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === mode.key ? 'var(--primary)' : '#ffffff',
                  color:           viewMode === mode.key ? '#ffffff' : 'rgba(61,43,31,0.68)',
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <button
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
          >
            <SlidersHorizontal size={14} />
            Filtrar
          </button>
          <button
            onClick={() => setShowNewDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus size={15} />
            Novo compromisso
          </button>
        </div>
      </div>

      {/* Conditional view rendering */}
      {viewMode === '30days' && (
        <>
          {/* Calendar strip */}
          <CalendarStrip
            days={days}
            byDate={byDate}
            selectedDay={selectedDay}
            todayKey={todayKey}
            onSelect={setSelectedDay}
            title="Próximos 30 dias"
          />

          {/* 2-column grid */}
          <div className="grid items-start gap-5" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
            {/* Left column */}
            <div className="space-y-4">
              <p className="font-[600] text-[#3D2B1F]" style={{ fontSize: '1rem' }}>
                {leftTitle}
              </p>

              {displayedUpcoming.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
                    Nenhum compromisso agendado.
                  </p>
                  <button
                    onClick={() => setShowNewDialog(true)}
                    className="mt-2 text-sm transition-opacity hover:opacity-80"
                    style={{ color: 'var(--zels-primary-strong)' }}
                  >
                    Agendar consulta
                  </button>
                </div>
              )}

              {displayedUpcoming.map((appt) => (
                <AppointmentRow
                  key={appt.id}
                  appt={appt}
                  isUpdating={updatingStatus}
                  onEdit={() => setEditingAppt(appt)}
                  onComplete={() => updateStatus({ id: appt.id, status: 'COMPLETED' })}
                  onReschedule={() => setEditingAppt(appt)}
                />
              ))}

              {displayedHistory.length > 0 && (
                <>
                  <p
                    className="font-mono uppercase tracking-widest pt-2"
                    style={{ fontSize: '0.6875rem', color: 'var(--zels-primary)', letterSpacing: '0.1em' }}
                  >
                    Histórico
                  </p>
                  {displayedHistory.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      isUpdating={updatingStatus}
                      onEdit={() => setEditingAppt(appt)}
                      onComplete={() => updateStatus({ id: appt.id, status: 'COMPLETED' })}
                      onRestore={() => updateStatus({ id: appt.id, status: 'SCHEDULED' })}
                      onReschedule={() => setEditingAppt(appt)}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Right column */}
            <div>
              {nextAppt ? (
                <NextAppointmentCard
                  appointment={nextAppt}
                  isUpdating={updatingStatus}
                  onEdit={() => setEditingAppt(nextAppt)}
                  onComplete={() => updateStatus({ id: nextAppt.id, status: 'COMPLETED' })}
                  onReschedule={() => setEditingAppt(nextAppt)}
                />
              ) : (
                <div
                  className="rounded-[14px] border p-5 text-center"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
                >
                  <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
                    Nenhum compromisso agendado.
                  </p>
                  <button
                    onClick={() => setShowNewDialog(true)}
                    className="mt-3 text-sm transition-opacity hover:opacity-80"
                    style={{ color: 'var(--zels-primary-strong)' }}
                  >
                    Agendar agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {viewMode === 'monthly' && (
        <MonthlyView
          safeAppts={safeAppts}
          onEdit={setEditingAppt}
          updatingStatus={updatingStatus}
          updateStatus={updateStatus}
        />
      )}

      {viewMode === 'all' && (
        <AllAppointmentsView
          safeAppts={safeAppts}
          onEdit={setEditingAppt}
          updatingStatus={updatingStatus}
          updateStatus={updateStatus}
        />
      )}

      {/* Dialogs */}
      <Dialog open={showNewDialog} onClose={() => setShowNewDialog(false)}>
        {healthProfileId && (
          <AppointmentForm
            healthProfileId={healthProfileId}
            onSuccess={() => setShowNewDialog(false)}
            onCancel={() => setShowNewDialog(false)}
          />
        )}
      </Dialog>

      <Dialog open={!!editingAppt} onClose={() => setEditingAppt(null)}>
        {healthProfileId && editingAppt && (
          <AppointmentForm
            healthProfileId={healthProfileId}
            appointment={editingAppt}
            onSuccess={() => setEditingAppt(null)}
            onCancel={() => setEditingAppt(null)}
          />
        )}
      </Dialog>
    </div>
  )
}
