'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHealthProfile } from '@/lib/api/health-profile'
import {
  useHealthRecords,
  type HealthRecordType,
  type HealthRecord,
} from '@/lib/api/health-records'
import { HealthRecordCard } from './health-record-card'
import { HealthRecordForm } from './health-record-form'

type Period = 'today' | 'week' | 'month'

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodDates(period: Period): { from: string; to: string } {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const from = new Date(today)
  if (period === 'week') from.setDate(from.getDate() - 7)
  if (period === 'month') from.setDate(from.getDate() - 30)
  return { from: formatDate(from), to: formatDate(tomorrow) }
}

function localDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function dateGroupLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toLocaleDateString('pt-BR') === today.toLocaleDateString('pt-BR')) return 'Hoje'
  if (date.toLocaleDateString('pt-BR') === yesterday.toLocaleDateString('pt-BR')) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function groupByDate(records: HealthRecord[]): { label: string; records: HealthRecord[] }[] {
  const groups: { label: string; records: HealthRecord[] }[] = []
  const keyIndex = new Map<string, number>()
  for (const record of records) {
    const key = localDateKey(record.createdAt)
    if (!keyIndex.has(key)) {
      keyIndex.set(key, groups.length)
      groups.push({ label: dateGroupLabel(record.createdAt), records: [] })
    }
    groups[keyIndex.get(key)!].records.push(record)
  }
  return groups
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
]

const TYPE_OPTIONS: { value: HealthRecordType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SYMPTOM', label: 'Sintoma' },
  { value: 'VITAL', label: 'Vital' },
  { value: 'DIARY', label: 'Diário' },
  { value: 'EVENT', label: 'Evento' },
]

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-4 animate-pulse flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-3.5 w-4/5 bg-muted rounded" />
      </div>
      <div className="h-3 w-10 bg-muted rounded shrink-0 mt-1" />
    </div>
  )
}

export function HealthRecordsList() {
  const [period, setPeriod] = useState<Period>('week')
  const [activeType, setActiveType] = useState<HealthRecordType | 'ALL'>('ALL')
  const [limit, setLimit] = useState(10)
  const [showForm, setShowForm] = useState(false)

  const { data: profile } = useHealthProfile()
  const { from, to } = periodDates(period)

  const { data, isLoading, isError } = useHealthRecords(profile?.id, {
    type: activeType === 'ALL' ? undefined : activeType,
    from,
    to,
    limit,
  })

  const records = data?.records ?? []
  const total = data?.total ?? 0
  const hasMore = records.length < total

  const filterChipClass = (active: boolean) =>
    cn(
      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
      active
        ? 'bg-zels-primary-soft text-zels-primary'
        : 'bg-muted text-zels-text-soft hover:bg-muted/80'
    )

  return (
    <div className="space-y-4">
      {/* Botão novo registro */}
      <button
        type="button"
        onClick={() => setShowForm(prev => !prev)}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          showForm
            ? 'bg-muted text-zels-text-soft'
            : 'bg-zels-primary text-white hover:opacity-90'
        )}
      >
        <Plus size={15} />
        {showForm ? 'Cancelar' : 'Novo registro'}
      </button>

      {/* Formulário inline */}
      {showForm && profile?.id && (
        <HealthRecordForm
          healthProfileId={profile.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filtro de período */}
      <div className="flex gap-2 flex-wrap">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setPeriod(opt.value)
              setLimit(10)
            }}
            className={filterChipClass(period === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filtro de tipo */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setActiveType(opt.value)
              setLimit(10)
            }}
            className={filterChipClass(activeType === opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Estados */}
      {isError && (
        <p className="py-12 text-center text-sm text-zels-text-soft">
          Não foi possível carregar os registros.
        </p>
      )}

      {isLoading && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!isLoading && !isError && records.length === 0 && (
        <p className="py-12 text-center text-sm text-zels-text-soft">
          Nenhum registro encontrado para este período.
        </p>
      )}

      {/* Lista agrupada por data */}
      {!isLoading && !isError && records.length > 0 && (
        <div className="space-y-6">
          {groupByDate(records).map(group => (
            <div key={group.label} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zels-text-faint">
                {group.label}
              </p>
              {group.records.map(record => (
                <HealthRecordCard key={record.id} record={record} />
              ))}
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setLimit(prev => prev + 10)}
              className="w-full py-2.5 rounded-lg text-sm text-zels-text-soft border border-border hover:bg-muted transition-colors"
            >
              Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
