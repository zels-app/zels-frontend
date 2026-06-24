'use client'

import { useHealthProfile } from '@/lib/api/health-profile'
import { useEmergency } from '@/lib/api/emergency'
import type { EmergencyVital } from '@/lib/api/emergency'

// Visible ONLY during @media print (parent wraps with className="hidden print:block")

// ── Look-up tables ────────────────────────────────────────────────────────

const BLOOD_TYPE: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+',  B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const VITAL_LABELS: Record<string, string> = {
  blood_pressure:    'Pressão arterial',
  heart_rate:        'Freq. cardíaca',
  temperature:       'Temperatura',
  oxygen_saturation: 'Saturação O₂',
  blood_glucose:     'Glicemia',
  weight:            'Peso',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa', CHRONIC: 'Crônica', CONTROLLED: 'Controlada',
  INVESTIGATING: 'Investigando', RESOLVED: 'Resolvida',
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatVital(vital: EmergencyVital): string {
  const { data } = vital
  if (data.systolic !== undefined && data.diastolic !== undefined)
    return `${data.systolic}/${data.diastolic}${data.unit ? ` ${data.unit}` : ' mmHg'}`
  if (data.value !== undefined)
    return `${data.value}${data.unit ? ` ${data.unit}` : ''}`
  return '—'
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// ── Print-specific styles (inline to guarantee print rendering) ───────────

const styles = {
  root: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '16px',
    color: '#000',
    backgroundColor: '#fff',
    padding: '2cm',
  } as React.CSSProperties,
  header: {
    borderBottom: '2px solid #000',
    paddingBottom: '0.75rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
  } as React.CSSProperties,
  bloodType: {
    border: '2px solid #dc2626',
    color: '#dc2626',
    fontSize: '1.75rem',
    fontWeight: 700,
    width: 64, height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '0.5rem',
    flexShrink: 0,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginTop: '1.5rem',
  } as React.CSSProperties,
  section: {
    breakInside: 'avoid' as const,
    marginBottom: '0',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#555',
    marginBottom: '0.5rem',
    borderBottom: '1px solid #ddd',
    paddingBottom: '0.25rem',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '0.5rem',
    fontSize: '0.9rem',
    padding: '0.25rem 0',
    borderBottom: '1px dotted #e5e7eb',
  } as React.CSSProperties,
  alertBox: {
    border: '1px solid #dc2626',
    padding: '0.5rem 0.75rem',
    marginBottom: '0.75rem',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  footer: {
    marginTop: '2rem',
    borderTop: '1px solid #ddd',
    paddingTop: '0.75rem',
    fontSize: '0.75rem',
    color: '#888',
    textAlign: 'center' as const,
  } as React.CSSProperties,
}

// ── Main Component ────────────────────────────────────────────────────────

export function EmergencyPrint() {
  const { data: profile }   = useHealthProfile()
  const { data: emergency } = useEmergency(profile?.id)

  if (!emergency) return null

  const { patient, medications, conditions, recentVitals, generatedAt } = emergency

  const hasAllergy = patient.emergencyNotes?.toLowerCase().includes('alergi') ?? false
  const bloodLabel = BLOOD_TYPE[patient.bloodType] ?? patient.bloodType
  const meds   = Array.isArray(medications)  ? medications.slice(0, 10) : []
  const conds  = Array.isArray(conditions)   ? conditions : []
  const vitals = Array.isArray(recentVitals) ? recentVitals : []

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#dc2626', marginBottom: '0.25rem' }}>
            ⚕ FICHA DE EMERGÊNCIA
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{patient.name}</h1>
          <p style={{ fontSize: '1rem', color: '#333', marginTop: '0.25rem' }}>{patient.age} anos</p>
        </div>
        <div style={styles.bloodType}>{bloodLabel}</div>
      </div>

      {/* Emergency notes / allergy alert */}
      {patient.emergencyNotes && (
        <div style={{
          ...styles.alertBox,
          borderColor: hasAllergy ? '#dc2626' : '#d97706',
          backgroundColor: hasAllergy ? '#fef2f2' : '#fffbeb',
        }}>
          {hasAllergy && (
            <p style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              ⚠ ATENÇÃO — ALERGIA
            </p>
          )}
          <p style={{ margin: 0 }}>{patient.emergencyNotes}</p>
        </div>
      )}

      {/* 2-column grid */}
      <div style={styles.grid}>

        {/* Conditions */}
        {conds.length > 0 && (
          <section style={styles.section}>
            <p style={styles.sectionTitle}>CONDIÇÕES</p>
            {conds.map((c, i) => (
              <div key={i} style={styles.row}>
                <span>{c.name}</span>
                <span style={{ color: '#666', fontSize: '0.8rem' }}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Medications */}
        {meds.length > 0 && (
          <section style={styles.section}>
            <p style={styles.sectionTitle}>MEDICAMENTOS</p>
            {meds.map((m, i) => (
              <div key={i} style={{ ...styles.row, flexDirection: 'column', alignItems: 'flex-start', gap: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span style={{ color: '#666', fontSize: '0.8rem' }}>{m.dosage}</span>
                </div>
                {Array.isArray(m.schedule) && m.schedule.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>{m.schedule.join(' · ')}</span>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Vitals */}
        {vitals.length > 0 && (
          <section style={styles.section}>
            <p style={styles.sectionTitle}>ÚLTIMOS SINAIS VITAIS</p>
            {vitals.map((v, i) => (
              <div key={i} style={styles.row}>
                <span style={{ color: '#555' }}>{VITAL_LABELS[v.type] ?? v.type}</span>
                <span style={{ fontFamily: 'monospace' }}>{formatVital(v)}</span>
              </div>
            ))}
          </section>
        )}

      </div>

      {/* Footer */}
      <p style={styles.footer}>
        Gerado pelo Zel&apos;s em {formatDateTime(generatedAt)} · Documento de acesso de emergência
      </p>
    </div>
  )
}
