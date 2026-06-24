'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Printer,
  Copy,
  RefreshCw,
  SendHorizonal,
  Calendar,
  User,
  FileText,
} from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useSummary, type SummaryPeriod } from '@/lib/api/summary'
import { useEmergency } from '@/lib/api/emergency'
import { useAppointmentsUpcoming } from '@/hooks/useAppointmentsUpcoming'
import { api } from '@/lib/api/client'

const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  '7d':  'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
}
const ALL_PERIODS: SummaryPeriod[] = ['7d', '30d', '90d']

const RECORD_TYPE_LABELS: Record<string, string> = {
  VITAL:   'Sinais vitais',
  SYMPTOM: 'Sintomas',
  DIARY:   'Diário',
  EXAM:    'Exames',
  EVENT:   'Eventos',
}

type Target = 'consultation' | 'professional' | 'general'

const TARGETS: { id: Target; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'consultation', label: 'Consulta vinculada', Icon: Calendar },
  { id: 'professional', label: 'Profissional',       Icon: User     },
  { id: 'general',      label: 'Uso geral',          Icon: FileText },
]

function formatApptDetail(scheduledAt: string, professional?: string, title?: string): string {
  const d = new Date(scheduledAt)
  const now = new Date()
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)

  let dayLabel: string
  if (sameDay(d, now)) dayLabel = 'hoje'
  else if (sameDay(d, tomorrow)) dayLabel = 'amanhã'
  else dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })

  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const who = professional || title || 'Compromisso'
  return `${who} · ${dayLabel} às ${time}`
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          style={{ backgroundColor: 'var(--zels-sunken)' }}
        />
      ))}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid rgba(61,43,31,0.09)',
  borderRadius: '14px',
  padding: '20px',
}

function SLabel({
  icon,
  children,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span
        className="font-mono uppercase"
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'var(--zels-primary)',
        }}
      >
        {children}
      </span>
    </div>
  )
}

interface Props {
  period: SummaryPeriod
}

