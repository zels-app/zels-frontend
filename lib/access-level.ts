import type { User } from '@/lib/api/user'
import type { HealthProfile } from '@/lib/api/health-profile'

export type AccessLevel = 'level1' | 'level2' | 'level3'

export type AccessInfo = {
  level: AccessLevel
  canCreate: boolean
  canManage: boolean
  canApprove: boolean
  canPropose: boolean
  isOwner: boolean
  isSelf: boolean
  showChecklist: boolean
}

const LEVEL_CAPS: Record<AccessLevel, Omit<AccessInfo, 'level' | 'isOwner' | 'isSelf'>> = {
  level1: { canCreate: true,  canManage: true,  canApprove: true,  canPropose: false, showChecklist: true  },
  level2: { canCreate: true,  canManage: false, canApprove: false, canPropose: true,  showChecklist: true  },
  level3: { canCreate: false, canManage: false, canApprove: false, canPropose: false, showChecklist: false },
}

const SAFE_DEFAULT: AccessInfo = {
  level: 'level3',
  canCreate: false,
  canManage: false,
  canApprove: false,
  canPropose: false,
  isOwner: false,
  isSelf: false,
  showChecklist: false,
}

export function getAccessInfo(
  user: User | null | undefined,
  profile: HealthProfile | null | undefined,
): AccessInfo {
  if (!user || !profile) return SAFE_DEFAULT

  const isOwner = user.id === profile.elderlyUserId || user.id === profile.curatorUserId
  const isSelf  = user.id === profile.elderlyUserId

  let level: AccessLevel
  if (user.role === 'CURATOR') {
    level = 'level1'
  } else if (user.role === 'ELDERLY' && isOwner) {
    level = 'level1'
  } else if (user.role === 'ELDERLY' && !isOwner) {
    level = 'level3'
  } else if (user.role === 'CAREGIVER' || user.role === 'FAMILY') {
    level = 'level2'
  } else {
    level = 'level3'
  }

  return { level, isOwner, isSelf, ...LEVEL_CAPS[level] }
}
