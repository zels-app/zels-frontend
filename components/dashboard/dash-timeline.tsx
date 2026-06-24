'use client'

import { useHealthProfile } from '@/lib/api/health-profile'
import { useMedicationsToday, type Dose } from '@/hooks/useMedicationsToday'

const H_START = 6
const H_SPAN  = 18
const RULER   = [6, 9, 12, 15, 18, 21, 24]

function timeToPercent(timeStr: string): number {
  if (timeStr.includes(':') && !timeStr.includes('T')) {
    const [hh, mm] = timeStr.split(':').map(Number)
    return Math.min(Math.max(((hh + mm / 60) - H_START) / H_SPAN * 100, 0), 100)
  }
  const d = new Date(timeStr)
  const h = d.getHours() + d.getMinutes() / 60
  return Math.min(Math.max(((h - H_START) / H_SPAN) * 100, 0), 100)
}

function nowPercent(): number {
  const now = new Date()
  return Math.min(Math.max(((now.getHours() + now.getMinutes() / 60) - H_START) / H_SPAN * 100, 0), 100)
}

function formatTimeStr(timeStr: string): string {
  if (timeStr.includes(':') && !timeStr.includes('T')) {
    const [hh, mm] = timeStr.split(':').map(Number)
    return `${hh}h${mm > 0 ? String(mm).padStart(2, '0') : ''}`
  }
  const d = new Date(timeStr)
  const m = d.getMinutes()
  return `${d.getHours()}h${m > 0 ? String(m).padStart(2, '0') : ''}`
}

function shortName(name: string): string {
  return name.length > 10 ? name.slice(0, 10) + '…' : name
}

type DoseGroup = {
  time:          string
  pct:           number
  status:        string
  label:         string
  tooltip:       string
  labelPosition: 'above' | 'below'
}

function groupDoses(doses: Dose[]): DoseGroup[] {
  const map = new Map<string, Dose[]>()
  for (const d of doses) {
    const key = d.scheduledTime ?? d.scheduledAt ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return Array.from(map.entries()).map(([time, group]) => {
    const status = group.some(d => d.status === 'late')    ? 'late'
                 : group.some(d => d.status === 'pending') ? 'pending'
                 : 'taken'
    const names  = group.map(d => d.medicationName ?? d.name ?? '?')
    const label  = group.length === 1 ? shortName(names[0]) : `${group.length} meds`
    return { time, pct: timeToPercent(time), status, label, tooltip: names.join(', '), labelPosition: 'above' as const }
  })
}

// Ordena por posição e alterna acima/abaixo pelo índice — ignora status
function resolveOverlaps(groups: DoseGroup[]): DoseGroup[] {
  const sorted = [...groups].sort((a, b) => a.pct - b.pct)
  return sorted.map((g, i) => ({
    ...g,
    labelPosition: (i % 2 === 0 ? 'above' : 'below') as 'above' | 'below',
  }))
}

function Dot({ status }: { status: string }) {
  const isTaken = status === 'taken'
  const isLate  = status === 'late'
  return (
    <div style={{
      width: 13, height: 13,
      borderRadius: '50%',
      backgroundColor: isTaken ? 'var(--zels-primary)' : isLate ? '#B8341A' : 'transparent',
      border: `2px solid ${isTaken ? 'var(--zels-primary)' : isLate ? '#B8341A' : 'rgba(61,43,31,0.3)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {isTaken && <span style={{ fontSize: '7px', color: '#fff', fontWeight: 700, lineHeight: 1 }}>✓</span>}
      {isLate  && <span style={{ fontSize: '7px', color: '#fff', fontWeight: 700, lineHeight: 1 }}>!</span>}
    </div>
  )
}

function TimelineMarker({ group }: { group: DoseGroup }) {
  const isAbove = group.labelPosition === 'above'
  return (
    <div
      title={group.tooltip}
      style={{
        position: 'absolute',
        left: `${group.pct}%`,
        transform: 'translateX(-50%)',
        ...(isAbove
          ? { bottom: '50%', paddingBottom: '8px' }
          : { top:    '50%', paddingTop:    '8px' }),
        display: 'flex',
        flexDirection: isAbove ? 'column-reverse' : 'column',
        alignItems: 'center',
        gap: '3px',
        zIndex: 1,
      }}
    >
      <Dot status={group.status} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '9px', color: 'rgba(61,43,31,0.42)', lineHeight: 1,
      }}>
        {formatTimeStr(group.time)}
      </span>
      <span style={{
        fontSize: '9px', color: 'rgba(61,43,31,0.68)', lineHeight: 1,
        maxWidth: '80px', textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {group.label}
      </span>
    </div>
  )
}

const LEGEND = [
  { color: 'var(--zels-primary-strong)', border: undefined, label: 'dado' },
  { color: '#A86E13',     border: undefined,            label: 'atenção' },
  { color: '#B8341A',     border: undefined,            label: 'atrasado' },
  { color: 'transparent', border: 'rgba(61,43,31,0.3)', label: 'pendente' },
]

export function DashTimeline() {
  const { data: profile }   = useHealthProfile()
  const { data, isLoading } = useMedicationsToday(profile?.id)

  const safeDoses = Array.isArray(data?.doses) && data!.doses.length > 0 ? data!.doses : []
  const groups    = resolveOverlaps(groupDoses(safeDoses))
  const nowPct    = nowPercent()

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid rgba(61,43,31,0.08)',
      borderRadius: '14px',
      padding: '1.25rem 1.5rem',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#3D2B1F' }}>
            Linha do tempo de hoje
          </p>
          <p style={{ fontSize: '0.78125rem', color: 'rgba(61,43,31,0.68)', marginTop: '2px' }}>
            Medicamentos + registros do cuidador
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {LEGEND.map(({ color, border, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: color,
                border: border ? `1.5px solid ${border}` : undefined,
                flexShrink: 0,
              }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(61,43,31,0.42)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="animate-pulse" style={{ height: '10rem', backgroundColor: '#efece5', borderRadius: '8px' }} />
      )}

      {!isLoading && (
        <div style={{ position: 'relative', height: '160px' }}>

          {/* Marcadores de dose — todos no mesmo container */}
          {groups.map(g => <TimelineMarker key={g.time} group={g} />)}

          {/* Linha horizontal no meio */}
          <div style={{
            position: 'absolute',
            left: '8px', right: '8px',
            top: '50%',
            height: '2px',
            background: '#efece5',
          }} />

          {/* Marcador "agora" — linha vertical centrada na horizontal */}
          <div style={{
            position: 'absolute',
            left: `${nowPct}%`,
            top: 'calc(50% - 8px)',
            height: '16px',
            width: '1px',
            background: 'var(--zels-primary)',
            zIndex: 2,
          }} />
          <span style={{
            position: 'absolute',
            left: `${nowPct}%`,
            top: 'calc(50% - 22px)',
            transform: 'translateX(-50%)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '9px',
            color: 'var(--zels-primary)',
            fontWeight: 600,
            zIndex: 2,
          }}>
            agora
          </span>

          {/* Régua de horas */}
          {RULER.map(h => (
            <span key={h} style={{
              position: 'absolute',
              bottom: 0,
              left: `${((h - H_START) / H_SPAN) * 100}%`,
              transform: 'translateX(-50%)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: 'rgba(61,43,31,0.42)',
            }}>
              {String(h).padStart(2, '0')}h
            </span>
          ))}

        </div>
      )}
    </div>
  )
}
