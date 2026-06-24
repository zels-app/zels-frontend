'use client'

import { toast } from 'sonner'
import { Clock, Check, X } from 'lucide-react'
import {
  usePendingApprovals,
  useReviewMedication,
  useReviewCondition,
  useReviewTreatment,
} from '@/lib/api/approvals'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}

function ApproveRow({
  label,
  createdAt,
  onApprove,
  onReject,
  isPending,
}: {
  label: string
  createdAt: string
  onApprove: () => void
  onReject: () => void
  isPending: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid rgba(61,43,31,0.06)',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#3D2B1F',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Clock size={11} color="rgba(61,43,31,0.42)" />
          <span
            style={{
              fontFamily: 'var(--font-jetbrains-mono, monospace)',
              fontSize: '0.6875rem',
              color: 'rgba(61,43,31,0.42)',
            }}
          >
            {timeAgo(createdAt)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onApprove}
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: 'var(--primary)',
            border: 'none',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.5 : 1,
          }}
        >
          <Check size={12} />
          Aprovar
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#b8341a',
            backgroundColor: 'transparent',
            border: '1px solid rgba(184,52,26,0.3)',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.5 : 1,
          }}
        >
          <X size={12} />
          Rejeitar
        </button>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-jetbrains-mono, monospace)',
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(61,43,31,0.42)',
        marginBottom: 2,
        marginTop: 12,
      }}
    >
      {label}
    </p>
  )
}

export function PendingApprovals({ healthProfileId }: { healthProfileId: string }) {
  const { data, isLoading } = usePendingApprovals(healthProfileId)
  const reviewMed   = useReviewMedication()
  const reviewCond  = useReviewCondition()
  const reviewTreat = useReviewTreatment()

  if (isLoading || !data || data.total === 0) return null

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid rgba(168,110,19,0.25)',
        borderRadius: 14,
        padding: '16px 20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <p
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: '#3D2B1F',
          }}
        >
          Aguardando sua aprovação
        </p>
        <span
          style={{
            fontFamily: 'var(--font-jetbrains-mono, monospace)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#a86e13',
            backgroundColor: 'rgba(168,110,19,0.1)',
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {data.total}
        </span>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.68)', marginBottom: 4 }}>
        Registros criados por cuidadores aguardam sua revisão.
      </p>

      {/* Medications */}
      {data.medications.length > 0 && (
        <div>
          <SectionHeader label="Medicamentos" />
          {data.medications.map(med => (
            <ApproveRow
              key={med.id}
              label={`${med.name} · ${med.dosage}`}
              createdAt={med.createdAt}
              isPending={reviewMed.isPending}
              onApprove={() =>
                reviewMed.mutate(
                  { id: med.id, body: { decision: 'approve' } },
                  { onSuccess: () => toast.success('Medicamento aprovado') }
                )
              }
              onReject={() =>
                reviewMed.mutate(
                  { id: med.id, body: { decision: 'reject' } },
                  { onSuccess: () => toast.info('Medicamento rejeitado') }
                )
              }
            />
          ))}
        </div>
      )}

      {/* Conditions */}
      {data.conditions.length > 0 && (
        <div>
          <SectionHeader label="Condições" />
          {data.conditions.map(cond => (
            <ApproveRow
              key={cond.id}
              label={cond.name}
              createdAt={cond.createdAt}
              isPending={reviewCond.isPending}
              onApprove={() =>
                reviewCond.mutate(
                  { id: cond.id, body: { decision: 'approve' } },
                  { onSuccess: () => toast.success('Condição aprovada') }
                )
              }
              onReject={() =>
                reviewCond.mutate(
                  { id: cond.id, body: { decision: 'reject' } },
                  { onSuccess: () => toast.info('Condição rejeitada') }
                )
              }
            />
          ))}
        </div>
      )}

      {/* Treatments */}
      {data.treatments.length > 0 && (
        <div>
          <SectionHeader label="Tratamentos" />
          {data.treatments.map(treat => (
            <ApproveRow
              key={treat.id}
              label={`${treat.condition.name}: ${treat.description}`}
              createdAt={treat.createdAt}
              isPending={reviewTreat.isPending}
              onApprove={() =>
                reviewTreat.mutate(
                  { id: treat.id, body: { decision: 'approve' } },
                  { onSuccess: () => toast.success('Tratamento aprovado') }
                )
              }
              onReject={() =>
                reviewTreat.mutate(
                  { id: treat.id, body: { decision: 'reject' } },
                  { onSuccess: () => toast.info('Tratamento rejeitado') }
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
