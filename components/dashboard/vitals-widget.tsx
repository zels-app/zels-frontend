'use client'

import { Activity } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useVitals, type HealthRecord } from '@/lib/api/health-records'

const vitalLabels: Record<string, string> = {
  blood_pressure: 'Pressão arterial',
  heart_rate: 'Freq. cardíaca',
  temperature: 'Temperatura',
  oxygen_saturation: 'Saturação O₂',
  blood_glucose: 'Glicemia',
  weight: 'Peso',
}

function formatValue(data: HealthRecord['data']): string {
  if (data.systolic !== undefined && data.diastolic !== undefined) {
    return `${data.systolic}/${data.diastolic} ${data.unit}`
  }
  if (data.value !== undefined) {
    return `${data.value} ${data.unit}`
  }
  return '—'
}

function formatAge(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000)
  if (diffH < 1) return 'agora'
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'ontem'
  return `${diffD}d`
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 animate-pulse">
      <div className="h-7 w-7 rounded-md bg-muted shrink-0" />
      <div className="flex-1 h-3.5 bg-muted rounded w-2/5" />
      <div className="h-3.5 bg-muted rounded w-16" />
      <div className="h-3 bg-muted rounded w-6" />
    </div>
  )
}

function VitalRow({ record }: { record: HealthRecord }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="h-7 w-7 rounded-md bg-zels-primary-soft shrink-0 flex items-center justify-center">
        <Activity size={14} className="text-zels-primary" />
      </div>
      <p className="flex-1 text-sm text-foreground truncate">
        {vitalLabels[record.data.type as string] ?? record.data.type}
      </p>
      <span className="font-mono text-sm font-medium text-foreground shrink-0">
        {formatValue(record.data)}
      </span>
      <span className="text-xs text-zels-text-faint w-8 text-right shrink-0">
        {record.createdAt ? formatAge(record.createdAt) : '—'}
      </span>
    </div>
  )
}

export function VitalsWidget() {
  const { data: profile } = useHealthProfile()
  const { data: vitals, isLoading, isError } = useVitals(profile?.id)

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Últimos sinais vitais</h2>
        {vitals !== undefined && (
          <span className="font-mono text-xs text-zels-text-faint">{vitals.length}</span>
        )}
      </div>

      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {isError && (
        <p className="text-sm text-zels-text-soft py-8 text-center">
          Não foi possível carregar.
        </p>
      )}

      {!isLoading && !isError && vitals?.length === 0 && (
        <p className="text-sm text-zels-text-soft py-8 text-center">
          Nenhum sinal vital registrado.
        </p>
      )}

      {vitals && vitals.length > 0 &&
        vitals.map((record) => <VitalRow key={record.id} record={record} />)
      }
    </div>
  )
}
