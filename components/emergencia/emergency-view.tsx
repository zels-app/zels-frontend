'use client'

import { Printer, ExternalLink, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useEmergency } from '@/lib/api/emergency'
import type { EmergencyVital } from '@/lib/api/emergency'

// ── Fixed palette — never inherits theme tokens ───────────────────────────

const P = {
  bg:       '#1a1a1a',
  section:  '#2a2a2a',
  text:     '#ffffff',
  muted:    '#e5e7eb',
  faint:    '#9ca3af',
  faintest: '#6b7280',
  critical: '#ef4444',
  warning:  '#f59e0b',
}

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

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:        { label: 'Ativa',        bg: '#ef444428', color: '#f87171' },
  CHRONIC:       { label: 'Crônica',      bg: '#ef444428', color: '#f87171' },
  CONTROLLED:    { label: 'Controlada',   bg: '#f59e0b28', color: '#fbbf24' },
  INVESTIGATING: { label: 'Investigando', bg: '#37415128', color: '#9ca3af' },
  RESOLVED:      { label: 'Resolvida',    bg: '#37415128', color: '#6b7280' },
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

function timeAgo(dateStr: string): string {
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000)
  if (diffH < 1)  return 'agora'
  if (diffH < 24) return `há ${diffH}h`
  const days = Math.floor(diffH / 24)
  return `há ${days} dias`
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

// ── Small primitives ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: P.faint, fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
      {children}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: P.section, borderRadius: '0.75rem', padding: '1rem' }}>
      {children}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export function EmergencyView() {
  const { data: profile } = useHealthProfile()
  const { data: emergency, isLoading, isError } = useEmergency(profile?.id)

  if (isLoading) {
    return (
      <div style={{ backgroundColor: P.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: P.faint }}>Carregando ficha…</p>
      </div>
    )
  }

  if (isError || !emergency) {
    return (
      <div style={{ backgroundColor: P.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: P.critical }}>Não foi possível carregar a ficha de emergência.</p>
      </div>
    )
  }

  const { patient, medications, conditions, recentVitals, generatedAt } = emergency

  const hasAllergy = patient.emergencyNotes?.toLowerCase().includes('alergi') ?? false
  const bloodLabel = BLOOD_TYPE[patient.bloodType] ?? patient.bloodType
  const meds   = Array.isArray(medications)  ? medications.slice(0, 10) : []
  const conds  = Array.isArray(conditions)   ? conditions : []
  const vitals = Array.isArray(recentVitals) ? recentVitals : []

  return (
    <div style={{ backgroundColor: P.bg, color: P.text, minHeight: '100vh', paddingBottom: '2.5rem' }}>

      {/* ── 1. Banner ───────────────────────────────────────────────── */}
      <div style={{ backgroundColor: P.critical, padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '40rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '0.05em' }}>
              ⚕ FICHA DE EMERGÊNCIA
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', marginTop: '0.125rem' }}>
              Acesso de emergência — {formatDateTime(generatedAt)}
            </p>
          </div>
          <ShieldAlert size={26} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0 }} />
        </div>
      </div>

      <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* ── 2. Identificação ────────────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: P.text, lineHeight: 1.2 }}>
                {patient.name}
              </p>
              <p style={{ color: P.muted, fontSize: '1rem', marginTop: '0.375rem' }}>
                {patient.age} anos
              </p>
            </div>
            {/* Blood type badge */}
            <div style={{
              backgroundColor: P.critical,
              color: '#fff',
              width: 80, height: 80,
              borderRadius: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 700,
              flexShrink: 0,
            }}>
              {bloodLabel}
            </div>
          </div>

          {/* Emergency notes */}
          {patient.emergencyNotes && (
            <div style={{
              marginTop: '1rem',
              backgroundColor: hasAllergy ? '#ef444420' : '#f59e0b20',
              borderLeft: `3px solid ${hasAllergy ? P.critical : P.warning}`,
              borderRadius: '0 0.5rem 0.5rem 0',
              padding: '0.75rem',
            }}>
              {hasAllergy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                  <AlertTriangle size={13} color={P.critical} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', color: P.critical }}>
                    ⚠ ATENÇÃO
                  </span>
                </div>
              )}
              <p style={{ fontSize: '0.875rem', color: hasAllergy ? '#fca5a5' : '#fcd34d' }}>
                {patient.emergencyNotes}
              </p>
            </div>
          )}
        </Card>

        {/* ── 3. Condições ────────────────────────────────────────────── */}
        {conds.length > 0 && (
          <Card>
            <SectionLabel>CONDIÇÕES</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {conds.map((c, i) => {
                const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.INVESTIGATING
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: P.muted }}>{c.name}</span>
                    <span style={{
                      backgroundColor: s.bg, color: s.color,
                      fontSize: '0.6875rem', fontWeight: 500,
                      padding: '0.125rem 0.625rem', borderRadius: 9999,
                      flexShrink: 0,
                    }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── 4. Medicamentos ─────────────────────────────────────────── */}
        {meds.length > 0 && (
          <Card>
            <SectionLabel>MEDICAMENTOS</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {meds.map((m, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: P.text }}>{m.name}</span>
                    <span style={{ fontSize: '0.75rem', color: P.faint, flexShrink: 0 }}>{m.dosage}</span>
                  </div>
                  {Array.isArray(m.schedule) && m.schedule.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: P.faintest, marginTop: '0.125rem' }}>
                      {m.schedule.join(' · ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── 5. Sinais vitais ────────────────────────────────────────── */}
        {vitals.length > 0 && (
          <Card>
            <SectionLabel>ÚLTIMOS SINAIS VITAIS</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vitals.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: P.faint }}>
                    {VITAL_LABELS[v.type] ?? v.type}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: P.muted }}>
                      {formatVital(v)}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: P.faintest }}>
                      {timeAgo(v.recordedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── 6. Rodapé ───────────────────────────────────────────────── */}
        <div style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.6875rem', textAlign: 'center', color: P.faintest }}>
            Gerado pelo Zel&apos;s em {formatDateTime(generatedAt)}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem',
                backgroundColor: P.section, color: P.muted,
                fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer',
              }}
            >
              <Printer size={15} />
              Imprimir ficha
            </button>
            <a
              href="/health-profile"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem',
                backgroundColor: P.section, color: P.faint,
                fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none',
              }}
            >
              <ExternalLink size={15} />
              Editar informações
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
