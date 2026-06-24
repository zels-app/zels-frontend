'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronDown,
  Pill,
  Activity,
  FlaskConical,
  FileText,
  Users,
  Calendar,
  MessageCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useHealthProfile } from '@/lib/api/health-profile'
import { Button } from '@/components/ui/button'

const FEATURES = [
  {
    icon: Pill,
    title: 'Medicamentos',
    description: 'Cadastre a rotina e acompanhe se as doses foram tomadas no dia a dia.',
    soon: false,
  },
  {
    icon: Activity,
    title: 'Registros de Saúde',
    description: 'Monitore pressão, glicose, peso e outros indicadores ao longo do tempo.',
    soon: false,
  },
  {
    icon: FlaskConical,
    title: 'Exames',
    description: 'Envie laudos em PDF ou foto e deixe a IA extrair os dados automaticamente.',
    soon: false,
  },
  {
    icon: FileText,
    title: 'Resumo Médico',
    description: 'Tudo organizado em um documento completo para levar ao médico.',
    soon: false,
  },
  {
    icon: Users,
    title: 'Ciclo de Cuidados',
    description: 'Convide familiares e cuidadores para participar do cuidado juntos.',
    soon: false,
  },
  {
    icon: Calendar,
    title: 'Agenda',
    description: 'Registre consultas e compromissos de saúde em um só lugar.',
    soon: false,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description:
      "Interaja com o Zel's pelo WhatsApp — registre informações e receba lembretes sem precisar abrir o aplicativo.",
    soon: true,
  },
]

const FAQS = [
  {
    q: 'Como convido alguém para o ciclo de cuidados?',
    a: 'Acesse a tela Ciclo de Cuidados pelo menu lateral, clique em "Convidar pessoa" e informe o email do familiar ou cuidador. Ele receberá um email com as instruções de acesso.',
  },
  {
    q: 'Como cadastro um medicamento?',
    a: "Acesse Medicamentos no menu lateral e clique em \"Novo medicamento\". Preencha o nome, dosagem e horários. O Zel's vai acompanhar se as doses foram tomadas.",
  },
  {
    q: 'Como envio um exame para a IA analisar?',
    a: 'Acesse Exames, cadastre o exame e faça o upload do arquivo (PDF ou imagem). Depois clique em "Extrair dados com IA" — o sistema vai identificar os biomarcadores automaticamente.',
  },
  {
    q: 'Como acesso a ficha de emergência?',
    a: 'A ficha de emergência fica no rodapé do menu lateral. Ela concentra os dados críticos de saúde para situações de urgência e pode ser compartilhada com qualquer pessoa.',
  },
  {
    q: "O Zel's funciona pelo WhatsApp?",
    a: 'A integração com WhatsApp está em desenvolvimento e chegará em breve. Você será notificado assim que estiver disponível.',
  },
]

export default function AjudaPage() {
  const router = useRouter()
  const { data: profile } = useHealthProfile()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Cabeçalho */}
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="lg:hidden p-1 -ml-1 mt-0.5 rounded-md"
          style={{ color: 'rgba(61,43,31,0.42)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <PageHeader
          overline={profile?.fullName}
          title="Ajuda"
          subtitle="Central de ajuda do Zel's"
        />
      </div>

      {/* ── Seção 1: Como funciona ────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 style={{ fontWeight: 700, color: '#3D2B1F', fontSize: '1rem', lineHeight: 1.4 }}>
            Como funciona o Zel&apos;s
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--zels-text-soft)' }}>
            Conheça as principais funcionalidades disponíveis.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FEATURES.map(({ icon: Icon, title, description, soon }) => (
              <div key={title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, marginTop: '0.125rem', color: '#8BAF8A' }}>
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#3D2B1F', fontSize: '0.9375rem' }}>
                      {title}
                    </span>
                    {soon && (
                      <span
                        style={{
                          backgroundColor: 'rgba(196, 132, 106, 0.15)',
                          color: '#C4846A',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          lineHeight: 1.6,
                        }}
                      >
                        Em breve
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      color: 'rgba(61, 43, 31, 0.68)',
                      fontSize: '0.875rem',
                      marginTop: '0.125rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seção 2: Perguntas frequentes ────────────────────── */}
      <section className="space-y-3">
        <h2 style={{ fontWeight: 700, color: '#3D2B1F', fontSize: '1rem', lineHeight: 1.4 }}>
          Perguntas frequentes
        </h2>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div
                key={i}
                className={i < FAQS.length - 1 ? 'border-b border-border' : ''}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/50"
                  style={{ padding: '1rem 1.25rem' }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#3D2B1F',
                      fontSize: '0.9375rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{
                      flexShrink: 0,
                      color: 'rgba(61,43,31,0.42)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 200ms ease',
                    }}
                  />
                </button>
                {isOpen && (
                  <p
                    style={{
                      color: 'rgba(61, 43, 31, 0.68)',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      padding: '0 1.25rem 1rem',
                    }}
                  >
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Seção 3: Fale conosco ─────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 style={{ fontWeight: 700, color: '#3D2B1F', fontSize: '1rem', lineHeight: 1.4 }}>
            Fale conosco
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--zels-text-soft)' }}>
            Tem alguma dúvida ou sugestão? Estamos aqui para ajudar.
          </p>
        </div>

        <Button
          variant="outline"
          className="h-10 px-5 gap-2"
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
        >
          <MessageCircle size={16} />
          Falar com o suporte
        </Button>
      </section>
    </div>
  )
}
