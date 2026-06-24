import { AlertTriangle, Info } from 'lucide-react'
import type { Alert, AlertLevel } from '@/hooks/useAlerts'

type LevelConfig = {
  containerClass: string
  iconClass: string
  titleClass: string
  Icon: typeof AlertTriangle
}

const levelConfig: Record<AlertLevel, LevelConfig> = {
  urgent: {
    containerClass: 'bg-zels-urgent/10 border border-zels-urgent/25',
    iconClass: 'text-zels-urgent',
    titleClass: 'text-zels-urgent',
    Icon: AlertTriangle,
  },
  warning: {
    containerClass: 'bg-zels-attention/10 border border-zels-attention/25',
    iconClass: 'text-zels-attention',
    titleClass: 'text-zels-attention',
    Icon: AlertTriangle,
  },
  info: {
    containerClass: 'bg-muted border border-border',
    iconClass: 'text-zels-text-soft',
    titleClass: 'text-foreground',
    Icon: Info,
  },
}

type AlertCardProps = Pick<Alert, 'level' | 'title' | 'detail' | 'when'>

export function AlertCard({ level, title, detail, when }: AlertCardProps) {
  const { containerClass, iconClass, titleClass, Icon } = levelConfig[level]

  return (
    <div className={`rounded-lg px-4 py-3 flex items-start gap-3 ${containerClass}`}>
      <Icon size={16} className={`shrink-0 mt-0.5 ${iconClass}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${titleClass}`}>{title}</p>
        <p className="text-xs mt-0.5 text-zels-text-soft">{detail}</p>
      </div>
      <span className="text-xs text-zels-text-faint shrink-0 mt-0.5">{when}</span>
    </div>
  )
}
