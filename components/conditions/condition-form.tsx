'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateCondition, type ConditionStatus } from '@/lib/api/conditions'

const STATUS_OPTIONS: { value: ConditionStatus; label: string }[] = [
  { value: 'ACTIVE',        label: 'Ativa' },
  { value: 'INVESTIGATING', label: 'Investigando' },
  { value: 'CONTROLLED',   label: 'Controlada' },
  { value: 'CHRONIC',      label: 'Crônica' },
  { value: 'RESOLVED',     label: 'Resolvida' },
]

const schema = z.object({
  name:          z.string().min(1, 'Nome é obrigatório'),
  status:        z.enum(['INVESTIGATING', 'ACTIVE', 'CONTROLLED', 'RESOLVED', 'CHRONIC']),
  diagnosisDate: z.string().optional(),
  notes:         z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const fieldClass =
  'w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-zels-text-faint focus:outline-none focus:ring-2 focus:ring-zels-primary/30'
const labelClass = 'block text-xs font-medium text-zels-text-soft mb-1'
const errorClass = 'mt-1 text-xs text-zels-urgent'

interface Props {
  healthProfileId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ConditionForm({ healthProfileId, onSuccess, onCancel }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate, isPending } = useCreateCondition()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', status: 'ACTIVE', diagnosisDate: '', notes: '' },
  })

  function onSubmit(values: FormValues) {
    setSubmitError(null)
    mutate(
      {
        healthProfileId,
        name: values.name,
        status: values.status,
        ...(values.diagnosisDate ? { diagnosisDate: values.diagnosisDate } : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      },
      {
        onSuccess: () => { reset(); onSuccess() },
        onError: () => setSubmitError('Não foi possível salvar. Tente novamente.'),
      }
    )
  }

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Nova condição</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-zels-text-faint hover:text-foreground transition-colors p-0.5"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="cond-name">Nome</label>
          <input
            id="cond-name"
            type="text"
            placeholder="Ex: Hipertensão Arterial…"
            className={fieldClass}
            {...register('name')}
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="cond-status">Status</label>
          <select id="cond-status" className={fieldClass} {...register('status')}>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="cond-date">Data de diagnóstico (opcional)</label>
          <input id="cond-date" type="date" className={fieldClass} {...register('diagnosisDate')} />
        </div>

        <div>
          <label className={labelClass} htmlFor="cond-notes">Notas (opcional)</label>
          <textarea
            id="cond-notes"
            rows={2}
            placeholder="Observações sobre a condição…"
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
            {isPending ? 'Salvando…' : 'Salvar condição'}
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
