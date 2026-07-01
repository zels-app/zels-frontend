'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Exam } from '@/lib/api/exams'

interface ChartPoint {
  date: string
  rawDate: string
  value: number
  examType: string
  unit: string
  status: string
  referenceRange?: string
}

function getStatusColor(status: string): string {
  if (status === 'alto' || status === 'baixo') return '#C4846A'
  if (status === 'atenção') return '#9B5A42'
  return '#5F8260'
}

function getAllBiomarkerNames(exams: Exam[]): string[] {
  const names = new Set<string>()
  exams.forEach(e => e.extractedData?.biomarkers?.forEach(b => names.add(b.name)))
  return Array.from(names).sort()
}

function parseReferenceRange(ref: string | undefined): { lower?: number; upper?: number } {
  if (!ref) return {}

  // Remove conteúdo entre parênteses — ex: "(17-40 anos)", "(com jejum)", "(< 60 anos)"
  // Isso evita que faixas etárias ou condições entre parênteses atrapalhem o parse
  const withoutParens = ref.replace(/\([^)]*\)/g, '').trim()

  // Remove prefixos textuais SOMENTE quando seguidos de símbolo de comparação
  // Ex: "Normal: < 5,7%" → "< 5,7%". Mas preserva "Superior a 20" intacto.
  const withoutPrefix = withoutParens.replace(/^[^<>≤≥]*?(?=[<>≤≥])/, '').trim()

  // Remove unidades do sufixo — ex: "µg/dL", "mmol/L", "ng/mL", "%", "U/L"
  const withoutUnit = withoutPrefix
    .replace(/\s+[a-zA-Zµμ%°][^\s,]*(\s+[a-zA-Zµμ%°][^\s,]*)*\s*$/, '')
    .trim()

  // Normaliza vírgula decimal → ponto
  const normalized = withoutUnit.replace(/,/g, '.').replace(/\s+/g, ' ').trim()

  // Resolve número com ponto de milhar brasileiro
  // Heurística: "4.000" (4 dígitos após ponto, sem segundo ponto) → 4000
  // "0.70" (2 dígitos após ponto) → decimal normal → 0.70
  function parseBrNumber(s: string): number {
    const cleaned = s.trim()
    // Se tem ponto seguido de exatamente 3 dígitos no final → separador de milhar
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      return parseFloat(cleaned.replace(/\./g, ''))
    }
    return parseFloat(cleaned)
  }

  // Limite superior por palavra: "Inferior a N", "até N", "abaixo de N",
  // "menor que N", "menor ou igual a N"
  const upperWordMatch = normalized.match(
    /(?:inferior\s+a|até|abaixo\s+de|menor\s+(?:ou\s+igual\s+)?(?:que|a))\s*([0-9]+(?:\.[0-9]*)?)/i
  )
  if (upperWordMatch) {
    return { upper: parseBrNumber(upperWordMatch[1]) }
  }

  // Limite inferior por palavra: "Superior a N", "acima de N",
  // "maior que N", "maior ou igual a N"
  const lowerWordMatch = normalized.match(
    /(?:superior\s+a|acima\s+de|maior\s+(?:ou\s+igual\s+)?(?:que|a))\s*([0-9]+(?:\.[0-9]*)?)/i
  )
  if (lowerWordMatch) {
    return { lower: parseBrNumber(lowerWordMatch[1]) }
  }

  // Formato de intervalo: "N a N", "N e N", "N - N", "N – N", "N–N"
  // Suporta separadores de milhar: "4.000 a 10.000"
  const rangeMatch = normalized.match(
    /([0-9]+(?:\.[0-9]+)?)\s*(?:a|e|–|-)\s*([0-9]+(?:\.[0-9]+)?)/
  )
  if (rangeMatch) {
    return {
      lower: parseBrNumber(rangeMatch[1]),
      upper: parseBrNumber(rangeMatch[2]),
    }
  }

  // Limite superior por símbolo: "< N" ou "<= N" ou "≤ N"
  const upperMatch = normalized.match(/[<≤]=?\s*([0-9]+(?:\.[0-9]+)?)/)
  if (upperMatch) {
    return { upper: parseBrNumber(upperMatch[1]) }
  }

  // Limite inferior por símbolo: "> N" ou ">= N" ou "≥ N"
  const lowerMatch = normalized.match(/[>≥]=?\s*([0-9]+(?:\.[0-9]+)?)/)
  if (lowerMatch) {
    return { lower: parseBrNumber(lowerMatch[1]) }
  }

  // Puramente textual (ex: "Variável por risco cardiovascular",
  // "Negativo", "Não reagente") → sem limites numéricos
  return {}
}

