'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import {
  useCreateMedication,
  useUpdateMedication,
  type Medication,
} from '@/hooks/useMedications'
import { useDeactivateMedication } from '@/hooks/useDeactivateMedication'

const c = {
  sans: 'var(--font-dm-sans, sans-serif)',
  mono: 'var(--font-jetbrains-mono, monospace)',
  ink: '#3D2B1F',
  inkSoft: 'rgba(61,43,31,0.68)',
  inkFaint: 'rgba(61,43,31,0.42)',
  raised: '#ffffff',
  primary: 'var(--zels-primary-strong)',
  urgent: '#b8341a',
}

const prescriptionSchema = z
  .object({
    name: z.string().min(1, 'Campo obrigatório'),
    dosage: z.string().min(1, 'Campo obrigatório'),
    instructions: z.string().optional(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'CUSTOM']),
    intervalDays: z.coerce.number().int().min(1).optional(),
    startDate: z.string().min(1, 'Campo obrigatório'),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => data.frequency !== 'CUSTOM' || (data.intervalDays && data.intervalDays > 0),
    { message: 'Informe o intervalo em dias', path: ['intervalDays'] }
  )

type FormInput = z.input<typeof prescriptionSchema>
type FormValues = z.output<typeof prescriptionSchema>

export function PrescriptionDialog({
  open,
  onClose,
  healthProfileId,
  medication,
  medications = [],
  initialName,
  initialDosage,
}: {
  open: boolean
  onClose: () => void
  healthProfileId: string
  medication?: Medication
  medications?: Medication[]
  initialName?: string
  initialDosage?: string
}) {
  const [scheduleItems, setScheduleItems] = useState<string[]>([''])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const { mutate: create, isPending: creating } = useCreateMedication(healthProfileId)
  const { mutate: update, isPending: updating } = useUpdateMedication(healthProfileId)
  const { mutate: deactivate, isPending: deactivating } = useDeactivateMedication()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: { frequency: 'DAILY' },
  })

  const frequency = watch('frequency')

  useEffect(() => {
    if (medication) {
      reset({
        name: medication.name,
        dosage: medication.dosage,
        instructions: medication.instructions ?? '',
        frequency: medication.frequency,
        intervalDays: medication.intervalDays ?? undefined,
        startDate: medication.startDate.slice(0, 10),
        endDate: medication.endDate?.slice(0, 10) ?? '',
      })
      setScheduleItems(medication.schedule.length > 0 ? medication.schedule : [''])
    } else {
      reset({ name: initialName ?? '', dosage: initialDosage ?? '', instructions: '', frequency: 'DAILY', intervalDays: undefined, startDate: '', endDate: '' })
      setScheduleItems([''])
    }
  }, [medication, initialName, initialDosage, reset])

  function doSubmit(values: FormValues) {
    const schedule = scheduleItems.filter((t) => t.trim() !== '')
    const body = {
      healthProfileId,
      ...values,
      schedule,
      endDate: values.endDate || undefined,
      instructions: values.instructions || undefined,
    }
    if (medication) {
      update({ id: medication.id, ...body }, { onSuccess: onClose })
    } else {
      create(body, { onSuccess: onClose })
    }
  }

  function onSubmit(values: FormValues) {
    const duplicate = medications.find(
      (m) =>
        m.name.toLowerCase() === values.name.toLowerCase() &&
        m.id !== medication?.id
    )
    if (duplicate) {
      const scheduleStr = duplicate.schedule.length > 0
        ? duplicate.schedule.join(' · ')
        : 'sem horário'
      setDuplicateWarning(
        `"${duplicate.name}" já está cadastrado (${scheduleStr}). ` +
        `Está adicionando um horário diferente para o mesmo medicamento?`
      )
      setPendingSubmit(() => () => doSubmit(values))
      return
    }
    doSubmit(values)
  }

  const isBusy = creating || updating || deactivating
  const title = medication ? 'Editar prescrição' : 'Nova prescrição'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 8,
    border: '1px solid rgba(61,43,31,0.15)',
    background: '#f6f4ef',
    padding: '8px 12px',
    fontSize: '0.875rem',
    color: c.ink,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(61,43,31,0.4)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: c.raised,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          padding: 24,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: c.sans, fontSize: '1rem', fontWeight: 600, color: c.ink }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.inkFaint, padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>Nome *</label>
            <input {...register('name')} placeholder="Ex: Losartana" style={inputStyle} />
            {errors.name && <p style={{ fontSize: '0.75rem', color: c.urgent, marginTop: 4 }}>{errors.name.message}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>Dosagem *</label>
              <input {...register('dosage')} placeholder="Ex: 50mg" style={inputStyle} />
              {errors.dosage && <p style={{ fontSize: '0.75rem', color: c.urgent, marginTop: 4 }}>{errors.dosage.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>Frequência *</label>
              <select {...register('frequency')} style={inputStyle}>
                <option value="DAILY">Diário</option>
                <option value="WEEKLY">Semanal</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>
          </div>

          {frequency === 'CUSTOM' && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>
                A cada quantos dias? *
              </label>
              <input
                type="number"
                min={1}
                {...register('intervalDays')}
                placeholder="Ex: 3"
                style={inputStyle}
              />
              {errors.intervalDays && (
                <p style={{ fontSize: '0.75rem', color: c.urgent, marginTop: 4 }}>{errors.intervalDays.message}</p>
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>Instruções</label>
            <input {...register('instructions')} placeholder="Ex: Tomar após as refeições" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>Data início *</label>
              <input type="date" {...register('startDate')} style={inputStyle} />
              {errors.startDate && <p style={{ fontSize: '0.75rem', color: c.urgent, marginTop: 4 }}>{errors.startDate.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft, display: 'block', marginBottom: 4 }}>Data fim</label>
              <input type="date" {...register('endDate')} style={inputStyle} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: c.inkSoft }}>Horários</label>
              <button
                type="button"
                onClick={() => setScheduleItems((prev) => [...prev, ''])}
                style={{ fontSize: '0.75rem', color: c.primary, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Adicionar horário
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scheduleItems.map((time, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) =>
                      setScheduleItems((prev) =>
                        prev.map((t, idx) => (idx === i ? e.target.value : t))
                      )
                    }
                    style={{ ...inputStyle, fontFamily: c.mono }}
                  />
                  {scheduleItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setScheduleItems((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.inkFaint, padding: 4 }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {duplicateWarning && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid rgba(168,110,19,0.35)',
                background: 'rgba(168,110,19,0.07)',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: '#a86e13', fontWeight: 500, marginBottom: 10 }}>
                {duplicateWarning}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setDuplicateWarning(null); setPendingSubmit(null) }}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 500,
                    color: 'rgba(61,43,31,0.68)', background: 'transparent', border: 'none', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setDuplicateWarning(null)
                    pendingSubmit?.()
                    setPendingSubmit(null)
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
                    background: '#a86e13', color: '#fff', border: 'none',
                    cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.5 : 1,
                  }}
                >
                  {isBusy ? 'Salvando…' : 'Sim, cadastrar mesmo assim'}
                </button>
              </div>
            </div>
          )}

          {confirmDeactivate && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid rgba(184,52,26,0.3)',
                background: 'rgba(184,52,26,0.06)',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: c.urgent, fontWeight: 500, marginBottom: 10 }}>
                Tem certeza? O medicamento será removido das prescrições ativas.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDeactivate(false)}
                  disabled={deactivating}
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 500,
                    color: 'rgba(61,43,31,0.68)', background: 'transparent', border: 'none',
                    cursor: deactivating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deactivating}
                  onClick={() =>
                    deactivate(
                      { medicationId: medication!.id, healthProfileId },
                      { onSuccess: onClose }
                    )
                  }
                  style={{
                    padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
                    background: c.urgent, color: '#fff', border: 'none',
                    cursor: deactivating ? 'not-allowed' : 'pointer',
                    opacity: deactivating ? 0.5 : 1,
                  }}
                >
                  {deactivating ? 'Desativando…' : 'Sim, desativar'}
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              paddingTop: 8,
              borderTop: '1px solid rgba(61,43,31,0.08)',
            }}
          >
            {/* botão desativar — apenas em modo edição */}
            <div>
              {medication && !confirmDeactivate && (
                <button
                  type="button"
                  onClick={() => setConfirmDeactivate(true)}
                  disabled={isBusy}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500,
                    color: c.urgent, background: 'transparent',
                    border: '1px solid rgba(184,52,26,0.25)',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    opacity: isBusy ? 0.5 : 1,
                  }}
                >
                  Desativar prescrição
                </button>
              )}
            </div>

            {/* cancelar + salvar */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                  color: c.inkSoft, background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isBusy || !!duplicateWarning}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                  background: 'var(--primary)', color: '#ffffff', border: 'none',
                  cursor: isBusy || !!duplicateWarning ? 'not-allowed' : 'pointer',
                  opacity: isBusy || !!duplicateWarning ? 0.5 : 1,
                }}
              >
                {isBusy ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
