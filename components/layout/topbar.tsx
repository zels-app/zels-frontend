'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useCurrentUser } from '@/lib/api/user'
import { ZelsSymbol } from '@/components/brand/zels-logo'

const roleLabels: Record<string, string> = {
  ELDERLY: 'Pessoa Cuidada',
  CURATOR: 'Curador',
  FAMILY: 'Familiar',
  CAREGIVER: 'Cuidador',
  ADMIN: 'Admin',
}

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { data: user } = useCurrentUser()

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="sticky top-0 z-30 h-14 px-4 md:px-6 flex items-center gap-3 border-b border-border bg-card shrink-0">
      <button
        className="md:hidden p-2 -ml-1 rounded-md text-zels-text-soft hover:bg-muted transition-colors"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <ZelsSymbol size={32} className="text-zels-primary md:hidden" />

      <p className="hidden md:block text-sm text-zels-text-soft capitalize">{today}</p>

      {user && (
        <Link
          href="/perfil"
          className="ml-auto flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-black/5 transition-colors cursor-pointer"
          aria-label="Ir para meu perfil"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{user.displayName || user.name.split(' ')[0]}</p>
            <p className="text-xs text-zels-text-faint">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-zels-primary-soft flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-zels-primary leading-none">
              {(user.displayName || user.name)[0].toUpperCase()}
            </span>
          </div>
        </Link>
      )}
    </header>
  )
}
