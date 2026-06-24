'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp, Pill, Plus, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PrescriptionDialog } from '@/components/medications/prescription-dialog'
import {
  type Condition,
  type ConditionStatus,
  type Treatment,
  useConditionTreatments,
  useCreateTreatment,
  useDeleteCondition,
  useDeleteTreatment,
  usePatchCondition,
  useUpdateCondition,
} from '@/lib/api/conditions'

const STATUS_CONFIG: Record<
  ConditionStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  INVESTIGATING: { label: 'Investigando', textClass: 'text-zels-attention', bgClass: 'bg-amber-50' },
  ACTIVE:        { label: 'Ativa',        textClass: 'text-zels-urgent',    bgClass: 'bg-red-50' },
  CONTROLLED:    { label: 'Controlada',   textClass: 'text-zels-ok',        bgClass: 'bg-zels-primary-soft' },
  RESOLVED:      { label: 'Resolvida',    textClass: 'text-zels-text-soft', bgClass: 'bg-muted' },
  CHRONIC:       { label: 'Crônica',      textClass: 'text-blue-700',       bgClass: 'bg-blue-50' },
}

const STATUS_OPTIONS: { value: ConditionStatus; label: string }[] = [
  { value: 'INVESTIGATING', label: 'Investigando' },
  { value: 'ACTIVE',        label: 'Ativa' },
  { value: 'CONTROLLED',   label: 'Controlada' },
  { value: 'CHRONIC',      label: 'Crônica' },
  { value: 'RESOLVED',     label: 'Resolvida' },
]

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Shared style tokens ───────────────────────────────────────────────────────

const fieldClass =
  'w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-zels-text-faint focus:outline-none focus:ring-2 focus:ring-zels-primary/30'
const labelClass = 'block text-xs font-medium text-zels-text-soft mb-1'
const errorClass = 'mt-1 text-xs text-zels-urgent'

const deleteBoxClass =
  'rounded-lg border border-zels-urgent/30 bg-zels-urgent/5 px-3 py-2.5 space-y-2'
const btnPrimaryClass =
  'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zels-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none'
const btnDangerClass =
  'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zels-urgent text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none'
const btnGhostClass =
  'text-xs text-zels-text-faint hover:text-foreground transition-colors'

// ─── Parse treatment description into name + dosage ───────────────────────────

function parseTreatment(description: string): { name: string; dosage: string } {
  const byComma = description.split(',')
  if (byComma.length >= 2) {
    return { name: byComma[0].trim(), dosage: byComma.slice(1).join(',').trim() }
  }
  const byNumber = description.match(/^(.+?)\s+(\d.*)$/)
  if (byNumber) {
    return { name: byNumber[1].trim(), dosage: byNumber[2].trim() }
  }
  return { name: description, dosage: '' }
}

// ─── Treatment row (with inline remove) ───────────────────────────────────────

function TreatmentRow({
  treatment,
  conditionId,
  healthProfileId,
  canCreate,
  canManage,
}: {
  treatment: Treatment
  conditionId: string
  healthProfileId: string
  canCreate: boolean
  canManage: boolean
}) {
  const [confirmRemove,    setConfirmRemove]    = useState(false)
  const [prescriptionOpen, setPrescriptionOpen] = useState(false)
  const { mutate: deleteTreatment, isPending: isDeleting } = useDeleteTreatment()
  const parsed = parseTreatment(treatment.description)

  const startLabel = formatDate(treatment.startDate)
  const endLabel   = formatDate(treatment.endDate)

  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <p className="text-sm text-foreground">{treatment.description}</p>
      <p className="text-xs text-zels-text-faint mt-0.5">
        {startLabel && `Início: ${startLabel}`}
        {endLabel && ` · Fim: ${endLabel}`}
      </p>
      {treatment.notes && (
        <p className="text-xs text-zels-text-soft mt-0.5 italic">{treatment.notes}</p>
      )}

      {confirmRemove ? (
        <div className={cn(deleteBoxClass, 'mt-2')}>
          <p className="text-xs text-foreground">Remover este tratamento?</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => deleteTreatment({ conditionId, id: treatment.id })}
              disabled={isDeleting}
              className={btnDangerClass}
            >
              {isDeleting ? 'Removendo…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              disabled={isDeleting}
              className={btnGhostClass}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-3">
          {canManage && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="text-xs text-zels-text-faint hover:text-zels-urgent transition-colors"
            >
              Remover
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => setPrescriptionOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-zels-primary hover:opacity-75 transition-opacity"
            >
              <Pill size={11} />
              Adicionar aos medicamentos
            </button>
          )}
        </div>
      )}

      {prescriptionOpen && (
        <PrescriptionDialog
          open={prescriptionOpen}
          onClose={() => setPrescriptionOpen(false)}
          healthProfileId={healthProfileId}
          medications={[]}
          initialName={parsed.name}
          initialDosage={parsed.dosage}
        />
      )}
    </div>
  )
}

