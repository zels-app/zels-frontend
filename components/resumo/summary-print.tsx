'use client'

import { useHealthProfile } from '@/lib/api/health-profile'
import { useSummary, type SummaryPeriod } from '@/lib/api/summary'
import { useEmergency } from '@/lib/api/emergency'
import { useCurrentUser } from '@/lib/api/user'

// Visível APENAS em @media print (pai usa className="hidden print:block")
// Todos os estilos são inline para garantir renderização correta no browser de impressão.

const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  '7d':  'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  VITAL:   'Sinais vitais',
  SYMPTOM: 'Sintomas',
  DIARY:   'Diário',
  EXAM:    'Exames',
  EVENT:   'Eventos',
}

const VITAL_TYPE_PT: Record<string, string> = {
  BLOOD_PRESSURE: 'Pressão arterial',
  HEART_RATE:     'Freq. cardíaca',
  WEIGHT:         'Peso',
  TEMPERATURE:    'Temperatura',
  OXYGEN:         'Saturação O₂',
  GLUCOSE:        'Glicemia',
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatVitalValue(data: { type: string; systolic?: number; diastolic?: number; value?: number; unit?: string }): string {
  if (data.systolic !== undefined && data.diastolic !== undefined) {
    return `${data.systolic}/${data.diastolic} mmHg`
  }
  if (data.value !== undefined) {
    return `${data.value}${data.unit ? ' ' + data.unit : ''}`
  }
  return '—'
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.5rem', breakInside: 'avoid' }}>
      <p
        style={{
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: '#555',
          textTransform: 'uppercase' as const,
          borderBottom: '1px solid #ddd',
          paddingBottom: '4px',
          marginBottom: '10px',
          fontFamily: 'monospace',
        }}
      >
        {title}
      </p>
      {children}
    </section>
  )
}

interface Props {
  period: SummaryPeriod
}

export function SummaryPrint({ period }: Props) {
  const { data: profile }    = useHealthProfile()
  const { data: summary }    = useSummary(profile?.id, period)
  const { data: emergency }  = useEmergency(profile?.id)
  const { data: currentUser } = useCurrentUser()

  if (!summary) return null

  const recordEntries  = Object.entries(summary.stats.recordsByType)
  const recentVitals   = Array.isArray(emergency?.recentVitals) ? emergency!.recentVitals.slice(0, 5) : []
  const medications    = Array.isArray(emergency?.medications)  ? emergency!.medications               : []

  const root: React.CSSProperties = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '13px',
    color: '#000',
    backgroundColor: '#fff',
    padding: '2cm',
    lineHeight: 1.5,
  }

  const row: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '0.5rem',
    padding: '0.3rem 0',
    borderBottom: '1px dotted #e0e0e0',
    fontSize: '0.875rem',
  }

  return (
    <div style={root}>

      {/* Cabeçalho */}
      <div style={{ borderBottom: '2px solid #3D2B1F', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#5F8260',
                letterSpacing: '0.02em',
                marginBottom: '4px',
              }}
            >
              Zel&apos;s
            </p>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#555',
                textTransform: 'uppercase',
              }}
            >
              Resumo Médico
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{summary.patientName}</p>
            {emergency?.patient && (
              <p style={{ fontSize: '0.75rem', color: '#555' }}>
                {emergency.patient.age} anos
                {emergency.patient.bloodType ? ` · Tipo ${emergency.patient.bloodType}` : ''}
              </p>
            )}
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '6px' }}>
          {PERIOD_LABELS[period]} · Gerado em {formatDate(summary.generatedAt)}
        </p>
      </div>

      {/* Síntese */}
      <PrintSection title="Síntese">
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', margin: 0 }}>
          {summary.summaryText}
        </p>
      </PrintSection>

      {/* Destaques */}
      {summary.highlights.length > 0 && (
        <PrintSection title="Destaques">
          <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
            {summary.highlights.map((h, i) => (
              <li key={i} style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '4px' }}>
                {h}
              </li>
            ))}
          </ol>
        </PrintSection>
      )}

      {/* Grid 2 colunas: Sinais vitais | Medicamentos */}
      {(recentVitals.length > 0 || medications.length > 0) && (
        <PrintSection title="Dados clínicos">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Sinais vitais */}
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                Sinais vitais recentes
              </p>
              {recentVitals.length > 0 ? (
                recentVitals.map((v, i) => (
                  <div key={i} style={{ ...row }}>
                    <span style={{ color: '#444' }}>
                      {VITAL_TYPE_PT[v.data.type] ?? v.data.type}
                    </span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {formatVitalValue(v.data)}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8125rem', color: '#aaa' }}>Nenhum registro</p>
              )}
            </div>
            {/* Medicamentos */}
            <div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.625rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                Medicamentos ativos
              </p>
              {medications.length > 0 ? (
                medications.map((m, i) => (
                  <div key={i} style={{ ...row }}>
                    <span style={{ color: '#444' }}>{m.name}</span>
                    <span style={{ color: '#666', fontSize: '0.8125rem' }}>{m.dosage}</span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '0.8125rem', color: '#aaa' }}>Nenhum medicamento</p>
              )}
            </div>
          </div>
        </PrintSection>
      )}

      {/* Estatísticas */}
      <PrintSection title="Estatísticas">
        <div style={row}>
          <span style={{ color: '#444' }}>Total de registros</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{summary.stats.totalRecords}</span>
        </div>
        <div style={row}>
          <span style={{ color: '#444' }}>Medicamentos ativos</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{summary.stats.activeMedications}</span>
        </div>
        <div style={row}>
          <span style={{ color: '#444' }}>Condições ativas</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{summary.stats.activeConditions}</span>
        </div>
        {recordEntries.map(([type, count]) => (
          <div key={type} style={{ ...row, paddingLeft: '1rem' }}>
            <span style={{ color: '#666', fontSize: '0.8125rem' }}>
              {RECORD_TYPE_LABELS[type] ?? type}
            </span>
            <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{count}</span>
          </div>
        ))}
      </PrintSection>

      {/* Rodapé */}
      <p
        style={{
          marginTop: '2rem',
          borderTop: '1px solid #ddd',
          paddingTop: '0.75rem',
          fontSize: '0.6875rem',
          fontFamily: 'monospace',
          color: '#888',
          textAlign: 'center' as const,
        }}
      >
        Gerado pelo Zel&apos;s em {formatDate(summary.generatedAt)}
        {currentUser?.name ? ` · Curador: ${currentUser.name}` : ''}
        {' · '}
        {PERIOD_LABELS[period]}
      </p>
    </div>
  )
}
