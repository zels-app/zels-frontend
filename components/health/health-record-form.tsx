'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateHealthRecord, type HealthRecordData } from '@/lib/api/health-records'

const schema = z
  .object({
    type: z.enum(['DIARY', 'SYMPTOM', 'VITAL', 'EVENT']),
    text: z.string(),
    symptom: z.string(),
    intensity: z.string(),
    context: z.string(),
    vitalType: z.string(),
    systolic: z.string(),
    diastolic: z.string(),
    vitalValue: z.string(),
    eventDescription: z.string(),
    eventLocation: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.type === 'DIARY' && !d.text.trim()) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'Texto é obrigatório' })
    }
    if (d.type === 'SYMPTOM') {
      if (!d.symptom.trim())
        ctx.addIssue({ code: 'custom', path: ['symptom'], message: 'Sintoma é obrigatório' })
      if (!d.intensity)
        ctx.addIssue({ code: 'custom', path: ['intensity'], message: 'Intensidade é obrigatória' })
    }
    if (d.type === 'VITAL') {
      if (!d.vitalType)
        ctx.addIssue({ code: 'custom', path: ['vitalType'], message: 'Tipo de sinal é obrigatório' })
      if (d.vitalType === 'blood_pressure') {
        if (!d.systolic || isNaN(Number(d.systolic)))
          ctx.addIssue({ code: 'custom', path: ['systolic'], message: 'Sistólica obrigatória' })
        if (!d.diastolic || isNaN(Number(d.diastolic)))
          ctx.addIssue({ code: 'custom', path: ['diastolic'], message: 'Diastólica obrigatória' })
      }
      if (
        (d.vitalType === 'heart_rate' || d.vitalType === 'weight') &&
        (!d.vitalValue || isNaN(Number(d.vitalValue)))
      ) {
        ctx.addIssue({ code: 'custom', path: ['vitalValue'], message: 'Valor é obrigatório' })
      }
    }
    if (d.type === 'EVENT' && !d.eventDescription.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['eventDescription'],
        message: 'Descrição é obrigatória',
      })
    }
  })

type FormValues = z.infer<typeof schema>

function buildData(values: FormValues): HealthRecordData {
  if (values.type === 'DIARY') return { text: values.text }
  if (values.type === 'SYMPTOM')
    return {
      symptom: values.symptom,
      intensity: values.intensity,
      ...(values.context.trim() && { context: values.context.trim() }),
    }
  if (values.type === 'VITAL') {
    if (values.vitalType === 'blood_pressure')
      return {
        type: 'blood_pressure',
        systolic: Number(values.systolic),
        diastolic: Number(values.diastolic),
        unit: 'mmHg',
      }
    return {
      type: values.vitalType,
      value: Number(values.vitalValue),
      unit: values.vitalType === 'heart_rate' ? 'bpm' : 'kg',
    }
  }
  return {
    description: values.eventDescription,
    ...(values.eventLocation.trim() && { location: values.eventLocation.trim() }),
  }
}

const fieldClass =
  'w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-zels-text-faint focus:outline-none focus:ring-2 focus:ring-zels-primary/30'
const labelClass = 'block text-xs font-medium text-zels-text-soft mb-1'
const errorClass = 'mt-1 text-xs text-zels-urgent'

interface HealthRecordFormProps {
  healthProfileId: string
  onSuccess: () => void
  onCancel: () => void
}