// ─── Treatment form ────────────────────────────────────────────────────────────

const treatmentSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  startDate:   z.string().min(1, 'Data de início é obrigatória'),
  endDate:     z.string().optional(),
  notes:       z.string().optional(),
})
type TreatmentValues = z.infer<typeof treatmentSchema>

function TreatmentForm({
  conditionId,
  onDone,
}: {
  conditionId: string
  onDone: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate, isPending } = useCreateTreatment(conditionId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TreatmentValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: { description: '', startDate: '', endDate: '', notes: '' },
  })

  function onSubmit(values: TreatmentValues) {
    setSubmitError(null)
    mutate(
      {
        description: values.description,
        startDate:   values.startDate,
        ...(values.endDate?.trim() ? { endDate: values.endDate } : {}),
        ...(values.notes?.trim()   ? { notes: values.notes.trim() } : {}),
      },
      {
        onSuccess: () => { reset(); onDone() },
        onError:   () => setSubmitError('Não foi possível salvar. Tente novamente.'),
      }
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-lg bg-muted/50 p-3 space-y-3 mt-2"
    >
      <p className="text-xs font-semibold text-zels-text-soft">Novo tratamento</p>

      <div>
        <label className={labelClass} htmlFor={`treat-desc-${conditionId}`}>Descrição</label>
        <input
          id={`treat-desc-${conditionId}`}
          type="text"
          placeholder="Ex: Losartana 50mg 1x ao dia…"
          className={fieldClass}
          {...register('description')}
        />
        {errors.description && <p className={errorClass}>{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor={`treat-start-${conditionId}`}>Início</label>
          <input
            id={`treat-start-${conditionId}`}
            type="date"
            className={fieldClass}
            {...register('startDate')}
          />
          {errors.startDate && <p className={errorClass}>{errors.startDate.message}</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor={`treat-end-${conditionId}`}>Fim (opcional)</label>
          <input
            id={`treat-end-${conditionId}`}
            type="date"
            className={fieldClass}
            {...register('endDate')}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor={`treat-notes-${conditionId}`}>Notas (opcional)</label>
        <input
          id={`treat-notes-${conditionId}`}
          type="text"
          placeholder="Observações…"
          className={fieldClass}
          {...register('notes')}
        />
      </div>

      {submitError && <p className="text-xs text-zels-urgent">{submitError}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={btnPrimaryClass}>
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={onDone} disabled={isPending} className={btnGhostClass}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Condition edit form ────────────────────────────────────────────────────────

const editSchema = z.object({
  name:          z.string().min(1, 'Nome é obrigatório'),
  status:        z.string().min(1),
  diagnosisDate: z.string().optional(),
  notes:         z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

function ConditionEditForm({
  condition,
  onDone,
}: {
  condition: Condition
  onDone: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate: updateCondition, isPending } = useUpdateCondition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:          condition.name,
      status:        condition.status,
      diagnosisDate: condition.diagnosisDate?.slice(0, 10) ?? '',
      notes:         condition.notes ?? '',
    },
  })

  function onSubmit(values: EditValues) {
    setSubmitError(null)
    updateCondition(
      {
        id:     condition.id,
        name:   values.name,
        status: values.status as ConditionStatus,
        ...(values.diagnosisDate?.trim() ? { diagnosisDate: values.diagnosisDate } : {}),
        ...(values.notes?.trim()         ? { notes: values.notes.trim() }         : {}),
      },
      {
        onSuccess: () => onDone(),
        onError:   () => setSubmitError('Não foi possível salvar. Tente novamente.'),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <p className="text-xs font-semibold text-zels-text-soft">Editar condição</p>

      <div>
        <label className={labelClass} htmlFor={`cond-edit-name-${condition.id}`}>Nome</label>
        <input
          id={`cond-edit-name-${condition.id}`}
          type="text"
          className={fieldClass}
          {...register('name')}
        />
        {errors.name && <p className={errorClass}>{errors.name.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor={`cond-edit-status-${condition.id}`}>Status</label>
        <select
          id={`cond-edit-status-${condition.id}`}
          className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
          {...register('status')}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor={`cond-edit-diag-${condition.id}`}>
          Data do diagnóstico (opcional)
        </label>
        <input
          id={`cond-edit-diag-${condition.id}`}
          type="date"
          className={fieldClass}
          {...register('diagnosisDate')}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor={`cond-edit-notes-${condition.id}`}>
          Notas (opcional)
        </label>
        <textarea
          id={`cond-edit-notes-${condition.id}`}
          rows={2}
          placeholder="Observações…"
          className={cn(fieldClass, 'resize-none')}
          {...register('notes')}
        />
      </div>

      {submitError && <p className="text-xs text-zels-urgent">{submitError}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={btnPrimaryClass}>
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={onDone} disabled={isPending} className={btnGhostClass}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Condition card ────────────────────────────────────────────────────────────

export function ConditionCard({
  condition,
  healthProfileId,
  canCreate,
  canManage,
}: {
  condition: Condition
  healthProfileId: string
  canCreate: boolean
  canManage: boolean
}) {
  const [expanded,          setExpanded]          = useState(false)
  const [showTreatmentForm, setShowTreatmentForm] = useState(false)
  const [changingStatus,    setChangingStatus]    = useState(false)
  const [newStatus,         setNewStatus]         = useState<ConditionStatus>(condition.status)
  const [patchError,        setPatchError]        = useState<string | null>(null)
  const [editing,           setEditing]           = useState(false)
  const [confirmDelete,     setConfirmDelete]     = useState(false)

  const { data: treatments, isLoading: treatmentsLoading } = useConditionTreatments(
    condition.id,
    expanded
  )
  const { mutate: patchCondition, isPending: isPatching }   = usePatchCondition()
  const { mutate: deleteCondition, isPending: isDeleting }  = useDeleteCondition()

  const config         = STATUS_CONFIG[condition.status]
  const diagnosisLabel = formatDate(condition.diagnosisDate)

  function handleStatusSave() {
    setPatchError(null)
    patchCondition(
      { id: condition.id, status: newStatus },
      {
        onSuccess: () => setChangingStatus(false),
        onError:   () => setPatchError('Não foi possível atualizar. Tente novamente.'),
      }
    )
  }

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => {
          setExpanded(prev => !prev)
          setShowTreatmentForm(false)
          setChangingStatus(false)
          setEditing(false)
          setConfirmDelete(false)
        }}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-zels-primary-soft shrink-0 flex items-center justify-center mt-0.5">
          <Stethoscope size={15} className="text-zels-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{condition.name}</p>
          {diagnosisLabel && (
            <p className="text-xs text-zels-text-faint mt-0.5">Diagnóstico: {diagnosisLabel}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              config.bgClass,
              config.textClass
            )}
          >
            {config.label}
          </span>
          {expanded
            ? <ChevronUp size={14} className="text-zels-text-faint" />
            : <ChevronDown size={14} className="text-zels-text-faint" />
          }
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-5">
          {editing ? (
            <ConditionEditForm
              condition={condition}
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              {condition.notes && (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-zels-text-soft">
                  <span className="font-medium text-foreground">Notas: </span>
                  {condition.notes}
                </div>
              )}

              {/* Treatments */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zels-text-faint mb-2">
                  Tratamentos
                </p>

                {treatmentsLoading && (
                  <div className="space-y-1.5 animate-pulse">
                    <div className="h-8 rounded bg-muted" />
                    <div className="h-8 rounded bg-muted" />
                  </div>
                )}

                {!treatmentsLoading && (!treatments || treatments.length === 0) && !showTreatmentForm && (
                  <p className="py-1 text-sm text-zels-text-faint">Nenhum tratamento registrado.</p>
                )}

                {!treatmentsLoading && treatments && treatments.length > 0 && (
                  <div>
                    {treatments.map(t => (
                      <TreatmentRow
                        key={t.id}
                        treatment={t}
                        conditionId={condition.id}
                        healthProfileId={healthProfileId}
                        canCreate={canCreate}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                )}

                {showTreatmentForm ? (
                  <TreatmentForm
                    conditionId={condition.id}
                    onDone={() => setShowTreatmentForm(false)}
                  />
                ) : canCreate ? (
                  <button
                    type="button"
                    onClick={() => setShowTreatmentForm(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-zels-text-faint hover:text-zels-primary transition-colors"
                  >
                    <Plus size={12} />
                    Adicionar tratamento
                  </button>
                ) : null}
              </div>

              {/* Actions: status / edit / delete */}
              <div className="pt-1 border-t border-border space-y-3">
                {canManage && !changingStatus && !confirmDelete && (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => { setChangingStatus(true); setNewStatus(condition.status) }}
                      className={btnGhostClass}
                    >
                      Alterar status
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className={btnGhostClass}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-zels-text-faint hover:text-zels-urgent transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                )}

                {changingStatus && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zels-text-soft">Novo status</p>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as ConditionStatus)}
                      className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleStatusSave}
                        disabled={isPatching || newStatus === condition.status}
                        className={btnPrimaryClass}
                      >
                        {isPatching ? 'Salvando…' : 'Salvar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setChangingStatus(false)}
                        disabled={isPatching}
                        className={btnGhostClass}
                      >
                        Cancelar
                      </button>
                    </div>
                    {patchError && <p className="text-xs text-zels-urgent">{patchError}</p>}
                  </div>
                )}

                {confirmDelete && (
                  <div className={deleteBoxClass}>
                    <p className="text-xs text-foreground">
                      Excluir esta condição permanentemente? Os tratamentos vinculados também serão removidos.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => deleteCondition(condition.id)}
                        disabled={isDeleting}
                        className={btnDangerClass}
                      >
                        {isDeleting ? 'Excluindo…' : 'Confirmar exclusão'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting}
                        className={btnGhostClass}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
