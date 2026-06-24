'use client'

import { useEffect } from 'react'
import { useUpdateUser } from '@/lib/api/user'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { Button } from '@/components/ui/button'
import {
  Pill,
  Activity,
  FlaskConical,
  FileText,
  Users,
  Calendar,
  MessageCircle,
} from 'lucide-react'

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
    description: "Interaja com o Zel's pelo WhatsApp — registre informações e receba lembretes sem precisar abrir o aplicativo.",
    soon: true,
  },
]

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const { mutate: updateUser, isPending } = useUpdateUser()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  function handleStart() {
    updateUser(
      { hasSeenWelcome: true },
      { onSettled: () => onClose() },
    )
  }

  return (
    // Overlay — não fecha ao clicar fora (sem onClick no backdrop)
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        overflowY: 'auto',
      }}
    >
      {/* Centralizador */}
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
        }}
      >
        {/* Caixa do modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FAF8F5',
            borderRadius: '1rem',
            maxWidth: '32rem',
            width: '100%',
            padding: '2rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Logo */}
          <ZelsLogo size={36} />

          {/* Título e subtítulo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h1
              className="font-heading"
              style={{ color: '#3D2B1F', fontSize: '1.875rem', lineHeight: 1.15 }}
            >
              Bem-vindo ao Zel&apos;s
            </h1>
            <p style={{ color: '#5F8260', fontStyle: 'italic', fontSize: '1rem' }}>
              Amar é ter cuidado, zelo.
            </p>
          </div>

          {/* Lista de funcionalidades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {FEATURES.map(({ icon: Icon, title, description, soon }) => (
              <div
                key={title}
                style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    marginTop: '0.125rem',
                    color: '#8BAF8A',
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#3D2B1F',
                        fontSize: '0.9375rem',
                      }}
                    >
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

          {/* Botão de ação */}
          <Button
            onClick={handleStart}
            disabled={isPending}
            className="w-full h-11"
            style={{ color: '#ffffff' }}
          >
            {isPending ? 'Aguarde…' : "Começar a usar o Zel's"}
          </Button>
        </div>
      </div>
    </div>
  )
}
