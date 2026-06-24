'use client'

import { AlertTriangle, Pill, Stethoscope, Activity, Clock, ShieldAlert } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useEmergency, type EmergencyVital } from '@/lib/api/emergency'

const BLOOD_TYPE: Record<string, string> = {
  A_POS: 'A+',  A_NEG: 'A−',
  B_POS: 'B+',  B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−',
  O_POS: 'O+',  O_NEG: 'O−',
}

const VITAL_LABELS: Record<string, string> = {
  blood_pressure:    'Pressão arterial',
  heart_rate:        'Freq. cardíaca',
  temperature:       'Temperatura',
  oxygen_saturation: 'Saturação O₂',
  blood_glucose:     'Glicemia',
  weight:            'Peso',
}

const CONDITION_STATUS: Record<string, { label: string; classes: string }> = {
  INVESTIGATING: { label: 'Investigando', classes: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  ACTIVE:        { label: 'Ativa',        classes: 'text-red-400 bg-red-400/10 border-red-400/20'     },
  CONTROLLED:    { label: 'Controlada',   classes: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  RESOLVED:      { label: 'Resolvida',    classes: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'  },
  CHRONIC:       { label: 'Crônica',      classes: 'text-blue-400 bg-blue-400/10 border-blue-400/20'  },
}

function formatVital(vital: EmergencyVital): string {
  const { data } = vital
  if (data.systolic !== undefined && data.diastolic !== undefined) {
    return `${data.systolic}/${data.diastolic}${data.unit ? ` ${data.unit}` : ' mmHg'}`
  }
  if (data.value !== undefined) {
    return `${data.value}${data.unit ? ` ${data.unit}` : ''}`
  }
  return '—'
}

function extractSummary(summary: string | Record<string, unknown>): string {
  if (typeof summary === 'string') return summary
  if (summary.symptom)      return String(summary.symptom)
  if (summary.text)         return String(summary.text)
  if (summary.description)  return String(summary.description)
  if (summary.type !== undefined && summary.systolic !== undefined) {
    const label = summary.type === 'blood_pressure' ? 'Pressão' : String(summary.type)
    return `${label}: ${summary.systolic}/${summary.diastolic} mmHg`
  }
  if (summary.type !== undefined && summary.value !== undefined) {
    const map: Record<string, string> = {
      heart_rate: `Pulso: ${summary.value} bpm`,
      weight:     `Peso: ${summary.value} kg`,
    }
    return map[String(summary.type)] ?? `${summary.type}: ${summary.value}`
  }
  return 'Registro de saúde'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatAge(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return `${Math.floor(diffH / 24)}d`
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        {/* stone-400 = #a8a29e → 8.1:1 sobre #141210 ✅ */}
        <Icon size={13} className="text-stone-400" />
        <span className="font-mono text-xs font-semibold tracking-widest uppercase text-stone-400">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-stone-400 py-1">{text}</p>
}

export function EmergencyPanel() {
  const { data: profile } = useHealthProfile()
  const { data, isLoading, isError } = useEmergency(profile?.id)

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-36 rounded-xl bg-white/[0.04]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 rounded-xl bg-white/[0.04]" />
          <div className="h-40 rounded-xl bg-white/[0.04]" />
          <div className="h-40 rounded-xl bg-white/[0.04]" />
          <div className="h-40 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl bg-zels-urgent/10 border border-zels-urgent/20 p-8 text-center">
        <AlertTriangle size={24} className="text-zels-urgent mx-auto mb-3" />
        {/* stone-300 = #d6d3d1 → 12.9:1 ✅ */}
        <p className="text-sm text-stone-300">Não foi possível carregar os dados de emergência.</p>
      </div>
    )
  }

  const { patient, medications, conditions, recentVitals, recentEvents } = data
  const bloodType = BLOOD_TYPE[patient.bloodType] ?? patient.bloodType

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Hero */}
      <div className="rounded-xl overflow-hidden border border-zels-urgent/25">
        <div className="flex items-center gap-2 px-5 py-2.5 bg-zels-urgent/12 border-b border-zels-urgent/20">
          <ShieldAlert size={13} className="text-zels-urgent" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-zels-urgent">
            Ficha de Emergência
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 p-5 bg-white/[0.02]">
          <div>
            {/* white = 21:1 ✅ */}
            <h1 className="text-2xl font-semibold text-white leading-tight">{patient.name}</h1>
            {/* stone-300 = 12.9:1 ✅ */}
            <p className="mt-1 font-mono text-sm text-stone-300">{patient.age} anos</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-[3.25rem] font-bold leading-none text-zels-urgent">
              {bloodType}
            </p>
            {/* stone-400 = 8.1:1 ✅ */}
            <p className="mt-1 font-mono text-[0.65rem] tracking-widest uppercase text-stone-400">
              Tipo sanguíneo
            </p>
          </div>
        </div>
      </div>

      {/* Notas de emergência */}
      {patient.emergencyNotes && (
        <div className="flex gap-3 rounded-xl bg-amber-400/10 border border-amber-400/20 p-4">
          <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          {/* amber-100 = #fef3c7 → ~28:1 sobre #141210 ✅ */}
          <p className="text-sm text-amber-100 leading-relaxed">{patient.emergencyNotes}</p>
        </div>
      )}

      {/* Grade de seções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Section icon={Pill} title="Medicamentos">
          {medications.length === 0 ? (
            <Empty text="Nenhum medicamento ativo." />
          ) : (
            <ul className="space-y-3">
              {medications.map((med, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div>
                    {/* white = 21:1 ✅ */}
                    <p className="text-sm font-medium text-white">{med.name}</p>
                    {/* stone-400 = 8.1:1 ✅ */}
                    <p className="font-mono text-xs text-stone-400">{med.dosage}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end shrink-0">
                    {med.schedule.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/[0.08] text-stone-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Stethoscope} title="Condições">
          {conditions.length === 0 ? (
            <Empty text="Nenhuma condição registrada." />
          ) : (
            <ul className="space-y-2.5">
              {conditions.map((cond, i) => {
                const status = CONDITION_STATUS[cond.status]
                return (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white">{cond.name}</p>
                    {status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${status.classes}`}>
                        {status.label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section icon={Activity} title="Sinais Vitais Recentes">
          {recentVitals.length === 0 ? (
            <Empty text="Nenhum sinal vital registrado." />
          ) : (
            <ul className="space-y-2.5">
              {recentVitals.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  {/* stone-300 = 12.9:1 ✅ */}
                  <p className="text-xs text-stone-300">
                    {VITAL_LABELS[v.data.type] ?? v.data.type}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm font-medium text-white">
                      {formatVital(v)}
                    </span>
                    {/* stone-400 = 8.1:1 ✅ */}
                    <span className="font-mono text-xs text-stone-400">
                      {formatAge(v.recordedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Clock} title="Eventos Recentes">
          {recentEvents.length === 0 ? (
            <Empty text="Nenhum evento recente." />
          ) : (
            <ul className="space-y-2.5">
              {recentEvents.map((ev, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white">{capitalize(extractSummary(ev.summary))}</p>
                  <span className="font-mono text-xs text-stone-400 shrink-0">
                    {formatAge(ev.recordedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

      </div>

      <p className="text-center font-mono text-xs text-stone-400 pb-4">
        Dados gerados em{' '}
        {new Date(data.generatedAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
