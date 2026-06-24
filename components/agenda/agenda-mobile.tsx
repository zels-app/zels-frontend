'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import { useAppointments } from '@/hooks/useAppointments'
import { useUpdateAppointmentStatus } from '@/hooks/useUpdateAppointmentStatus'
import { useDeleteAppointment } from '@/hooks/useDeleteAppointment'
import { KindBadge, kindTone } from './kind-badge'
import { AppointmentForm } from './appointment-form'
import { formatAppointmentDate, toISOLocal } from '@/lib/format'
import type { Appointment, AppointmentStatus } from '@/hooks/useAppointmentsUpcoming'
import { PageHeader } from '@/components/layout/page-header'
import { ROLE_CONFIG } from '@/components/ciclo/person-card'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const WEEK_SHORT   = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeUntil(scheduledAt: string): string {
  const diff  = new Date(scheduledAt).getTime() - Date.now()
  if (diff <= 0) return 'agora'
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `em ${hours} hora${hours !== 1 ? 's' : ''}`
  const days  = Math.floor(hours / 24)
  return `em ${days} dia${days !== 1 ? 's' : ''}`
}

function dateShort(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase()
}

function patientFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function getUpcoming(appts: Appointment[]): Appointment[] {
  const now = new Date()
  return appts
    .filter((a) => a.status === 'SCHEDULED' && new Date(a.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
}

function getHistory(appts: Appointment[]): Appointment[] {
  return appts
    .filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3)
}

// ─── SheetState ────────────────────────────────────────────────────────────────

type SheetState =
  | { mode: 'closed' }
  | { mode: 'form-new' }
  | { mode: 'form-edit'; appointment: Appointment }
  | { mode: 'detail'; appointment: Appointment }

// ─── BottomSheet ──────────────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-xl transition-transform duration-300 ease-out"
        style={{
          backgroundColor: '#ffffff',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: '#efece5' }} />
        </div>
        <div className="overflow-y-auto max-h-[85vh] px-5 pb-10 pt-2">
          {children}
        </div>
      </div>
    </>
  )
}

// ─── AppointmentDetail ────────────────────────────────────────────────────────

