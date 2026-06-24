'use client'

import { Pill } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useMedicationsToday } from '@/hooks/useMedicationsToday'

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-muted rounded w-2/5" />
      <div className="h-2 bg-muted rounded-full" />
      <div className="h-3.5 bg-muted rounded w-1/3" />
    </div>
  )
}

function getBarColor(taken: number, total: number): string {
  if (total === 0) return 'bg-muted'
  const pct = (taken / total) * 100
  if (pct >= 100) return 'bg-zels-ok'
  if (pct >= 80) return 'bg-zels-attention'
  return 'bg-zels-urgent'
}

export function MedicationsTodayWidget() {
  const { data: profile } = useHealthProfile()
  const { data, isLoading, isError } = useMedicationsToday(profile?.id)

  const summary = data?.summary

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Medicamentos hoje</h2>
        <div className="h-8 w-8 rounded-lg bg-zels-primary-soft flex items-center justify-center">
          <Pill size={16} className="text-zels-primary" />
        </div>
      </div>

      {isLoading && <SkeletonBlock />}

      {isError && (
        <p className="text-sm text-zels-text-soft">Não foi possível carregar.</p>
      )}

      {summary && !isLoading && summary.total === 0 && (
        <p className="text-sm text-zels-text-soft">Nenhuma dose programada para hoje.</p>
      )}

      {summary && !isLoading && summary.total > 0 && (
        <div className="space-y-3">
          <p className="leading-none">
            <span className="text-[1.75rem] font-semibold text-foreground">{summary.taken}</span>
            <span className="text-base text-zels-text-soft">/{summary.total} doses administradas hoje</span>
          </p>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(summary.taken, summary.total)}`}
              style={{
                width: summary.taken === 0 && summary.late > 0
                  ? '4px'
                  : `${Math.min((summary.taken / summary.total) * 100, 100)}%`,
              }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {summary.taken === summary.total ? (
              <span className="text-xs text-zels-ok font-medium">Tudo administrado</span>
            ) : summary.late > 0 ? (
              <span className="text-xs font-medium text-zels-urgent">
                {summary.late} dose{summary.late > 1 ? 's' : ''} atrasada{summary.late > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-zels-text-soft">
                {summary.pending} pendente{summary.pending > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
