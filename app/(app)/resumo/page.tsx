'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { PageHeader } from '@/components/layout/page-header'

const periods = [
  {
    id: '7d',
    label: '7 dias',
    description: 'Registros recentes e sinais vitais',
    badge: 'RÁPIDO',
    featured: false,
  },
  {
    id: '30d',
    label: '30 dias',
    description: 'Visão mensal completa · recomendado para consultas',
    badge: 'RECOMENDADO',
    featured: true,
  },
  {
    id: '90d',
    label: '90 dias',
    description: 'Histórico trimestral',
    badge: 'TRIMESTRAL',
    featured: false,
  },
]

export default function ResumoPage() {
  const router = useRouter()
  const { data: profile } = useHealthProfile()

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="lg:hidden flex items-center gap-1 mb-2 p-1 -ml-1 rounded-md"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <ChevronLeft size={20} />
          </button>
          <PageHeader
            overline={profile?.fullName}
            title="Resumo Médico"
            subtitle="Selecione o período ou crie um novo resumo"
          />
        </div>
        <Link
          href="/resumo/30d"
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-zels-primary text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
        >
          + Novo resumo
        </Link>
      </div>

      {/* Grid 3 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {periods.map(({ id, label, description, badge, featured }) => (
          <Link
            key={id}
            href={`/resumo/${id}`}
            className="hover:bg-zels-sunken transition-colors"
            style={{
              backgroundColor: 'var(--card)',
              border: featured
                ? '2px solid rgba(139,175,138,0.4)'
                : '1px solid rgba(61,43,31,0.09)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textDecoration: 'none',
            }}
          >
            <Calendar size={18} className="text-zels-primary" />
            <p
              className="font-mono"
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--foreground)',
                lineHeight: 1,
              }}
            >
              {label}
            </p>
            <p className="text-sm text-zels-text-soft leading-snug">{description}</p>
            <span
              className="font-mono"
              style={{
                alignSelf: 'flex-start',
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: featured
                  ? 'var(--zels-primary-soft)'
                  : 'rgba(61,43,31,0.06)',
                color: featured ? 'var(--zels-primary)' : 'var(--zels-text-soft)',
              }}
            >
              {badge}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