function AppointmentDetail({
  appointment,
  onEdit,
  onReschedule,
  onClose,
}: {
  appointment: Appointment
  onEdit: () => void
  onReschedule: () => void
  onClose: () => void
}) {
  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateAppointmentStatus()
  const { mutate: deleteAppt,   isPending: deleting       } = useDeleteAppointment()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError,   setActionError]   = useState<string | null>(null)
  const isPending   = updatingStatus || deleting
  const isScheduled = appointment.status === 'SCHEDULED'
  const tone        = kindTone(appointment.kind)
  const date        = new Date(appointment.scheduledAt)
  const timeStr     = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  function handleStatus(status: AppointmentStatus) {
    setActionError(null)
    updateStatus(
      { id: appointment.id, status },
      {
        onSuccess: onClose,
        onError: () => setActionError('Não foi possível atualizar. Tente novamente.'),
      },
    )
  }

  function handleDelete() {
    deleteAppt(appointment.id, {
      onSuccess: onClose,
      onError:   () => setActionError('Não foi possível excluir. Tente novamente.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <KindBadge kind={appointment.kind} />
        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}>
          {formatAppointmentDate(appointment.scheduledAt)}
        </span>
      </div>

      <h2 className="font-[700] text-[#3D2B1F] leading-snug" style={{ fontSize: '1.375rem' }}>
        {appointment.title}
      </h2>

      {appointment.professional && (
        <p style={{ fontSize: '0.84375rem', color: 'rgba(61,43,31,0.68)' }}>
          {appointment.professional}
        </p>
      )}

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

      {appointment.status === 'CANCELLED' && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'rgba(184,52,26,0.08)', color: '#B8341A' }}
        >
          Compromisso cancelado
        </div>
      )}
      {appointment.status === 'COMPLETED' && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'rgba(139,175,138,0.10)', color: 'var(--zels-primary-strong)' }}
        >
          Compromisso realizado
        </div>
      )}

      {actionError && (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'rgba(184,52,26,0.08)', color: '#B8341A' }}
        >
          {actionError}
        </p>
      )}

      {isScheduled && (
        <div className="space-y-2">
          <button
            onClick={() => handleStatus('COMPLETED')}
            disabled={isPending}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {updatingStatus ? 'Atualizando…' : 'Marcar como realizado'}
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
        </div>
      )}

      {!isScheduled && (
        <div className="space-y-2">
          <button
            onClick={() => handleStatus('SCHEDULED')}
            disabled={isPending}
            className="w-full rounded-xl border py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: 'rgba(139,175,138,0.45)', color: 'var(--zels-primary-strong)' }}
          >
            {updatingStatus ? 'Atualizando…' : 'Desfazer — voltar para agendado'}
          </button>
          <button
            onClick={onReschedule}
            disabled={isPending}
            className="w-full rounded-xl border py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
          >
            Reagendar
          </button>
          <button
            onClick={onEdit}
            disabled={isPending}
            className="w-full rounded-xl border py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ borderColor: '#e8e5de', color: 'rgba(61,43,31,0.68)' }}
          >
            Editar
          </button>
        </div>
      )}

      {confirmDelete ? (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: '#B8341A' }}
          >
            {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
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
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MobileSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-3 w-24 rounded" style={{ backgroundColor: '#efece5' }} />
      <div
        className="rounded-[14px] border p-4 space-y-3"
        style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
      >
        <div className="h-3 w-16 rounded" style={{ backgroundColor: '#efece5' }} />
        <div className="h-6 w-3/5 rounded"  style={{ backgroundColor: '#efece5' }} />
        <div className="h-3 w-2/5 rounded"  style={{ backgroundColor: '#efece5' }} />
        <div className="h-9 rounded-xl"     style={{ backgroundColor: '#efece5' }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
        >
          <div className="h-4 w-14 rounded" style={{ backgroundColor: '#efece5' }} />
          <div className="flex-1 h-4 rounded" style={{ backgroundColor: '#efece5' }} />
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AgendaMobile() {
  const router          = useRouter()
  const { data: profile }     = useHealthProfile()
  const { data: currentUser } = useCurrentUser()
  const healthProfileId = profile?.id

  const filters = useMemo(() => {
    const today  = new Date()
    const past   = new Date(today); past.setDate(today.getDate() - 30)
    const future = new Date(today); future.setDate(today.getDate() + 90)
    return { from: toISOLocal(past), to: toISOLocal(future) }
  }, [])

  const { data: appointments, isLoading } = useAppointments(healthProfileId, filters)
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' })

  const safeAppts = Array.isArray(appointments) ? appointments : []
  const upcoming  = useMemo(() => getUpcoming(safeAppts), [safeAppts])
  const history   = useMemo(() => getHistory(safeAppts),  [safeAppts])

  const nextAppt  = upcoming[0] ?? null
  const listAppts = upcoming.slice(1, 6)

  const firstName = profile?.fullName   ? patientFirstName(profile.fullName) : '…'
  const initials  = currentUser?.name   ? getInitials(currentUser.name)      : '?'

  function closeSheet() { setSheet({ mode: 'closed' }) }

  if (!healthProfileId || isLoading) return <MobileSkeleton />

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 mt-0.5 rounded-md transition-opacity hover:opacity-70"
          style={{ color: 'rgba(61,43,31,0.42)' }}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <PageHeader
            overline={profile?.fullName}
            title="Agenda de saúde"
            subtitle={`${upcoming.length} compromisso${upcoming.length !== 1 ? 's' : ''} agendado${upcoming.length !== 1 ? 's' : ''}`}
          />
        </div>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: ROLE_CONFIG[currentUser?.role as keyof typeof ROLE_CONFIG]?.color ?? 'var(--zels-avatar-curator)' }}
        >
          <span className="text-white font-mono font-semibold" style={{ fontSize: '0.625rem' }}>
            {initials}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {upcoming.length === 0 && history.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm font-medium text-[#3D2B1F]">Nenhum compromisso agendado</p>
          <p className="text-xs" style={{ color: 'rgba(61,43,31,0.42)' }}>
            Toque no botão abaixo para agendar
          </p>
        </div>
      )}

      {/* "Próximo" section */}
      {nextAppt && (
        <NextCard
          appt={nextAppt}
          onOpen={() => setSheet({ mode: 'detail', appointment: nextAppt })}
        />
      )}

      {/* "Em seguida" section */}
      {listAppts.length > 0 && (
        <div>
          <p
            className="font-mono uppercase tracking-widest mb-3"
            style={{ fontSize: '0.6875rem', color: 'var(--zels-primary)', letterSpacing: '0.1em' }}
          >
            Em seguida
          </p>

          <div className="space-y-2">
            {listAppts.map((appt) => {
              const date    = new Date(appt.scheduledAt)
              const dayLabel = WEEK_SHORT[date.getDay()]
              const timeStr  = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => setSheet({ mode: 'detail', appointment: appt })}
                  className="w-full text-left rounded-xl border p-3 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
                >
                  <div className="grid gap-3" style={{ gridTemplateColumns: '54px 1fr' }}>
                    <div
                      className="flex flex-col items-center justify-center border-r py-1"
                      style={{ borderColor: '#e8e5de' }}
                    >
                      <span
                        className="font-mono uppercase"
                        style={{ fontSize: '0.625rem', color: 'rgba(61,43,31,0.42)' }}
                      >
                        {dayLabel}
                      </span>
                      <span
                        className="font-mono font-[700] tabular-nums"
                        style={{ fontSize: '0.9375rem', color: '#3D2B1F' }}
                      >
                        {timeStr}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <KindBadge kind={appt.kind} />
                      <p
                        className="font-[600]"
                        style={{ fontSize: '0.875rem', color: '#3D2B1F', lineHeight: 1.3 }}
                      >
                        {appt.title}
                      </p>
                      {(appt.professional || appt.location) && (
                        <p
                          className="truncate"
                          style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.68)' }}
                        >
                          {[appt.professional, appt.location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* "Histórico recente" section */}
      {history.length > 0 && (
        <div>
          <p
            className="font-mono uppercase tracking-widest mb-3"
            style={{ fontSize: '0.6875rem', color: 'var(--zels-primary)', letterSpacing: '0.1em' }}
          >
            Histórico recente
          </p>

          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
          >
            {history.map((appt, i) => {
              const isCancelled = appt.status === 'CANCELLED'
              const isLast      = i === history.length - 1

              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => setSheet({ mode: 'detail', appointment: appt })}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 transition-opacity hover:opacity-90"
                  style={{
                    opacity:     isCancelled ? 0.55 : 1,
                    borderBottom: isLast ? 'none' : '1px solid #e8e5de',
                  }}
                >
                  <KindBadge kind={appt.kind} />

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-[500]"
                      style={{
                        fontSize:       '0.875rem',
                        color:          '#3D2B1F',
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        lineHeight:     1.3,
                      }}
                    >
                      {appt.title}
                    </p>
                    {appt.professional && (
                      <p className="truncate" style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.68)' }}>
                        {appt.professional}
                      </p>
                    )}
                  </div>

                  <span
                    className="font-mono shrink-0"
                    style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
                  >
                    {dateShort(appt.scheduledAt)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <BottomSheet open={sheet.mode !== 'closed'} onClose={closeSheet}>
        {sheet.mode === 'form-new' && healthProfileId && (
          <AppointmentForm
            healthProfileId={healthProfileId}
            onSuccess={closeSheet}
            onCancel={closeSheet}
          />
        )}
        {sheet.mode === 'form-edit' && healthProfileId && (
          <AppointmentForm
            healthProfileId={healthProfileId}
            appointment={sheet.appointment}
            onSuccess={closeSheet}
            onCancel={closeSheet}
          />
        )}
        {sheet.mode === 'detail' && (
          <AppointmentDetail
            appointment={sheet.appointment}
            onEdit={() => {
              const appt = sheet.appointment
              setSheet({ mode: 'form-edit', appointment: appt })
            }}
            onReschedule={() => {
              const appt = sheet.appointment
              setSheet({ mode: 'form-edit', appointment: appt })
            }}
            onClose={closeSheet}
          />
        )}
      </BottomSheet>

      {/* Full-width FAB */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pointer-events-none">
        <button
          type="button"
          onClick={() => setSheet({ mode: 'form-new' })}
          className="w-full pointer-events-auto py-4 font-[600] text-white transition-opacity hover:opacity-90"
          style={{
            fontSize:        '0.9375rem',
            backgroundColor: 'var(--primary)',
            borderRadius:    '12px',
            boxShadow:       '0 4px 20px rgba(139,175,138,0.40)',
          }}
        >
          + Novo compromisso
        </button>
      </div>
    </div>
  )
}

// ─── NextCard (extraído para evitar IIFE no JSX) ──────────────────────────────

function NextCard({
  appt,
  onOpen,
}: {
  appt: Appointment
  onOpen: () => void
}) {
  const router  = useRouter()
  const tone    = kindTone(appt.kind)
  const date    = new Date(appt.scheduledAt)
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <p
        className="font-mono uppercase tracking-widest mb-3"
        style={{
          fontSize:      '0.6875rem',
          color:         tone.fg,
          letterSpacing: '0.08em',
        }}
      >
        PRÓXIMO · {timeUntil(appt.scheduledAt)}
      </p>

      <div
        className="rounded-[14px] border p-4 space-y-3 cursor-pointer transition-opacity hover:opacity-95"
        style={{
          backgroundColor:  '#ffffff',
          borderColor:      '#e8e5de',
          borderLeftWidth:  '4px',
          borderLeftColor:  tone.fg,
        }}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      >
        <div className="flex items-center justify-between gap-2">
          <KindBadge kind={appt.kind} />
          <span
            className="font-mono"
            style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}
          >
            {formatAppointmentDate(appt.scheduledAt)}
          </span>
        </div>

        <p
          className="font-[700] text-[#3D2B1F] leading-snug"
          style={{ fontSize: '1.375rem' }}
        >
          {appt.title}
        </p>

        {appt.professional && (
          <p style={{ fontSize: '0.84375rem', color: 'rgba(61,43,31,0.68)' }}>
            {appt.professional}
          </p>
        )}

        <div className="space-y-0.5">
          <p className="font-mono font-[600]" style={{ fontSize: '0.8125rem', color: '#3D2B1F' }}>
            {timeStr}
            {appt.durationMinutes && (
              <span style={{ fontWeight: 400, color: 'rgba(61,43,31,0.42)' }}>
                {' '}· {appt.durationMinutes} min
              </span>
            )}
          </p>
          {appt.location && (
            <p className="font-mono font-[600]" style={{ fontSize: '0.8125rem', color: '#3D2B1F' }}>
              {appt.location}
            </p>
          )}
        </div>

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

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); router.push('/resumo') }}
          className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          Abrir Resumo Médico
        </button>
      </div>
    </div>
  )
}