function buildChartData(exams: Exam[], biomarkerName: string): ChartPoint[] {
  return exams
    .filter(e => e.extractedData?.biomarkers?.some(b => b.name === biomarkerName))
    .map(e => {
      const b = e.extractedData!.biomarkers.find(b => b.name === biomarkerName)!
      return {
        rawDate: e.examDate,
        date: new Date(e.examDate).toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'short', year: '2-digit',
        }),
        value: b.value,
        examType: e.type,
        unit: b.unit,
        status: b.status,
        referenceRange: b.referenceRange,
      }
    })
    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
}

function buildDomainForPoints(points: ChartPoint[]): [number, number] {
  const values = points.map(p => p.value)
  const ref = points[points.length - 1]?.referenceRange
  const limits = ref ? parseReferenceRange(ref) : {}
  if (limits.upper !== undefined) values.push(limits.upper)
  if (limits.lower !== undefined) values.push(limits.lower)
  if (values.length === 0) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const center = (min + max) / 2
  const minMargin = Math.max(center * 0.10, 1)
  const margin = range < minMargin ? minMargin : range * 0.20
  return [Math.max(0, min - margin), max + margin]
}

const LINE_COLORS = ['#8BAF8A', '#C4846A', '#6A8FC4', '#C4A86A']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint }
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={getStatusColor(payload.status)}
      stroke="white" strokeWidth={2}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload as ChartPoint
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: '10px', padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '0.8rem',
    }}>
      <p style={{ fontWeight: 700, color: 'var(--foreground)', marginBottom: '4px' }}>{data.date}</p>
      <p style={{ color: 'var(--zels-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        {data.value} {data.unit}
      </p>
      <p style={{ color: 'var(--zels-text-soft)', marginTop: '2px', fontSize: '0.75rem' }}>{data.examType}</p>
      <span style={{
        display: 'inline-block', marginTop: '5px',
        padding: '2px 8px', borderRadius: '999px',
        fontSize: '0.7rem', fontWeight: 700,
        background: data.status === 'normal' ? 'rgba(95,130,96,0.12)' : 'rgba(196,132,106,0.15)',
        color: data.status === 'normal' ? '#5F8260' : '#C4846A',
      }}>
        {data.status}
      </span>
    </div>
  )
}

