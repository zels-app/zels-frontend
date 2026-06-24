'use client'

import { useState } from 'react'
import { MoreHorizontal, Eye, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ROLE_CONFIG = {
  CURATOR:   { label: 'Curador',  color: 'var(--zels-avatar-curator)'   },
  FAMILY:    { label: 'Familiar', color: 'var(--zels-avatar-family)'    },
  CAREGIVER: { label: 'Cuidador', color: 'var(--zels-avatar-caregiver)' },
  ELDERLY:   { label: 'Paciente', color: 'var(--zels-avatar-patient)'   },
} as const

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`
  return 'há mais de um ano'
}

export function PermissionToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors shrink-0',
          checked ? 'bg-zels-primary' : 'bg-muted'
        )}
      >
        <div
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-zels-text-faint">{description}</div>
      </div>
    </button>
  )
}

export type PersonCardProps = {
  name: string
  role: 'CURATOR' | 'FAMILY' | 'CAREGIVER'
  canView: boolean
  canRegister: boolean
  isCurrentUser: boolean
  canEdit: boolean
  createdAt: string
  onEdit: () => void
  onRemove: () => void
  variant?: 'list' | 'grid'
}

export function PersonCard({
  name,
  role,
  canView,
  canRegister,
  isCurrentUser,
  canEdit,
  createdAt,
  onEdit,
  onRemove,
  variant = 'list',
}: PersonCardProps) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const config = ROLE_CONFIG[role]

  // ── Grid variant (desktop) ────────────────────────────────────────────────
  if (variant === 'grid') {
    return (
      <div className="bg-card rounded-xl shadow-sm ring-1 ring-black/5 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
            style={{ backgroundColor: config.color }}
          >
            {getInitials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-foreground">{name}</span>
              {isCurrentUser && (
                <span className="text-xs text-zels-text-faint">(você)</span>
              )}
            </div>
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-medium"
            style={{
              backgroundColor: config.color + '20',
              color: config.color,
            }}
          >
            {role}
          </span>
        </div>

        <div className="space-y-2.5 pl-0.5">
          <ToggleSwitch
            checked={canView}
            label="Pode visualizar"
            disabled={!canEdit || isCurrentUser}
            onClick={canEdit && !isCurrentUser ? onEdit : () => {}}
          />
          <ToggleSwitch
            checked={canRegister}
            label="Pode registrar"
            disabled={!canEdit || isCurrentUser}
            onClick={canEdit && !isCurrentUser ? onEdit : () => {}}
          />
        </div>

        {canEdit && !isCurrentUser && (
          <div className="pt-2 border-t border-border">
            {!confirmRemove ? (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="text-xs font-medium text-zels-urgent hover:opacity-75 transition-opacity"
              >
                Remover do ciclo
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zels-text-soft">
                  Tem certeza? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-zels-urgent hover:opacity-90 transition-opacity"
                  >
                    Remover
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── List variant (mobile) ─────────────────────────────────────────────────
  return (
    <div className="bg-card rounded-xl shadow-sm ring-1 ring-black/5 p-4">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {getInitials(name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">{name}</span>
            {isCurrentUser && (
              <span className="text-xs text-zels-text-faint shrink-0">(você)</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-zels-text-faint text-xs">·</span>
            <span className="text-xs text-zels-text-faint">
              Entrou {timeAgo(createdAt)}
            </span>
          </div>

          <div className="flex gap-1.5 mt-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                canView
                  ? 'bg-zels-primary-soft text-zels-primary'
                  : 'bg-muted text-zels-text-faint'
              )}
            >
              <Eye size={10} />
              {canView ? 'Ver' : 'Sem visualização'}
            </span>
            {canRegister && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zels-primary-soft text-zels-primary">
                <ClipboardList size={10} />
                Registrar
              </span>
            )}
          </div>
        </div>

        {canEdit && !isCurrentUser && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setMenuOpen(prev => !prev); setConfirmRemove(false) }}
              className="p-1.5 rounded-lg text-zels-text-faint hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Opções"
            >
              <MoreHorizontal size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => { setMenuOpen(false); setConfirmRemove(false) }}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl shadow-lg ring-1 ring-black/10 min-w-48 py-1 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onEdit() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Editar permissões
                  </button>
                  {!confirmRemove ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(true)}
                      className="w-full text-left px-4 py-2.5 text-sm text-zels-urgent hover:bg-zels-urgent/5 transition-colors"
                    >
                      Remover do ciclo
                    </button>
                  ) : (
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs text-zels-text-soft">
                        Tem certeza? Esta ação não pode ser desfeita.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); setConfirmRemove(false); onRemove() }}
                          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white bg-zels-urgent hover:opacity-90 transition-opacity"
                        >
                          Remover
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(false)}
                          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Internal: toggle switch for grid cards ────────────────────────────────

function ToggleSwitch({
  checked,
  label,
  disabled,
  onClick,
}: {
  checked: boolean
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('flex items-center gap-2', disabled && 'cursor-default')}
    >
      <div
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-zels-primary' : 'bg-muted',
          !disabled && 'group-hover:opacity-80'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </div>
      <span className="text-xs text-zels-text-soft">{label}</span>
    </button>
  )
}
