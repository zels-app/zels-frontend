import { cn } from '@/lib/utils'
import type { AppointmentKind } from '@/hooks/useAppointmentsUpcoming'

export type KindTone = { fg: string; bg: string }

const KIND_TONE: Record<AppointmentKind, KindTone> = {
  CONSULTATION: { fg: 'var(--zels-primary-strong)', bg: 'rgba(139,175,138,0.10)' },
  EXAM:         { fg: 'var(--zels-terracota)',       bg: 'rgba(196,132,106,0.12)' },
  THERAPY:      { fg: 'var(--zels-avatar-family)',   bg: 'rgba(155,90,66,0.10)'  },
  VACCINE:      { fg: 'var(--zels-deep)',            bg: 'rgba(44,62,45,0.10)'   },
  OTHER:        { fg: 'rgba(61,43,31,0.68)',         bg: '#efece5'               },
}

const KIND_LABEL: Record<AppointmentKind, string> = {
  CONSULTATION: 'Consulta',
  EXAM:         'Exame',
  THERAPY:      'Terapia',
  VACCINE:      'Vacina',
  OTHER:        'Outro',
}

export function kindTone(kind: AppointmentKind): KindTone {
  return KIND_TONE[kind] ?? KIND_TONE.OTHER
}

interface Props {
  kind: AppointmentKind
  size?: 'sm' | 'md'
}

export function KindBadge({ kind, size = 'sm' }: Props) {
  const tone  = kindTone(kind)
  const label = KIND_LABEL[kind] ?? 'Outro'
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-sm',
        size === 'sm' ? 'text-[0.68rem] px-1.5 py-0.5' : 'text-xs px-2 py-1',
      )}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {label}
    </span>
  )
}