export function HealthRecordForm({ healthProfileId, onSuccess, onCancel }: HealthRecordFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { mutate, isPending } = useCreateHealthRecord()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'DIARY',
      text: '',
      symptom: '',
      intensity: '',
      context: '',
      vitalType: '',
      systolic: '',
      diastolic: '',
      vitalValue: '',
      eventDescription: '',
      eventLocation: '',
    },
  })

  const recordType = watch('type')
  const vitalType = watch('vitalType')

  function onSubmit(values: FormValues) {
    setSubmitError(null)
    mutate(
      { healthProfileId, type: values.type, data: buildData(values), source: 'APP' },
      {
        onSuccess: () => {
          reset()
          onSuccess()
        },
        onError: () => setSubmitError('Não foi possível salvar. Tente novamente.'),
      }
    )
  }

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Novo registro</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-zels-text-faint hover:text-foreground transition-colors p-0.5"
          aria-label="Fechar formulário"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Tipo */}
        <div>
          <label className={labelClass} htmlFor="rec-type">
            Tipo
          </label>
          <select id="rec-type" {...register('type')} className={fieldClass}>
            <option value="DIARY">Diário</option>
            <option value="SYMPTOM">Sintoma</option>
            <option value="VITAL">Sinal vital</option>
            <option value="EVENT">Evento</option>
          </select>
        </div>

        {/* DIARY */}
        {recordType === 'DIARY' && (
          <div>
            <label className={labelClass} htmlFor="rec-text">
              Texto
            </label>
            <textarea
              id="rec-text"
              rows={3}
              placeholder="Como foi o dia, humor, observações gerais…"
              className={cn(fieldClass, 'resize-none')}
              {...register('text')}
            />
            {errors.text && <p className={errorClass}>{errors.text.message}</p>}
          </div>
        )}

        {/* SYMPTOM */}
        {recordType === 'SYMPTOM' && (
          <>
            <div>
              <label className={labelClass} htmlFor="rec-symptom">
                Sintoma
              </label>
              <input
                id="rec-symptom"
                type="text"
                placeholder="Ex: tontura, dor de cabeça…"
                className={fieldClass}
                {...register('symptom')}
              />
              {errors.symptom && <p className={errorClass}>{errors.symptom.message}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="rec-intensity">
                Intensidade
              </label>
              <select id="rec-intensity" {...register('intensity')} className={fieldClass}>
                <option value="">Selecionar…</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="forte">Forte</option>
              </select>
              {errors.intensity && <p className={errorClass}>{errors.intensity.message}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="rec-context">
                Contexto (opcional)
              </label>
              <input
                id="rec-context"
                type="text"
                placeholder="Ex: após tomar a medicação…"
                className={fieldClass}
                {...register('context')}
              />
            </div>
          </>
        )}

        {/* VITAL */}
        {recordType === 'VITAL' && (
          <>
            <div>
              <label className={labelClass} htmlFor="rec-vital-type">
                Tipo de sinal
              </label>
              <select id="rec-vital-type" {...register('vitalType')} className={fieldClass}>
                <option value="">Selecionar…</option>
                <option value="blood_pressure">Pressão arterial</option>
                <option value="heart_rate">Frequência cardíaca</option>
                <option value="weight">Peso</option>
              </select>
              {errors.vitalType && <p className={errorClass}>{errors.vitalType.message}</p>}
            </div>

            {vitalType === 'blood_pressure' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="rec-systolic">
                    Sistólica (mmHg)
                  </label>
                  <input
                    id="rec-systolic"
                    type="number"
                    placeholder="Ex: 120"
                    className={fieldClass}
                    {...register('systolic')}
                  />
                  {errors.systolic && <p className={errorClass}>{errors.systolic.message}</p>}
                </div>
                <div>
                  <label className={labelClass} htmlFor="rec-diastolic">
                    Diastólica (mmHg)
                  </label>
                  <input
                    id="rec-diastolic"
                    type="number"
                    placeholder="Ex: 80"
                    className={fieldClass}
                    {...register('diastolic')}
                  />
                  {errors.diastolic && <p className={errorClass}>{errors.diastolic.message}</p>}
                </div>
              </div>
            )}

            {(vitalType === 'heart_rate' || vitalType === 'weight') && (
              <div>
                <label className={labelClass} htmlFor="rec-vital-value">
                  {vitalType === 'heart_rate' ? 'Frequência (bpm)' : 'Peso (kg)'}
                </label>
                <input
                  id="rec-vital-value"
                  type="number"
                  step={vitalType === 'weight' ? '0.1' : '1'}
                  placeholder={vitalType === 'heart_rate' ? 'Ex: 72' : 'Ex: 68.5'}
                  className={fieldClass}
                  {...register('vitalValue')}
                />
                {errors.vitalValue && <p className={errorClass}>{errors.vitalValue.message}</p>}
              </div>
            )}
          </>
        )}

        {/* EVENT */}
        {recordType === 'EVENT' && (
          <>
            <div>
              <label className={labelClass} htmlFor="rec-event-desc">
                Descrição
              </label>
              <textarea
                id="rec-event-desc"
                rows={2}
                placeholder="Ex: consulta com cardiologista…"
                className={cn(fieldClass, 'resize-none')}
                {...register('eventDescription')}
              />
              {errors.eventDescription && (
                <p className={errorClass}>{errors.eventDescription.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass} htmlFor="rec-event-location">
                Local (opcional)
              </label>
              <input
                id="rec-event-location"
                type="text"
                placeholder="Ex: Hospital São Lucas…"
                className={fieldClass}
                {...register('eventLocation')}
              />
            </div>
          </>
        )}

        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-zels-urgent">{submitError}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-zels-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            {isPending ? 'Salvando…' : 'Salvar registro'}
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
