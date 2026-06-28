'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, ChevronDown, ChevronUp, Paperclip, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Exam, type ExamExtractedData, useUpdateExam, useDeleteExam, useExtractExamBiomarkers } from '@/lib/api/exams'
import { useUploadExamFile } from '@/hooks/useUploadExamFile'
import { toast } from 'sonner'
import { BiomarkerConfirmationModal } from '@/components/exams/biomarker-confirmation-modal'

function formatExamDate(iso: string): string {
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

const deleteBoxClass =
  'rounded-lg border border-zels-urgent/30 bg-zels-urgent/5 px-3 py-2.5 space-y-2'
const btnPrimaryClass =
  'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zels-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none'
const btnDangerClass =
  'inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zels-urgent text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none'
const btnGhostClass =
  'text-xs text-zels-text-faint hover:text-foreground transition-colors'

// ─── Exam edit form ────────────────────────────────────────────────────────────

const editSchema = z.object({
  type:     z.string().min(1, 'Tipo é obrigatório'),
  examDate: z.string().min(1, 'Data é obrigatória'),
  notes:    z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

function ExamEditForm({
  exam,
  onDone,
}: {
  exam: Exam
  onDone: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { mutate: updateExam, isPending } = useUpdateExam()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      type:     exam.type,
      examDate: exam.examDate?.slice(0, 10) ?? '',
      notes:    exam.notes ?? '',
    },
  })

  function onSubmit(values: EditValues) {
    setSubmitError(null)
    updateExam(
      {
        id:       exam.id,
        type:     values.type,
        examDate: values.examDate,
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      },
      {
        onSuccess: () => onDone(),
        onError:   () => setSubmitError('Não foi possível salvar. Tente novamente.'),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
      <p className="text-xs font-semibold text-zels-text-soft">Editar exame</p>

      <div>
        <label className={labelClass} htmlFor={`exam-type-${exam.id}`}>Tipo</label>
        <input
          id={`exam-type-${exam.id}`}
          type="text"
          className={fieldClass}
          {...register('type')}
        />
        {errors.type && <p className="mt-1 text-xs text-zels-urgent">{errors.type.message}</p>}
      </div>

      <div>
        <label className={labelClass} htmlFor={`exam-date-${exam.id}`}>Data</label>
        <input
          id={`exam-date-${exam.id}`}
          type="date"
          className={fieldClass}
          {...register('examDate')}
        />
        {errors.examDate && (
          <p className="mt-1 text-xs text-zels-urgent">{errors.examDate.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor={`exam-notes-${exam.id}`}>Notas (opcional)</label>
        <textarea
          id={`exam-notes-${exam.id}`}
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

// ─── Exam card ─────────────────────────────────────────────────────────────────

export function ExamCard({ exam }: { exam: Exam }) {
  const [expanded,         setExpanded]         = useState(false)
  const [editing,          setEditing]          = useState(false)
  const [confirmDelete,    setConfirmDelete]    = useState(false)
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [aiSuggestion,     setAiSuggestion]     = useState<ExamExtractedData | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadFile   = useUploadExamFile()

  const { mutate: deleteExam, isPending: isDeleting } = useDeleteExam()
  const extractBiomarkers = useExtractExamBiomarkers()
  const { mutate: saveExtractedData, isPending: isSavingExtract } = useUpdateExam()

  function handleExtract() {
    extractBiomarkers.mutate(exam.id, {
      onSuccess: (data) => {
        setAiSuggestion(data)
        setShowExtractModal(true)
      },
      onError: (err) => {
        toast.error(`Erro ao extrair: ${(err as Error).message}`)
      },
    })
  }

  function handleConfirmExtraction(data: ExamExtractedData) {
    saveExtractedData(
      { id: exam.id, extractedData: data },
      {
        onSuccess: () => {
          setShowExtractModal(false)
          setAiSuggestion(null)
          toast.success('Biomarcadores salvos com sucesso!')
        },
        onError: () => {
          toast.error('Não foi possível salvar. Tente novamente.')
        },
      }
    )
  }

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setExpanded(prev => !prev)
          setEditing(false)
          setConfirmDelete(false)
        }}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-muted shrink-0 flex items-center justify-center mt-0.5">
          <FileText size={15} className="text-zels-text-soft" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{exam.type}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-zels-text-faint">{formatExamDate(exam.examDate)}</p>
            {exam.fileUrl ? (
              <span style={{
                background: 'rgba(139,175,138,0.12)',
                color: 'var(--zels-ok)',
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '999px',
              }}>
                Resultado anexado
              </span>
            ) : exam.notes ? (
              <span style={{
                background: 'rgba(168,110,19,0.12)',
                color: 'var(--zels-attention)',
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '999px',
              }}>
                Aguardando resultado
              </span>
            ) : null}
          </div>
        </div>

        {expanded
          ? <ChevronUp size={14} className="text-zels-text-faint shrink-0 mt-1" />
          : <ChevronDown size={14} className="text-zels-text-faint shrink-0 mt-1" />
        }
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadFile.mutate({ examId: exam.id, file, healthProfileId: exam.healthProfileId })
          e.target.value = ''
        }}
      />

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {editing ? (
            <ExamEditForm exam={exam} onDone={() => setEditing(false)} />
          ) : (
            <>
              {exam.notes
                ? <p className="text-sm text-zels-text-soft leading-relaxed">{exam.notes}</p>
                : <p className="text-sm text-zels-text-faint">Sem notas registradas.</p>
              }

              <div className="pt-3 border-t" style={{ borderColor: 'var(--zels-sunken)' }}>
                {uploadFile.isPending ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--zels-primary)' }} />
                    <span style={{ color: 'var(--zels-text-soft)', fontSize: '0.8125rem' }}>Enviando...</span>
                  </div>
                ) : exam.fileUrl ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Paperclip size={14} style={{ color: 'var(--zels-text-soft)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--zels-text-soft)', fontSize: '0.8125rem' }}>Arquivo anexado</span>
                    <a
                      href={(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000') + '/' + exam.fileUrl.replace(/\\/g, '/')}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--zels-primary)', fontSize: '0.8125rem', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                    >
                      Ver
                    </a>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:underline"
                      style={{ color: 'var(--zels-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Substituir
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5"
                    style={{ color: 'var(--zels-text-soft)', fontSize: '0.8125rem', cursor: 'pointer' }}
                  >
                    <Paperclip size={14} />
                    Anexar arquivo
                  </button>
                )}
              </div>

              {/* ─── Seção de extração de biomarcadores ─── */}
              {exam.fileUrl && (
                <div className="pt-3 border-t" style={{ borderColor: 'var(--zels-sunken)' }}>
                  {exam.extractedData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Disclaimer discreto pós-confirmação */}
                      <div style={{
                        display: 'flex', gap: '6px', alignItems: 'flex-start',
                        background: 'rgba(155,90,66,0.06)',
                        border: '1px solid rgba(155,90,66,0.16)',
                        borderRadius: '8px', padding: '7px 10px',
                      }}>
                        <AlertTriangle size={12} style={{ color: 'var(--zels-attention)', flexShrink: 0, marginTop: '1px' }} />
                        <p style={{ fontSize: '0.68rem', color: 'var(--zels-text-soft)', lineHeight: 1.5 }}>
                          Dados extraídos por IA. Parâmetros podem variar entre laboratórios.
                        </p>
                      </div>
                      {/* Resumo + ações */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'rgba(139,175,138,0.12)',
                          color: 'var(--zels-primary-strong)',
                          fontSize: '0.72rem', fontWeight: 700,
                          padding: '3px 10px', borderRadius: '999px',
                        }}>
                          {exam.extractedData.biomarkers.length} biomarcadores
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAiSuggestion(exam.extractedData as ExamExtractedData)
                            setShowExtractModal(true)
                          }}
                          style={{ fontSize: '0.75rem', color: 'var(--zels-primary)', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Ver / Editar
                        </button>
                        <button
                          type="button"
                          onClick={handleExtract}
                          disabled={extractBiomarkers.isPending}
                          style={{ fontSize: '0.72rem', color: 'var(--zels-text-faint)', cursor: 'pointer' }}
                        >
                          {extractBiomarkers.isPending ? 'Reprocessando…' : 'Reprocessar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExtract}
                      disabled={extractBiomarkers.isPending}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', width: '100%', padding: '8px 14px', borderRadius: '9px',
                        background: extractBiomarkers.isPending ? 'var(--muted)' : 'rgba(139,175,138,0.1)',
                        border: '1px solid rgba(139,175,138,0.3)',
                        color: extractBiomarkers.isPending ? 'var(--zels-text-faint)' : 'var(--zels-primary-strong)',
                        fontSize: '0.82rem', fontWeight: 700,
                        cursor: extractBiomarkers.isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {extractBiomarkers.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Extraindo dados do laudo… (pode levar alguns segundos)
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Extrair dados com IA
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="pt-1 border-t border-border space-y-3">
                {!confirmDelete && (
                  <div className="flex items-center gap-4">
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

                {confirmDelete && (
                  <div className={deleteBoxClass}>
                    <p className="text-xs text-foreground">Excluir este exame permanentemente?</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => deleteExam(exam.id)}
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
      {showExtractModal && aiSuggestion && (
        <BiomarkerConfirmationModal
          examType={exam.type}
          examDate={exam.examDate}
          suggestion={aiSuggestion}
          onConfirm={handleConfirmExtraction}
          onCancel={() => { setShowExtractModal(false); setAiSuggestion(null) }}
          isSaving={isSavingExtract}
        />
      )}
    </div>
  )
}
