'use client'

import { Activity } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useVitalsLatest, type VitalReading } from '@/hooks/useVitalsLatest'

function formatBloodPressure(reading: VitalReading | undefined): string {
  if (!reading || reading.systolic === undefined || reading.diastolic === undefined) return '—'
  return `${reading.systolic}/${reading.diastolic} ${reading.unit}`
}

function formatNumericVital(reading: VitalReading | undefined, fractionDigits = 0): string {
  if (!reading || reading.value === undefined) return '—'
  const formatted = reading.value.toLocaleString('pt-BR', {
    maximumFractionDigits: fractionDigits,
  })
  return `${formatted} ${reading.unit}`
}

function VitalRow({ label, value }: { label: string; value: string }) {
  const isEmpty = value === '—'
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-zels-text-soft">{label}</span>
      <span className={`font-mono text-sm font-medium ${isEmpty ? 'text-zels-text-faint' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0 animate-pulse">
      <div className="h-3.5 bg-muted rounded w-1/3" />
      <div className="h-3.5 bg-muted rounded w-1/4" />
    </div>
  )
}

export function VitalsLatestWidget() {
  const { data: profile } = useHealthProfile()
  const { data: vitals, isLoading, isError } = useVitalsLatest(profile?.id)

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Sinais vitais recentes</h2>
        <div className="h-8 w-8 rounded-lg bg-zels-primary-soft flex items-center justify-center">
          <Activity size={16} className="text-zels-primary" />
        </div>
      </div>

      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {isError && (
        <p className="text-sm text-zels-text-soft py-6 text-center">Não foi possível carregar.</p>
      )}

      {!isLoading && !isError && (
        <>
          <VitalRow label="Pressão arterial" value={formatBloodPressure(vitals?.blood_pressure)} />
          <VitalRow label="Freq. cardíaca" value={formatNumericVital(vitals?.heart_rate)} />
          <VitalRow label="Peso" value={formatNumericVital(vitals?.weight, 1)} />
        </>
      )}
    </div>
  )
}