export function SummaryDetail({ period }: Props) {
  const queryClient = useQueryClient()
  const [target,    setTarget]    = useState<Target>('general')
  const [question,  setQuestion]  = useState('')
  const [aiAnswer,  setAiAnswer]  = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState<string | null>(null)
  const [copied,    setCopied]    = useState(false)

  const { data: profile }                       = useHealthProfile()
  const { data: summary, isLoading, isError }   = useSummary(profile?.id, period)
  const { data: emergency }                     = useEmergency(profile?.id)
  const { data: upcomingAppts }                 = useAppointmentsUpcoming(profile?.id)

  const conditions  = Array.isArray(emergency?.conditions)  ? emergency!.conditions  : []
  const medications = Array.isArray(emergency?.medications) ? emergency!.medications : []
  const nextAppt    = upcomingAppts?.[0]
  const recordEntries = summary ? Object.entries(summary.stats.recordsByType) : []

  function handleRegenerate() {
    queryClient.invalidateQueries({ queryKey: ['summary', profile?.id, period] })
  }

  async function handleCopy() {
    if (!summary?.summaryText) return
    await navigator.clipboard.writeText(summary.summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAskZels() {
    if (!question.trim()) return
    setAiLoading(true)
    setAiError(null)
    setAiAnswer(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await api.post<any>('/ai/process', { prompt: question })
      const answer = res?.result ?? res?.response ?? res?.message ?? res?.content ?? JSON.stringify(res)
      setAiAnswer(String(answer))
    } catch {
      setAiError('Não foi possível obter uma resposta. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
  }

  function getTargetDetail(): string | null {
    if (target === 'consultation') {
      if (!nextAppt) return 'Nenhum compromisso próximo'
      return formatApptDetail(nextAppt.scheduledAt, nextAppt.professional, nextAppt.title)
    }
    if (target === 'professional') return 'Informe o profissional ao imprimir'
    return null
  }

  const targetDetail = getTargetDetail()

  return (
    <div className="max-w-[1100px] mx-auto flex gap-6 items-start">

      {/* ── Coluna principal ─────────────────────────────────── */}
      <article className="flex-1 min-w-0 space-y-4">

        {/* SHeader */}
        <div className="space-y-4">
          {profile?.fullName && (
            <p
              className="font-mono uppercase"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: 'var(--zels-text-faint)',
              }}
            >
              {profile.fullName}
            </p>
          )}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'var(--foreground)',
            }}
          >
            Resumo Médico
          </h1>

          {/* TargetSelector */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {TARGETS.map(({ id, label, Icon }) => {
                const isActive = target === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTarget(id)}
                    className="flex items-center gap-1.5 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: isActive ? 'var(--zels-primary-soft)' : 'transparent',
                      border: isActive
                        ? '1px solid rgba(139,175,138,0.45)'
                        : '1px solid rgba(61,43,31,0.12)',
                      color: isActive ? 'var(--zels-primary)' : 'var(--zels-text-soft)',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                )
              })}
            </div>
            {targetDetail && (
              <p
                className="font-mono"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--zels-text-soft)',
                  paddingLeft: '2px',
                }}
              >
                {targetDetail}
              </p>
            )}
          </div>
        </div>

        {/* PeriodPicker */}
        <div className="flex gap-2">
          {ALL_PERIODS.map(p => (
            <Link
              key={p}
              href={`/resumo/${p}`}
              className="text-sm font-medium rounded-lg transition-colors"
              style={{
                padding: '8px 16px',
                backgroundColor: p === period ? 'var(--zels-primary)' : 'transparent',
                border: p === period
                  ? '1px solid var(--zels-primary)'
                  : '1px solid rgba(61,43,31,0.15)',
                color: p === period ? '#fff' : 'var(--zels-text-soft)',
                textDecoration: 'none',
              }}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>

        {/* AINarrative */}
        <div style={cardStyle} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <SLabel icon={<Sparkles size={13} className="text-zels-primary" />}>
              Narrativa gerada pelo Zel&apos;s
            </SLabel>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-zels-text-soft hover:text-foreground transition-colors disabled:opacity-50"
              style={{ fontSize: '0.8125rem' }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Regenerar
            </button>
          </div>

          {isLoading && <SkeletonBlock lines={5} />}
          {isError && (
            <p className="text-sm text-zels-urgent">Erro ao gerar o resumo.</p>
          )}

          {summary && (
            <>
              <p
                style={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.65,
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--zels-sunken)',
                  borderRadius: '10px',
                  padding: '16px',
                  margin: 0,
                }}
              >
                {summary.summaryText}
              </p>

              {summary.highlights.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {summary.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--zels-primary)',
                          marginTop: '7px',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.84375rem',
                          lineHeight: 1.55,
                          color: 'var(--foreground)',
                        }}
                      >
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* AskZels */}
        <div style={cardStyle} className="space-y-3">
          <SLabel icon={<Sparkles size={13} className="text-zels-primary" />}>
            Pergunte ao Zel&apos;s
          </SLabel>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !aiLoading && handleAskZels()}
              placeholder="Ex: quantas vezes sentiu tontura?"
              className="flex-1 text-sm rounded-lg bg-background px-3.5 py-2.5 text-foreground placeholder:text-zels-text-faint focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
              style={{ border: '1px solid rgba(61,43,31,0.15)' }}
            />
            <button
              type="button"
              onClick={handleAskZels}
              disabled={aiLoading || !question.trim()}
              className="flex items-center gap-2 rounded-lg bg-zels-primary text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {aiLoading
                ? <RefreshCw size={14} className="animate-spin" />
                : <SendHorizonal size={14} />
              }
              Perguntar
            </button>
          </div>

          {aiAnswer && (
            <div
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: 'var(--foreground)',
                backgroundColor: 'var(--zels-sunken)',
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              {aiAnswer}
            </div>
          )}
          {aiError && <p className="text-sm text-zels-urgent">{aiError}</p>}

          <p
            className="font-mono"
            style={{ fontSize: '0.6875rem', color: 'var(--zels-text-faint)' }}
          >
            baseado nos dados do período selecionado
          </p>
        </div>

        {/* Estatísticas */}
        <div style={cardStyle} className="space-y-4">
          <SLabel>Estatísticas</SLabel>
          {isLoading && <SkeletonBlock lines={3} />}
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <StatCell value={summary.stats.totalRecords} label="Total de registros" />
              <StatCell value={summary.stats.activeMedications} label="Medicamentos ativos" />
              <StatCell value={summary.stats.activeConditions} label="Condições ativas" />
              <div
                style={{
                  backgroundColor: 'var(--zels-sunken)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                }}
              >
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--zels-text-soft)',
                    letterSpacing: '0.06em',
                    marginBottom: '10px',
                  }}
                >
                  Por tipo
                </p>
                {recordEntries.length > 0 ? (
                  <div className="space-y-1.5">
                    {recordEntries.map(([type, count]) => (
                      <div key={type} className="flex justify-between items-baseline">
                        <span style={{ fontSize: '0.75rem', color: 'var(--zels-text-soft)' }}>
                          {RECORD_TYPE_LABELS[type] ?? type}
                        </span>
                        <span
                          className="font-mono"
                          style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}
                        >
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--zels-text-faint)' }}>—</p>
                )}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* ── Coluna lateral ───────────────────────────────────── */}
      <aside
        className="w-80 shrink-0 hidden lg:block"
        style={{ position: 'sticky', top: '2rem', alignSelf: 'start' }}
      >
        <div
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid rgba(61,43,31,0.09)',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Ações */}
          <div className="space-y-2">
            <p
              className="font-mono uppercase"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--zels-text-faint)',
              }}
            >
              Ações
            </p>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex w-full items-center justify-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5 hover:bg-zels-sunken transition-colors"
              style={{
                border: '1px solid rgba(61,43,31,0.2)',
                color: 'var(--foreground)',
                backgroundColor: 'transparent',
              }}
            >
              <Printer size={14} />
              Imprimir
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!summary}
              className="flex w-full items-center justify-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5 hover:bg-zels-sunken transition-colors disabled:opacity-50"
              style={{ border: 'none', color: 'var(--zels-text-soft)', backgroundColor: 'transparent' }}
            >
              <Copy size={14} />
              {copied ? 'Copiado!' : 'Copiar texto'}
            </button>
          </div>

          <div style={{ height: '1px', backgroundColor: 'rgba(61,43,31,0.08)' }} />

          {/* Período */}
          <div className="space-y-0.5">
            <p
              className="font-mono uppercase mb-2"
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--zels-text-faint)',
              }}
            >
              Período
            </p>
            {ALL_PERIODS.map(p => (
              <Link
                key={p}
                href={`/resumo/${p}`}
                className="flex items-center px-3 py-2 rounded-lg text-sm transition-colors hover:bg-zels-sunken"
                style={{
                  color: p === period ? 'var(--zels-primary)' : 'var(--zels-text-soft)',
                  fontWeight: p === period ? 600 : 400,
                  textDecoration: 'none',
                }}
              >
                {PERIOD_LABELS[p]}
              </Link>
            ))}
          </div>

          {/* Paciente */}
          {emergency && (
            <>
              <div style={{ height: '1px', backgroundColor: 'rgba(61,43,31,0.08)' }} />
              <div className="space-y-3">
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    color: 'var(--zels-text-faint)',
                  }}
                >
                  Paciente
                </p>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {emergency.patient.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--zels-text-soft)', marginTop: '2px' }}>
                    {emergency.patient.age} anos
                  </p>
                </div>
                {conditions.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        color: 'var(--zels-text-faint)',
                        marginBottom: '6px',
                      }}
                    >
                      Condições ativas
                    </p>
                    <ul className="space-y-1">
                      {conditions.slice(0, 4).map((c, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--zels-primary)',
                              flexShrink: 0,
                            }}
                          />
                          <span className="text-xs text-foreground truncate">{c.name}</span>
                        </li>
                      ))}
                      {conditions.length > 4 && (
                        <li style={{ fontSize: '0.6875rem', color: 'var(--zels-text-faint)' }}>
                          +{conditions.length - 4} mais
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                {medications.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        color: 'var(--zels-text-faint)',
                        marginBottom: '6px',
                      }}
                    >
                      Medicamentos
                    </p>
                    <ul className="space-y-1">
                      {medications.slice(0, 4).map((m, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(139,175,138,0.5)',
                              flexShrink: 0,
                            }}
                          />
                          <span className="text-xs text-foreground truncate">{m.name}</span>
                        </li>
                      ))}
                      {medications.length > 4 && (
                        <li style={{ fontSize: '0.6875rem', color: 'var(--zels-text-faint)' }}>
                          +{medications.length - 4} mais
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--zels-sunken)',
        borderRadius: '10px',
        padding: '14px 16px',
      }}
    >
      <p
        className="font-mono"
        style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}
      >
        {value}
      </p>
      <p
        className="font-mono uppercase"
        style={{
          fontSize: '0.6875rem',
          color: 'var(--zels-text-soft)',
          marginTop: '6px',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </p>
    </div>
  )
}
