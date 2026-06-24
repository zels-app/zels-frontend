'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateAppointment } from '@/hooks/useCreateAppointment'
import { useUpdateAppointment } from '@/hooks/useUpdateAppointment'
import { toDatetimeLocal } from '@/lib/format'
import type { Appointment, AppointmentKind } from '@/hooks/useAppointmentsUpcoming'

const KIND_OPTIONS: { value: AppointmentKind; label: string }[] = [
  { value: 'CONSULTATION', label: 'Consulta' },
  { value: 'EXAM',         label: 'Exame' },
  { value: 'THERAPY',      label: 'Terapia' },
  { value: 'VACCINE',      label: 'Vacina' },
  { value: 'OTHER',        label: 'Outro' },
]

const schema = z.object({
  kind:            z.enum(['CONSULTATION', 'EXAM', 'THERAPY', 'VACCINE', 'OTHER']),
  title:           z.string().min(3, 'Mínimo 3 caracteres'),
  professional:    z.string().optional(),
  location:        z.string().optional(),
  scheduledAt:     z.string()
    .min(1, 'Data e hora são obrigatórias')
    .refine(val => !isNaN(new Date(val).getTime()), 'Data/hora inválida')
    .refine(val => new Date(val) > new Date(), 'A data deve ser futura'),
  durationMinutes: z.string().optional(),
  notes:           z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const fieldClass =
  'w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-zels-text-faint focus:outline-none focus:ring-2 focus:ring-zels-primary/30'
const labelClass = 'block text-xs font-medium text-zels-text-soft mb-1'
const errorClass = 'mt-1 text-xs text-zels-urgent'

interface Props {
  healthProfileId: string
  appointment?: Appointment
  onSuccess: () => void
  onCancel: () => void
}

export function AppointmentForm({ healthProfileId, appointment, onSuccess, onCancel }: Props) {
  const isEdit = !!appointment
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate: create, isPending: creating } = useCreateAppointment()
  const { mutate: update, isPending: updating } = useUpdateAppointment()
  const isPending = creating || updating

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind:            appointment?.kind ?? 'CONSULTATION',
      title:           appointment?.title ?? '',
      professional:    appointment?.professional ?? '',
      location:        appointment?.location ?? '',
      scheduledAt:     appointment ? toDatetimeLocal(appointment.scheduledAt) : '',
      durationMinutes: appointment?.durationMinutes ? String(appointment.durationMinutes) : '',
      notes:           appointment?.notes ?? '',
    },
  })

  function onSubmit(values: FormValues) {
    setSubmitError(null)
    const scheduledAt = new Date(values.scheduledAt).toISOString()
    const payload = {
      kind:         values.kind,
      title:        values.title,
      scheduledAt,
      ...(values.professional?.trim()    ? { professional:    values.professional.trim() }             : {}),
      ...(values.location?.trim()        ? { location:        values.location.trim() }                 : {}),
      ...(values.durationMinutes?.trim() ? { durationMinutes: Number(values.durationMinutes) }         : {}),
      ...(values.notes?.trim()           ? { notes:           values.notes.trim() }                    : {}),
    }

    console.log('appointment payload:', { healthProfileId, ...payload })

    if (isEdit) {
      update(
        { id: appointment.id, ...payload },
        {
          onSuccess: () => onSuccess(),
          onError: () => setSubmitError('Não foi possível atualizar. Tente novamente.'),
        }
      )
    } else {
      create(
        { healthProfileId, ...payload },
        {
          onSuccess: () => onSuccess(),
          onError: () => setSubmitError('Não foi possível salvar. Tente novamente.'),
        }
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          {isEdit ? 'Editar compromisso' : 'Novo compromisso'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-0.5 text-zels-text-faint hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="appt-kind">Tipo</label>
          <select id="appt-kind" className={fieldClass} {...register('kind')}>
            {KIND_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="appt-title">Título</label>
          <input
            id="appt-title"
            type="text"
            placeholder="Ex: Consulta cardiologista…"
            className={fieldClass}
            {...register('title')}
          />
          {errors.title && <p className={errorClass}>{errors.title.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="appt-scheduled">Data e hora</label>
          <input
            id="appt-scheduled"
            type="datetime-local"
            className={fieldClass}
            {...register('scheduledAt')}
            onChange={(e) => {
              const value = e.target.value
              if (value) {
                const [datePart, timePart] = value.split('T')
                const [year, month, day] = datePart.split('-')
                if (year && year.length > 4) {
                  const fixedYear = year.slice(0, 4)
                  const fixed = `${fixedYear}-${month}-${day}T${timePart}`
                  e.target.value = fixed
                  setValue('scheduledAt', fixed)
                  return
                }
              }
              setValue('scheduledAt', value)
            }}
          />
          {errors.scheduledAt && <p className={errorClass}>{errors.scheduledAt.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="appt-professional">Profissional (opcional)</label>
            <input
              id="appt-professional"
              type="text"
              placeholder="Dr. Carlos…"
              className={fieldClass}
              {...register('professional')}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="appt-duration">Duração (min)</label>
            <input
              id="appt-duration"
              type="number"
              min={5}
              placeholder="60"
              className={fieldClass}
              {...register('durationMinutes')}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="appt-location">Local (opcional)</label>
          <input
            id="appt-location"
            type="text"
            placeholder="UBS Centro…"
            className={fieldClass}
            {...register('location')}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="appt-notes">Notas (opcional)</label>
          <textarea
            id="appt-notes"
            rows={2}
            placeholder="Observações…"
            className={cn(fieldClass, 'resize-none')}
            {...register('notes')}
          />
        </div>

        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-zels-urgent">{submitError}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-zels-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? 'Salvando…' : isEdit ? 'Atualizar' : 'Agendar'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-sm text-zels-text-faint hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
