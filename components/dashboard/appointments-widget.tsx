'use client'

import { Calendar } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useAppointmentsUpcoming, type Appointment, type AppointmentKind } from '@/hooks/useAppointmentsUpcoming'

const kindConfig: Record<AppointmentKind, { label: string; className: string }> = {
  CONSULTATION: { label: 'Consulta', className: 'bg-zels-primary/10 text-zels-primary' },
  EXAM:         { label: 'Exame',    className: 'bg-muted text-zels-text-soft' },
  THERAPY:      { label: 'Terapia',  className: 'bg-zels-attention/10 text-zels-attention' },
  VACCINE:      { label: 'Vacina',   className: 'bg-sky-500/10 text-sky-700' },
  OTHER:        { label: 'Outro',    className: 'bg-muted text-zels-text-faint' },
}

function formatScheduledAt(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const apptDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const h = date.getHours()
  const m = date.getMinutes()
  const timeStr = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`

  if (apptDay.getTime() === today.getTime()) return `hoje às ${timeStr}`
  if (apptDay.getTime() === tomorrow.getTime()) return `amanhã às ${timeStr}`

  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const day = date.getDate()
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${weekday}, ${day} ${month} às ${timeStr}`
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  const config = kindConfig[appt.kind]

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 space-y-1">
        <span className={`inline-block text-[0.7rem] font-medium px-1.5 py-0.5 rounded-sm ${config.className}`}>
          {config.label}
        </span>
        <p className="text-sm font-medium text-foreground truncate">{appt.title}</p>
        {appt.professional && (
          <p className="text-xs text-zels-text-soft truncate">{appt.professional}</p>
        )}
      </div>
      <span className="text-xs text-zels-text-faint shrink-0 text-right leading-tight mt-0.5">
        {formatScheduledAt(appt.scheduledAt)}
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-3.5 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="h-3 bg-muted rounded w-20" />
    </div>
  )
}

export function AppointmentsWidget() {
  const { data: profile } = useHealthProfile()
  const { data: appointments, isLoading, isError } = useAppointmentsUpcoming(profile?.id)

  const appointmentList = Array.isArray(appointments) ? appointments : []

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Próximos compromissos</h2>
        <div className="h-8 w-8 rounded-lg bg-zels-primary-soft flex items-center justify-center">
          <Calendar size={16} className="text-zels-primary" />
        </div>
      </div>

      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {isError && (
        <p className="text-sm text-zels-text-soft py-6 text-center">Não foi possível carregar.</p>
      )}

      {!isLoading && !isError && appointmentList.length === 0 && (
        <p className="text-sm text-zels-text-soft py-6 text-center">
          Nenhum compromisso agendado.
        </p>
      )}

      {!isLoading && !isError && appointmentList.length > 0 &&
        appointmentList.map((appt) => <AppointmentRow key={appt.id} appt={appt} />)
      }
    </div>
  )
}
