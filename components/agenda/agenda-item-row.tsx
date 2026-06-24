import { Pill, FlaskConical, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AgendaItem = {
  id: string
  date: string
  time?: string
  kind: 'medication' | 'exam' | 'event'
  title: string
  subtitle?: string
}

const KIND_CONFIG = {
  medication: {
    icon: Pill,
    iconBg: 'bg-zels-primary-soft',
    iconColor: 'text-zels-primary',
  },
  exam: {
    icon: FlaskConical,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  event: {
    icon: CalendarDays,
    iconBg: 'bg-amber-50',
    iconColor: 'text-zels-attention',
  },
}

interface AgendaItemRowProps {
  item: AgendaItem
}

export function AgendaItemRow({ item }: AgendaItemRowProps) {
  const { icon: Icon, iconBg, iconColor } = KIND_CONFIG[item.kind]

  return (
    <div className="flex items-start gap-3">
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconBg)}>
        <Icon size={15} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
        {item.subtitle && (
          <p className="mt-0.5 text-xs text-zels-text-soft">{item.subtitle}</p>
        )}
      </div>
      {item.time && (
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-xs text-zels-text-soft tabular-nums">
          {item.time}
        </span>
      )}
    </div>
  )
}
