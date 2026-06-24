'use client'

import { TrendingUp } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useSummary } from '@/lib/api/summary'

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted rounded-lg px-4 py-3 min-w-[90px]">
      <span className="font-mono text-lg font-semibold text-foreground leading-none">{value}</span>
      <span className="text-xs text-zels-text-soft mt-1">{label}</span>
    </div>
  )
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-2.5">
      <div className="h-3.5 bg-muted rounded w-3/4" />
      <div className="h-3.5 bg-muted rounded w-1/2" />
      <div className="h-3.5 bg-muted rounded w-2/3" />
    </div>
  )
}

export function SummaryWidget() {
  const { data: profile } = useHealthProfile()
  const { data: summary, isLoading, isError } = useSummary(profile?.id, '7d')

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Resumo da semana</h2>
          <p className="text-xs text-zels-text-faint mt-0.5">Últimos 7 dias</p>
        </div>
        <div className="h-8 w-8 rounded-lg bg-zels-primary-soft flex items-center justify-center">
          <TrendingUp size={16} className="text-zels-primary" />
        </div>
      </div>

      {isLoading && <SkeletonBlock />}

      {isError && (
        <p className="text-sm text-zels-text-soft">Não foi possível gerar o resumo.</p>
      )}

      {summary && !isLoading && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <StatPill label="Registros" value={summary.stats.totalRecords} />
            <StatPill label="Medicamentos" value={summary.stats.activeMedications} />
            {summary.stats.recordsByType.VITAL !== undefined && (
              <StatPill label="Sinais vitais" value={summary.stats.recordsByType.VITAL} />
            )}
            {summary.stats.recordsByType.SYMPTOM !== undefined && (
              <StatPill label="Sintomas" value={summary.stats.recordsByType.SYMPTOM} />
            )}
          </div>

          {summary.highlights.length > 0 && (
            <ul className="space-y-2">
              {summary.highlights.map((msg, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zels-primary shrink-0" />
                  {msg}
                </li>
              ))}
            </ul>
          )}

          {summary.stats.totalRecords === 0 && summary.highlights.length === 0 && (
            <p className="text-sm text-zels-text-soft">
              Nenhum registro encontrado nos últimos 7 dias.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