export function BiomarkerHistoryChart({ exams }: { exams: Exam[] }) {
  const biomarkerNames = useMemo(() => getAllBiomarkerNames(exams), [exams])
  const [selected, setSelected] = useState<string>(biomarkerNames[0] ?? '')

  const chartData = useMemo(
    () => buildChartData(exams, selected),
    [exams, selected]
  )

  const unitGroups = useMemo(() => {
    const groups: Record<string, ChartPoint[]> = {}
    chartData.forEach(point => {
      const key = point.unit || 'sem unidade'
      if (!groups[key]) groups[key] = []
      groups[key].push(point)
    })
    return groups
  }, [chartData])

  const unitList = Object.keys(unitGroups)
  const hasMultipleUnits = unitList.length > 1

  if (biomarkerNames.length === 0) return null

  // Usa o intervalo de referência do registro mais recente do marcador selecionado
  const latestRef = chartData[chartData.length - 1]?.referenceRange
  const refLimits = latestRef ? parseReferenceRange(latestRef) : {}

  return (
    <div style={{
      background: 'var(--card)', borderRadius: '16px',
      padding: '20px 20px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: '1px solid rgba(0,0,0,0.05)',
      marginBottom: '8px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: '16px',
        flexWrap: 'wrap', gap: '10px',
      }}>
        <div>
          <p style={{
            fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--zels-primary)', marginBottom: '3px',
          }}>
            Histórico de marcadores
          </p>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Evolução ao longo do tempo
          </p>
        </div>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--muted)',
            fontSize: '0.82rem', color: 'var(--foreground)',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          {biomarkerNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Gráfico ou estado vazio */}
      {chartData.length === 0 ? (
        <div style={{
          height: '140px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--muted)', borderRadius: '10px',
        }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--zels-text-faint)', textAlign: 'center' }}>
            Nenhum dado disponível para este marcador.
          </p>
        </div>
      ) : hasMultipleUnits ? (
        <>
          <p style={{ fontSize: '0.75rem', color: '#C4846A', marginBottom: '12px' }}>
            ⚠️ Este marcador foi registrado com unidades diferentes entre exames ({unitList.join(' e ')}). Os grupos são exibidos separadamente e não devem ser comparados diretamente.
          </p>
          {unitList.map((unit, lineIndex) => {
            const lineData = unitGroups[unit]
            const lineColor = LINE_COLORS[lineIndex % LINE_COLORS.length]
            const unitDomain = buildDomainForPoints(lineData)
            const unitRef = parseReferenceRange(lineData[lineData.length - 1]?.referenceRange)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const renderLabel = (props: any) => {
              const { x, y, index } = props
              const point = lineData[index]
              if (!point) return null
              return (
                <text x={x} y={y - 12} textAnchor="middle" fontSize={11} fontWeight={700}
                  fill="var(--zels-text-soft)" fontFamily="var(--font-mono)">
                  {point.value} {point.unit}
                </text>
              )
            }
            return (
              <div key={unit} style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.75rem', color: '#8BAF8A', marginBottom: '6px', fontWeight: 600 }}>
                  Unidade: {unit}
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={lineData} margin={{ top: 24, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'var(--zels-text-faint)' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis hide domain={unitDomain} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={lineColor}
                      strokeWidth={2.5}
                      dot={<CustomDot />}
                      activeDot={{ r: 7, fill: lineColor, stroke: 'white', strokeWidth: 2 }}
                      label={renderLabel}
                    />
                    {unitRef.upper !== undefined && (
                      <ReferenceLine
                        y={unitRef.upper}
                        stroke="#E05535"
                        strokeDasharray="6 3"
                        strokeWidth={1.5}
                        label={{
                          value: `Máx: ${unitRef.upper}`,
                          position: 'insideTopRight',
                          fontSize: 10,
                          fill: '#E05535',
                          fontWeight: 700,
                        }}
                      />
                    )}
                    {unitRef.lower !== undefined && (
                      <ReferenceLine
                        y={unitRef.lower}
                        stroke="#E05535"
                        strokeDasharray="6 3"
                        strokeWidth={1.5}
                        label={{
                          value: `Mín: ${unitRef.lower}`,
                          position: 'insideBottomRight',
                          fontSize: 10,
                          fill: '#E05535',
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </>
      ) : (
        <>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--zels-text-faint)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis hide domain={buildDomainForPoints(chartData)} />
            <Tooltip content={<CustomTooltip />} />
            {unitList.map((unit, lineIndex) => {
              const lineData = unitGroups[unit]
              const lineColor = LINE_COLORS[lineIndex % LINE_COLORS.length]
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const renderLabel = (props: any) => {
                const { x, y, index } = props
                const point = lineData[index]
                if (!point) return null
                return (
                  <text x={x} y={y - 12} textAnchor="middle" fontSize={11} fontWeight={700}
                    fill="var(--zels-text-soft)" fontFamily="var(--font-mono)">
                    {point.value} {point.unit}
                  </text>
                )
              }
              return (
                <Line
                  key={unit}
                  type="monotone"
                  data={lineData}
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2.5}
                  name={unit}
                  connectNulls={false}
                  dot={<CustomDot />}
                  activeDot={{ r: 7, fill: lineColor, stroke: 'white', strokeWidth: 2 }}
                  label={renderLabel}
                />
              )
            })}
            {refLimits.upper !== undefined && (
              <ReferenceLine
                y={refLimits.upper}
                stroke="#E05535"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `Máx: ${refLimits.upper}`,
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: '#E05535',
                  fontWeight: 700,
                }}
              />
            )}
            {refLimits.lower !== undefined && (
              <ReferenceLine
                y={refLimits.lower}
                stroke="#E05535"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `Mín: ${refLimits.lower}`,
                  position: 'insideBottomRight',
                  fontSize: 10,
                  fill: '#E05535',
                  fontWeight: 700,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {chartData.length === 1 && (
          <p style={{
            fontSize: '0.75rem', color: 'var(--zels-text-faint)',
            textAlign: 'center', marginTop: '8px', fontWeight: 600,
          }}>
            Adicione mais exames com este marcador para ver a evolução ao longo do tempo.
          </p>
        )}
        </>
      )}

      {/* Legenda de status */}
      {chartData.length >= 2 && (
        <div style={{ display: 'flex', gap: '14px', marginTop: '10px', flexWrap: 'wrap' }}>
          {[
            { color: '#5F8260', label: 'Normal' },
            { color: '#C4846A', label: 'Alto / Baixo' },
            { color: '#9B5A42', label: 'Atenção' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--zels-text-soft)', fontWeight: 600 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
