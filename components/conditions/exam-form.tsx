'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateExam } from '@/lib/api/exams'

const schema = z.object({
  type:     z.string().min(1, 'Tipo é obrigatório'),
  examDate: z.string().min(1, 'Data é obrigatória'),
  notes:    z.string().optional(),
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

export function ExamForm({ healthProfileId, onSuccess, onCancel }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate, isPending } = useCreateExam()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: '', examDate: '', notes: '' },
  })

  function onSubmit(values: FormValues) {
    setSubmitError(null)
    mutate(
      {
        healthProfileId,
        type: values.type,
        examDate: values.examDate,
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
        <h2 className="text-sm font-semibold text-foreground">Novo exame</h2>
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
          <label className={labelClass} htmlFor="exam-type">Tipo de exame</label>
          <input
            id="exam-type"
            type="text"
            placeholder="Ex: Hemograma Completo, Glicemia em Jejum…"
            className={fieldClass}
            {...register('type')}
          />
          {errors.type && <p className={errorClass}>{errors.type.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="exam-date">Data do exame</label>
          <input id="exam-date" type="date" className={fieldClass} {...register('examDate')} />
          {errors.examDate && <p className={errorClass}>{errors.examDate.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="exam-notes">Notas / resultado (opcional)</label>
          <textarea
            id="exam-notes"
            rows={2}
            placeholder="Ex: Resultado dentro do esperado…"
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
            {isPending ? 'Salvando…' : 'Salvar exame'}
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
