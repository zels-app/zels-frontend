'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, X, History, Clock } from 'lucide-react'
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

function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function memberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ── PermChip ──────────────────────────────────────────────────────────────────

function PermChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: '0.6875rem',
      fontWeight: 600,
      fontFamily: 'var(--font-mono, monospace)',
      letterSpacing: '0.02em',
      border: '1px solid',
      borderColor: active ? 'rgba(139,175,138,0.25)' : 'rgba(61,43,31,0.1)',
      backgroundColor: active ? 'rgba(139,175,138,0.1)' : '#efece5',
      color: active ? 'var(--zels-primary-strong)' : 'rgba(61,43,31,0.42)',
    }}>
      {label}
    </span>
  )
}

// ── DialogOverlay ─────────────────────────────────────────────────────────────

function DialogOverlay({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-card rounded-2xl shadow-xl ring-1 ring-black/10 w-full max-w-sm"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg text-zels-text-faint hover:text-foreground hover:bg-muted transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  )
}

// ── EditPermissionsDialog ─────────────────────────────────────────────────────

function EditPermissionsDialog({
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
    <DialogOverlay open={open} onClose={onClose} title="Editar permissões">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
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
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-zels-primary hover:opacity-90 disabled:opacity-40 transition-opacity">
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
    </DialogOverlay>
  )
}

// ── CircleHero ────────────────────────────────────────────────────────────────

function CircleHero({
  patientName, birthDate, members,
}: {
  patientName: string; birthDate: string; members: AccessControl[]
}) {
  const age = calcAge(birthDate)

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      border: '1px solid rgba(61,43,31,0.1)',
      borderRadius: 16,
      padding: '24px 28px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial gradient background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 0% 50%, rgba(139,175,138,0.08) 0%, transparent 55%)',
      }} />

      {/* Patient column */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, paddingRight: 32, position: 'relative',
      }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          backgroundColor: 'var(--zels-avatar-patient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '1.625rem', fontWeight: 700,
        }}>
          {getInitials(patientName)}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            {patientName}
          </p>
          <p style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.42)', margin: '2px 0 0' }}>
            titular · {age} anos
          </p>
        </div>
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' as const,
          backgroundColor: 'rgba(139,175,138,0.12)', color: 'var(--zels-primary-strong)',
        }}>
          ativa hoje
        </span>
      </div>

      {/* Connector + members column */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div style={{ width: 24, height: 1, backgroundColor: 'rgba(61,43,31,0.1)', flexShrink: 0 }} />

        {members.length === 0 ? (
          <p style={{ paddingLeft: 16, fontSize: '0.875rem', color: 'rgba(61,43,31,0.42)' }}>
            Nenhuma pessoa no ciclo ainda.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 14,
            paddingLeft: 20,
            flex: 1,
          }}>
            {members.map(m => {
              const avatarColor = ROLE_CONFIG[m.roleInProfile].color
              const accent = roleAccent(m.roleInProfile)
              const label = ROLE_CONFIG[m.roleInProfile].label
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    backgroundColor: avatarColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                  }}>
                    {getInitials(m.user?.displayName || m.user?.name || '?')}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      fontSize: '0.75rem', fontWeight: 600,
                      color: 'var(--foreground)', margin: 0,
                      maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.user?.displayName || (m.user?.name ?? 'Usuário').split(' ')[0]}
                    </p>
                    <p style={{ fontSize: '0.625rem', fontWeight: 600, color: accent, margin: '2px 0 0' }}>
                      {label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── PersonGridCard ────────────────────────────────────────────────────────────

function PersonGridCard({
  member, isCurator, currentUserId, onEdit, onRemove,
}: {
  member: AccessControl
  isCurator: boolean
  currentUserId: string | undefined
  onEdit: () => void
  onRemove: () => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const avatarColor = ROLE_CONFIG[member.roleInProfile].color
  const accent = roleAccent(member.roleInProfile)
  const label = ROLE_CONFIG[member.roleInProfile].label
  const isMe = member.userId === currentUserId

  const chips = [
    { key: 'VER', active: member.canView },
    { key: 'REGISTRAR', active: member.canRegister },
    { key: 'EDITAR', active: member.roleInProfile === 'CURATOR' },
    { key: 'GERENCIAR', active: member.roleInProfile === 'CURATOR' },
    { key: 'EMERGÊNCIA', active: true },
  ]

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      border: '1px solid rgba(61,43,31,0.1)',
      borderRadius: 14,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top: avatar + info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.9375rem', fontWeight: 600, flexShrink: 0,
        }}>
          {getInitials(member.user?.displayName || member.user?.name || '?')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {member.user?.displayName || member.user?.name || 'Usuário'}
            </span>
            {isMe && (
              <span style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}>· você</span>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: accent, margin: '3px 0 4px' }}>
            {label}
          </p>
          <p style={{
            fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)', margin: 0,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            desde {memberSince(member.createdAt)}
          </p>
        </div>
      </div>

      {/* Permission chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 16 }}>
        {chips.map(c => <PermChip key={c.key} label={c.key} active={c.active} />)}
      </div>

      {/* Footer actions */}
      {isCurator && !isMe && (
        <div style={{ borderTop: '1px solid rgba(61,43,31,0.07)', paddingTop: 12, marginTop: 'auto' }}>
          {!confirmRemove ? (
            <div style={{ display: 'flex', gap: 16 }}>
              <button type="button" onClick={onEdit} style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--zels-primary-strong)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                Editar permissões
              </button>
              <button type="button" onClick={() => setConfirmRemove(true)} style={{
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--zels-urgent)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                Remover
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.68)', marginBottom: 10, marginTop: 0 }}>
                Tem certeza? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={onRemove} style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                  color: '#fff', backgroundColor: 'var(--zels-urgent)', border: 'none', cursor: 'pointer',
                }}>
                  Remover
                </button>
                <button type="button" onClick={() => setConfirmRemove(false)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--foreground)', backgroundColor: '#efece5', border: 'none', cursor: 'pointer',
                }}>
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

// ── AccessAudit ───────────────────────────────────────────────────────────────

function AccessAudit({ members }: { members: AccessControl[] }) {
  return (
    <div style={{
      backgroundColor: 'var(--card)',
      border: '1px solid rgba(61,43,31,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(61,43,31,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={14} style={{ color: 'rgba(61,43,31,0.42)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Histórico de acessos
          </span>
        </div>
        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {members.slice(0, 4).map(m => (
              <div key={m.id} title={m.user?.displayName || m.user?.name} style={{
                width: 22, height: 22, borderRadius: '50%',
                backgroundColor: ROLE_CONFIG[m.roleInProfile].color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.5625rem', fontWeight: 700,
              }}>
                {getInitials(m.user?.displayName || m.user?.name || '?')}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
        <Clock size={28} style={{ color: 'rgba(61,43,31,0.18)', margin: '0 auto 10px', display: 'block' }} />
        <p style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.42)', margin: 0 }}>
          Nenhum acesso registrado ainda
        </p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.28)', margin: '4px 0 0' }}>
          O histórico será exibido aqui quando houver atividade
        </p>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl ring-1 ring-black/5 p-5 animate-pulse space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded" style={{ width: '45%' }} />
          <div className="h-3 bg-muted rounded" style={{ width: '28%' }} />
          <div className="h-3 bg-muted rounded" style={{ width: '38%' }} />
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[56, 76, 56, 80, 88].map((w, i) => (
          <div key={i} className="h-5 bg-muted rounded-md" style={{ width: w }} />
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

type DialogState =
  | { type: 'closed' }
  | { type: 'invite' }
  | { type: 'edit'; member: AccessControl }

export function CareCircleDesktop() {
  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })
  const [showAudit, setShowAudit] = useState(false)

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
        user: {
          id: profile.curatorUserId ?? '',
          name: profile.curatorUser?.name ?? 'Curador',
          displayName: profile.curatorUser?.displayName ?? null,
          email: '',
          role: 'CURATOR' as const,
        },
      }
      return [curatorEntry, ...safeMembers]
    }
    return safeMembers
  }, [safeMembers, profile])

  const curators   = allMembers.filter(m => m.roleInProfile === 'CURATOR').length
  const families   = allMembers.filter(m => m.roleInProfile === 'FAMILY').length
  const caregivers = allMembers.filter(m => m.roleInProfile === 'CAREGIVER').length

  function buildSubtitle() {
    if (allMembers.length === 0) return 'Nenhuma pessoa conectada ainda'
    const parts: string[] = []
    if (curators > 0)   parts.push(`${curators} ${curators === 1 ? 'curador' : 'curadores'}`)
    if (families > 0)   parts.push(`${families} ${families === 1 ? 'familiar' : 'familiares'}`)
    if (caregivers > 0) parts.push(`${caregivers} ${caregivers === 1 ? 'cuidador' : 'cuidadores'} em turnos`)
    const last = parts.pop()
    const joined = parts.length > 0 ? `${parts.join(', ')} e ${last}` : last
    return `${allMembers.length} ${allMembers.length === 1 ? 'pessoa conectada' : 'pessoas conectadas'} · ${joined}`
  }

  return (
    <div style={{ maxWidth: 900 }} className="space-y-6">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <PageHeader
            overline={profile?.fullName}
            title="Ciclo de cuidados"
            subtitle={!isLoading ? buildSubtitle() : undefined}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginTop: 4 }}>
          <button type="button" onClick={() => setShowAudit(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            fontSize: '0.8125rem', fontWeight: 600,
            color: showAudit ? 'var(--zels-primary-strong)' : 'rgba(61,43,31,0.68)',
            background: showAudit ? 'rgba(139,175,138,0.08)' : 'none',
            border: `1px solid ${showAudit ? 'rgba(139,175,138,0.25)' : 'rgba(61,43,31,0.12)'}`,
            cursor: 'pointer', transition: 'all 150ms',
          }}>
            <History size={14} />
            Histórico de acessos
          </button>
          {isCurator && (
            <button type="button" onClick={() => setDialog({ type: 'invite' })} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              fontSize: '0.8125rem', fontWeight: 600,
              color: '#ffffff', backgroundColor: 'var(--primary)',
              border: 'none', cursor: 'pointer',
            }}>
              <Plus size={15} />
              Convidar pessoa
            </button>
          )}
        </div>
      </div>

      {/* CircleHero */}
      {profile && (
        <CircleHero
          patientName={profile.fullName}
          birthDate={profile.birthDate}
          members={allMembers}
        />
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-zels-text-soft">
          Não foi possível carregar o ciclo de cuidados.
        </p>
      )}

      {/* People grid */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!isLoading && !isError && allMembers.length === 0 && (
        <div className="py-16 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Ciclo de cuidados vazio</p>
          <p className="text-sm text-zels-text-soft">
            {isCurator
              ? 'Adicione familiares e cuidadores para compartilhar o acompanhamento.'
              : 'Nenhuma pessoa adicionada ao ciclo ainda.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && allMembers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {allMembers.map(member => (
            <PersonGridCard
              key={member.id}
              member={member}
              isCurator={isCurator}
              currentUserId={currentUser?.id}
              onEdit={() => setDialog({ type: 'edit', member })}
              onRemove={() => deleteAccess.mutate(member.id)}
            />
          ))}
        </div>
      )}

      {/* Access audit */}
      {showAudit && !isLoading && (
        <AccessAudit members={allMembers} />
      )}

      {/* Dialogs */}
      {profile?.id && (
        <DialogOverlay
          open={dialog.type === 'invite'}
          onClose={() => setDialog({ type: 'closed' })}
          title="Adicionar ao ciclo"
        >
          <InviteForm
            healthProfileId={profile.id}
            onSuccess={() => setDialog({ type: 'closed' })}
            onCancel={() => setDialog({ type: 'closed' })}
          />
        </DialogOverlay>
      )}

      {profile?.id && (
        <EditPermissionsDialog
          open={dialog.type === 'edit'}
          member={dialog.type === 'edit' ? dialog.member : null}
          healthProfileId={profile.id}
          onClose={() => setDialog({ type: 'closed' })}
        />
      )}
    </div>
  )
}
