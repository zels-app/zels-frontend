'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Pill,
  CheckSquare,
  Calendar,
  X,
  LogOut,
  Activity,
  Stethoscope,
  ShieldAlert,
  Users,
  FileText,
  FlaskConical,
  HelpCircle,
} from 'lucide-react'
import { ZelsLogo } from '@/components/brand/zels-logo'
import { useCurrentUser } from '@/lib/api/user'
import { useHealthProfile } from '@/lib/api/health-profile'
import { getAccessInfo } from '@/lib/access-level'

const navItems = [
  { label: 'Painel',         href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Medicamentos',   href: '/medicamentos', icon: Pill },
  { label: 'Saúde',         href: '/saude',        icon: Activity },
  { label: 'Condições',     href: '/condicoes',    icon: Stethoscope },
  { label: 'Exames',        href: '/exames',       icon: FlaskConical },
  { label: 'Agenda',        href: '/agenda',       icon: Calendar },
  { label: 'Checklist',     href: '/checklist',    icon: CheckSquare },
  { label: 'Ciclo',         href: '/ciclo',        icon: Users },
  { label: 'Resumo médico', href: '/resumo',       icon: FileText },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: user }    = useCurrentUser()
  const { data: profile } = useHealthProfile()
  const access = getAccessInfo(user, profile)
  const visibleItems = navItems.filter(
    item => item.href !== '/checklist' || access.showChecklist
  )

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    queryClient.clear()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col',
          'transition-transform duration-200 ease-in-out',
          'md:static md:z-auto md:translate-x-0 md:shrink-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-5 border-b border-border">
          <ZelsLogo size={34} />
          <button
            className="md:hidden p-1 rounded-md text-zels-text-faint hover:text-foreground"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-zels-primary-soft text-zels-primary'
                    : 'text-zels-text-soft hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-2 border-t border-border">
          <Link
            href="/ficha-emergencia"
            onClick={onClose}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/ficha-emergencia'
                ? 'bg-zels-urgent/10 text-zels-urgent'
                : 'text-zels-urgent/70 hover:bg-zels-urgent/10 hover:text-zels-urgent',
            ].join(' ')}
          >
            <ShieldAlert size={17} />
            Emergência
          </Link>
        </div>

        <div className="px-3 pb-5 pt-3 border-t border-border">
          <Link
            href="/ajuda"
            onClick={onClose}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/ajuda'
                ? 'bg-zels-primary-soft text-zels-primary'
                : 'text-zels-text-soft hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <HelpCircle size={17} />
            Ajuda
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zels-text-soft hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
