'use client'

import Link from 'next/link'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useRecentRecords, type RecentRecord } from '@/hooks/useRecentRecords'

const TYPE_LABELS: Record<string, string> = {
  VITAL:   'Sinal vital',
  SYMPTOM: 'Sintoma',
  DIARY:   'Diário',
  EVENT:   'Evento',
}

const INTENSITY_PT: Record<string, string> = {
  mild: 'leve', moderate: 'moderado', severe: 'grave', low: 'baixo', high: 'alto',
}

const VITAL_TYPE_PT: Record<string, string> = {
  blood_pressure: 'pressão arterial', heart_rate: 'frequência cardíaca',
  blood_glucose: 'glicemia', weight: 'peso', temperature: 'temperatura',
}

function formatRecordText(r: RecentRecord): string {
  const d = r.data
  if (!d || typeof d !== 'object') return TYPE_LABELS[r.type] ?? r.type

  switch (r.type) {
    case 'SYMPTOM': {
      const parts: string[] = []
      if (typeof d.symptom   === 'string') parts.push(d.symptom)
      if (typeof d.intensity === 'string') parts.push(INTENSITY_PT[d.intensity] ?? d.intensity)
      return parts.length > 0 ? parts.join(' · ') : TYPE_LABELS.SYMPTOM
    }
    case 'VITAL': {
      const parts: string[] = []
      if (typeof d.type === 'string') parts.push(VITAL_TYPE_PT[d.type] ?? d.type)
      if (d.systolic !== undefined && d.diastolic !== undefined)
        parts.push(`${d.systolic}/${d.diastolic}${d.unit ? ` ${d.unit}` : ' mmHg'}`)
      else if (d.value !== undefined)
        parts.push(`${d.value}${d.unit ? ` ${d.unit}` : ''}`)
      return parts.length > 0 ? parts.join(' · ') : TYPE_LABELS.VITAL
    }
    case 'DIARY':
      return typeof d.text === 'string' ? d.text : TYPE_LABELS.DIARY
    case 'EVENT':
      return typeof d.description === 'string' ? d.description : TYPE_LABELS.EVENT
    default:
      return TYPE_LABELS[r.type] ?? r.type
  }
}

function formatDateTime(dateStr: string): string {
  const date      = new Date(dateStr)
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const time         = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  const dateKey      = date.toLocaleDateString('pt-BR')
  const todayKey     = today.toLocaleDateString('pt-BR')
  const yesterdayKey = yesterday.toLocaleDateString('pt-BR')

  if (dateKey === todayKey)     return `hoje · ${time}`
  if (dateKey === yesterdayKey) return `ontem · ${time}`

  const day   = date.getDate()
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${day} ${month} · ${time}`
}

function RecordRow({ record, last }: { record: RecentRecord; last: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '3.75rem 1fr',
      gap: '0.75rem',
      paddingBottom: last ? 0 : '0.625rem',
      marginBottom: last ? 0 : '0.625rem',
      borderBottom: last ? 'none' : '1px solid rgba(61,43,31,0.06)',
    }}>
      <span style={{
        fontFamily: 'monospace',
        fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)', paddingTop: '1px',
      }}>
        {formatDateTime(record.createdAt)}
      </span>
      <div>
        <p style={{ fontSize: '0.84375rem', color: '#3D2B1F', lineHeight: 1.3 }}>
          {formatRecordText(record)}
        </p>
        <p style={{ fontSize: '0.71875rem', color: 'var(--zels-primary-strong)', marginTop: '2px' }}>
          {TYPE_LABELS[record.type] ?? record.type}
          {record.recordedBy ? ` — ${record.recordedBy}` : ''}
        </p>
      </div>
    </div>
  )
}

export function DashRecentRecords() {
  const { data: profile }            = useHealthProfile()
  const { data: records, isLoading } = useRecentRecords(profile?.id)

  const list = Array.isArray(records) ? records : []

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{
          fontFamily: 'monospace',
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
          color: 'var(--zels-primary)',
        }}>
          ÚLTIMOS REGISTROS
        </p>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse" style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ width: '2.5rem', height: '0.75rem', backgroundColor: '#efece5', borderRadius: '4px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div style={{ height: '0.875rem', backgroundColor: '#efece5', borderRadius: '4px' }} />
                <div style={{ height: '0.75rem', backgroundColor: '#efece5', borderRadius: '4px', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.42)', paddingTop: '0.5rem' }}>
          Nenhum registro hoje.
        </p>
      )}

      {!isLoading && list.length > 0 && (
        <div>
          {list.map((r, i) => (
            <RecordRow key={r.id} record={r} last={i === list.length - 1} />
          ))}
        </div>
      )}

      <Link
        href="/saude"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '0.875rem',
          padding: '0.4375rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid rgba(139,175,138,0.50)',
          fontSize: '0.8125rem', fontWeight: 500,
          color: 'var(--zels-primary-strong)',
          textDecoration: 'none',
        }}
      >
        + Registrar algo agora
      </Link>
    </div>
  )
}
