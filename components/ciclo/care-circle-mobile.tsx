'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, X } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import { useAccessControl, type AccessControl } from '@/hooks/useAccessControl'
import { useUpdateAccess } from '@/hooks/useUpdateAccess'
import { useDeleteAccess } from '@/hooks/useDeleteAccess'
import { PermissionToggle, getInitials, ROLE_CONFIG } from './person-card'
import { InviteForm } from './invite-form'
import { PageHeader } from '@/components/layout/page-header'

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleAccent(role: 'CURATOR' | 'FAMILY' | 'CAREGIVER'): string {
  if (role === 'CURATOR') return 'var(--zels-primary-strong)'
  if (role === 'CAREGIVER') return '#A86E13'
  return 'rgba(61,43,31,0.68)'
}

function memberSince(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays === 0) return 'entrou hoje'
  if (diffDays === 1) return 'entrou ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} sem.`
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`
  return 'há mais de um ano'
}

// ── BottomSheet ───────────────────────────────────────────────────────────────

function BottomSheet({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.4)',
        transition: 'opacity 200ms', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
      }} onClick={onClose} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: 'var(--card)', borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        transition: 'transform 300ms', transform: open ? 'translateY(0)' : 'translateY(100%)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 12px', borderBottom: '1px solid rgba(61,43,31,0.08)',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: 'none', border: 'none',
            cursor: 'pointer', color: 'rgba(61,43,31,0.42)', display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{
          padding: '16px 20px', overflowY: 'auto', maxHeight: '75dvh',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── EditPermissionsSheet ──────────────────────────────────────────────────────

function EditPermissionsSheet({
  open, member, healthProfileId, onClose,
}: {
  open: boolean; member: AccessControl | null; healthProfileId: string; onClose: () => void
}) {
  const updateAccess = useUpdateAccess(healthProfileId)
  const deleteAccess = useDeleteAccess(healthProfileId)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [canView, setCanView] = useState(true)
  const [canRegister, setCanRegister] = useState(false)

  useEffect(() => {
    if (member) {
      setCanView(member.canView)
      setCanRegister(member.canRegister)
      setConfirmRemove(false)
    }
  }, [member?.id])

  if (!member) return null
  const config = ROLE_CONFIG[member.roleInProfile]
  const hasChanges = canView !== member.canView || canRegister !== member.canRegister

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar permissões">
      <div className="space-y-5">
        <div className="flex items-center gap-3 pb-1">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
            style={{ backgroundColor: config.color }}>
            {getInitials(member.user?.displayName || member.user?.name || '?')}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{member.user?.displayName || member.user?.name || 'Usuário'}</p>
            <p className="text-xs font-semibold" style={{ color: roleAccent(member.roleInProfile) }}>{config.label}</p>
          </div>
        </div>

        <div className="space-y-3">
          <PermissionToggle checked={canView} label="Pode visualizar"
            description="Acessa todas as telas como leitura" onChange={setCanView} />
          <PermissionToggle checked={canRegister} label="Pode registrar"
            description="Cria e edita registros de saúde" onChange={setCanRegister} />
        </div>

        {updateAccess.error && (
          <p className="text-xs text-zels-urgent">{(updateAccess.error as Error).message}</p>
        )}

        <button type="button"
          onClick={() => updateAccess.mutate({ id: member.id, body: { canView, canRegister } }, { onSuccess: onClose })}
          disabled={!hasChanges || updateAccess.isPending}
          className="w-full py-3 rounded-xl text-sm font-medium text-white bg-zels-primary hover:opacity-90 disabled:opacity-40 transition-opacity">
          {updateAccess.isPending ? 'Salvando...' : 'Salvar'}
        </button>

        <div className="border-t border-border pt-4">
          {!confirmRemove ? (
            <button type="button" onClick={() => setConfirmRemove(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-zels-urgent border border-zels-urgent/30 hover:bg-zels-urgent/5 transition-colors">
              Remover do ciclo
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zels-text-soft text-center">Tem certeza? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmRemove(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={() => deleteAccess.mutate(member.id, { onSuccess: onClose })}
                  disabled={deleteAccess.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-zels-urgent hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {deleteAccess.isPending ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

// ── CircleHeroMobile ──────────────────────────────────────────────────────────

function CircleHeroMobile({
  patientName, members,
}: {
  patientName: string; members: AccessControl[]
}) {
  return (
    <div style={{
      backgroundColor: 'var(--card)',
      border: '1px solid rgba(61,43,31,0.1)',
      borderRadius: 16,
      padding: '24px 20px 20px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial gradient */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(139,175,138,0.1) 0%, transparent 60%)',
      }} />

      {/* Patient avatar */}
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        backgroundColor: 'var(--zels-avatar-patient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '1.375rem', fontWeight: 700,
        margin: '0 auto 10px',
      }}>
        {getInitials(patientName)}
      </div>

      <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)', margin: '0 0 2px' }}>
        {patientName}
      </p>
      <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)', margin: '0 0 14px' }}>
        titular
      </p>

      {/* Overlapping member avatars */}
      {members.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          {members.slice(0, 5).map((m, i) => (
            <div key={m.id} title={m.user?.displayName || m.user?.name} style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: ROLE_CONFIG[m.roleInProfile].color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.75rem', fontWeight: 600,
              border: '2px solid white',
              marginLeft: i > 0 ? -10 : 0,
              position: 'relative', zIndex: members.length - i,
            }}>
              {getInitials(m.user?.displayName || m.user?.name || '?')}
            </div>
          ))}
          {members.length > 5 && (
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: '#efece5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(61,43,31,0.68)',
              border: '2px solid white', marginLeft: -10,
            }}>
              +{members.length - 5}
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.68)', margin: 0, position: 'relative' }}>
        {members.length === 0
          ? 'Nenhuma pessoa no ciclo ainda'
          : `${members.length} ${members.length === 1 ? 'pessoa cuidando' : 'pessoas cuidando juntos'}`}
      </p>
    </div>
  )
}

// ── PersonRowMobile ───────────────────────────────────────────────────────────

function PersonRowMobile({
  member, isCurrentUser, isCurator, onMenu,
}: {
  member: AccessControl; isCurrentUser: boolean; isCurator: boolean; onMenu: () => void
}) {
  const avatarColor = ROLE_CONFIG[member.roleInProfile].color
  const accent = roleAccent(member.roleInProfile)
  const label = ROLE_CONFIG[member.roleInProfile].label

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '44px 1fr auto',
      alignItems: 'center', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid rgba(61,43,31,0.07)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        backgroundColor: avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.875rem', fontWeight: 600,
      }}>
        {getInitials(member.user?.displayName || member.user?.name || '?')}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' as const }}>
          <span style={{
            fontSize: '0.90625rem', fontWeight: 600, color: 'var(--foreground)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {member.user?.displayName || member.user?.name || 'Usuário'}
          </span>
          {isCurrentUser && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)', flexShrink: 0 }}>· você</span>
          )}
        </div>
        <p style={{ fontSize: '0.71875rem', fontWeight: 600, color: accent, margin: '2px 0 1px' }}>
          {label}
        </p>
        <p style={{
          fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)', margin: 0,
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          {memberSince(member.createdAt)}
        </p>
      </div>

      {isCurator && !isCurrentUser ? (
        <button type="button" onClick={onMenu} style={{
          width: 32, height: 32, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(61,43,31,0.42)',
        }}>
          <MoreHorizontal size={16} />
        </button>
      ) : <div style={{ width: 32 }} />}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border animate-pulse">
      <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted rounded" style={{ width: '42%' }} />
        <div className="h-3 bg-muted rounded" style={{ width: '26%' }} />
        <div className="h-3 bg-muted rounded" style={{ width: '34%' }} />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

type SheetState =
  | { type: 'closed' }
  | { type: 'invite' }
  | { type: 'edit'; member: AccessControl }

export function CareCircleMobile() {
  const router = useRouter()
  const [sheet, setSheet] = useState<SheetState>({ type: 'closed' })

  const { data: profile } = useHealthProfile()
  const { data: currentUser } = useCurrentUser()
  const { data: members, isLoading, isError } = useAccessControl(profile?.id)

  const deleteAccess = useDeleteAccess(profile?.id)
  const isCurator = currentUser?.role === 'CURATOR'
  const safeMembers = members ?? []

  const allMembers = useMemo(() => {
    const curatorAlreadyInList = safeMembers.some(
      (m) => m.user?.id === profile?.curatorUserId
    )
    if (profile?.curatorUserId && !curatorAlreadyInList) {
      const curatorEntry: AccessControl = {
        id: `curator-virtual-${profile.curatorUserId}`,
        healthProfileId: profile.id,
        userId: profile.curatorUserId,
        roleInProfile: 'CURATOR',
        canView: true,
        canRegister: true,
        createdAt: new Date().toISOString(),
        user: { id: profile.curatorUserId, name: 'Curador', email: '', role: 'CURATOR' },
      }
      return [curatorEntry, ...safeMembers]
    }
    return safeMembers
  }, [safeMembers, profile])

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent', border: 'none', padding: 4, paddingTop: 6,
              cursor: 'pointer', color: 'rgba(61,43,31,0.42)',
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <PageHeader
            overline={profile?.fullName}
            title="Ciclo de cuidados"
            subtitle={!isLoading
              ? (allMembers.length === 0
                ? 'Nenhuma pessoa conectada ainda'
                : `${allMembers.length} ${allMembers.length === 1 ? 'pessoa cuidando' : 'pessoas cuidando juntos'}`)
              : undefined
            }
          />
        </div>
        {currentUser && (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: ROLE_CONFIG[currentUser.role as keyof typeof ROLE_CONFIG]?.color ?? 'var(--zels-avatar-curator)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
            marginTop: 4,
          }}>
            {getInitials(currentUser.name ?? '?')}
          </div>
        )}
      </div>

      {/* Hero */}
      {profile && (
        <CircleHeroMobile patientName={profile.fullName} members={allMembers} />
      )}

      {/* Invite banner */}
      {isCurator && (
        <button type="button" onClick={() => setSheet({ type: 'invite' })} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginTop: 12,
          padding: '14px 16px',
          backgroundColor: 'rgba(139,175,138,0.08)',
          border: '1px solid rgba(139,175,138,0.18)',
          borderRadius: 12, cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} style={{ color: 'var(--zels-primary-strong)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--zels-primary-strong)' }}>
              Convidar pessoa
            </span>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(139,175,138,0.7)' }} />
        </button>
      )}

      {/* People list */}
      <div style={{ marginTop: 24 }}>
        <p style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.6875rem', fontWeight: 700,
          textTransform: 'uppercase' as const, letterSpacing: '0.1em',
          color: 'rgba(61,43,31,0.42)', margin: '0 0 4px',
        }}>
          Pessoas no ciclo
        </p>

        {isError && (
          <p className="py-8 text-center text-sm text-zels-text-soft">
            Não foi possível carregar o ciclo.
          </p>
        )}

        {isLoading && (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        )}

        {!isLoading && !isError && allMembers.length === 0 && (
          <p style={{
            fontSize: '0.875rem', color: 'rgba(61,43,31,0.42)',
            padding: '20px 0', textAlign: 'center',
          }}>
            Nenhuma pessoa adicionada ao ciclo ainda.
          </p>
        )}

        {!isLoading && !isError && allMembers.map(member => (
          <PersonRowMobile
            key={member.id}
            member={member}
            isCurrentUser={member.userId === currentUser?.id}
            isCurator={isCurator}
            onMenu={() => setSheet({ type: 'edit', member })}
          />
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ marginTop: 24 }}>
        <p style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.6875rem', fontWeight: 700,
          textTransform: 'uppercase' as const, letterSpacing: '0.1em',
          color: 'rgba(61,43,31,0.42)', margin: '0 0 8px',
        }}>
          Atividade recente
        </p>
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid rgba(61,43,31,0.1)',
          borderRadius: 12, padding: '20px 16px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.42)', margin: 0 }}>
            Nenhuma atividade recente
          </p>
        </div>
      </div>

      {/* Sheets */}
      {profile?.id && (
        <BottomSheet
          open={sheet.type === 'invite'}
          onClose={() => setSheet({ type: 'closed' })}
          title="Adicionar ao ciclo"
        >
          <InviteForm
            healthProfileId={profile.id}
            onSuccess={() => setSheet({ type: 'closed' })}
            onCancel={() => setSheet({ type: 'closed' })}
          />
        </BottomSheet>
      )}

      {profile?.id && (
        <EditPermissionsSheet
          open={sheet.type === 'edit'}
          member={sheet.type === 'edit' ? sheet.member : null}
          healthProfileId={profile.id}
          onClose={() => setSheet({ type: 'closed' })}
        />
      )}
    </div>
  )
}
