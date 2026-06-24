'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import { getAccessInfo } from '@/lib/access-level'
import { useExams, type ExamFilters } from '@/lib/api/exams'
import { ExamCard } from '@/components/conditions/exam-card'
import { ExamForm } from '@/components/conditions/exam-form'
import { BiomarkerHistoryChart } from '@/components/exams/biomarker-history-chart'

type Period = 'future' | 'month' | 'semester' | 'year' | 'all'

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodFilters(period: Period): ExamFilters {
  if (period === 'all') return {}
  if (period === 'future') return { from: (() => { const d = new Date(); d.setHours(0,0,1,0); return d.toISOString() })() }
  const today    = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const from = new Date(today)
  if (period === 'month')    from.setMonth(from.getMonth() - 1)
  if (period === 'semester') from.setMonth(from.getMonth() - 6)
  if (period === 'year')     from.setFullYear(from.getFullYear() - 1)
  return { from: formatDate(from), to: formatDate(tomorrow) }
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'future',   label: 'Futuros' },
  { value: 'month',    label: 'Último mês' },
  { value: 'semester', label: 'Últimos 6 meses' },
  { value: 'year',     label: 'Último ano' },
  { value: 'all',      label: 'Todos' },
]

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-4 animate-pulse flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/5 bg-muted rounded" />
        <div className="h-3 w-2/5 bg-muted rounded" />
      </div>
      <div className="h-5 w-16 bg-muted rounded-full shrink-0 mt-0.5" />
    </div>
  )
}

export function ExamsList() {
  const [showForm,  setShowForm]  = useState(false)
  const [period,    setPeriod]    = useState<Period>('semester')

  const { data: profile } = useHealthProfile()
  const { data: user }    = useCurrentUser()
  const access = getAccessInfo(user, profile)

  const {
    data: exams,
    isLoading,
    isError,
  } = useExams(profile?.id, periodFilters(period))

  // Query separada para o gráfico — busca todos os exames independente do período
  const { data: allExams } = useExams(profile?.id, {})
  const examsWithData = useMemo(
    () => (allExams ?? []).filter(e => e.extractedData !== null),
    [allExams]
  )

  const addBtnClass = (open: boolean) =>
    cn(
      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
      open
        ? 'bg-muted text-zels-text-soft'
        : 'bg-zels-primary text-white hover:opacity-90'
    )

  const chipClass = (active: boolean) =>
    cn(
      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
      active
        ? 'bg-zels-primary-soft text-zels-primary'
        : 'bg-muted text-zels-text-soft hover:bg-muted/80'
    )

  return (
    <div className="space-y-4">
      {/* Histórico de biomarcadores — exibido quando há exames com dados extraídos */}
      {examsWithData.length > 0 && (
        <BiomarkerHistoryChart exams={examsWithData} />
      )}

      {access.canCreate && (
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className={addBtnClass(showForm)}
        >
          <Plus size={15} />
          {showForm ? 'Cancelar' : 'Novo exame'}
        </button>
      )}

      {showForm && profile?.id && (
        <ExamForm
          healthProfileId={profile.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={chipClass(period === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isError && (
        <p className="py-12 text-center text-sm text-zels-text-soft">
          Não foi possível carregar os exames.
        </p>
      )}
      {isLoading && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}
      {!isLoading && !isError && exams?.length === 0 && (
        <p className="py-12 text-center text-sm text-zels-text-soft">
          Nenhum exame encontrado para este período.
        </p>
      )}
      {!isLoading && !isError && exams && exams.length > 0 && (
        <div className="space-y-3">
          {exams.map(e => (
            <ExamCard key={e.id} exam={e} />
          ))}
        </div>
      )}
    </div>
  )
}
