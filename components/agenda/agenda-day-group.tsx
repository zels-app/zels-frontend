import { cn } from '@/lib/utils'
import { AgendaItemRow, type AgendaItem } from './agenda-item-row'

interface AgendaDayGroupProps {
  label: string
  dateFormatted: string
  isToday: boolean
  isLast: boolean
  items: AgendaItem[]
}

export function AgendaDayGroup({ label, dateFormatted, isToday, isLast, items }: AgendaDayGroupProps) {
  return (
    <div className={cn('relative pl-7', isLast ? 'pb-2' : 'pb-8')}>
      {!isLast && (
        <div className="absolute left-2.5 top-3.5 bottom-0 w-px bg-border" />
      )}

      <div
        className={cn(
          'absolute left-2.5 top-3.5 -translate-x-1/2 h-2.5 w-2.5 rounded-full ring-2 ring-background',
          isToday ? 'bg-zels-primary' : 'bg-border'
        )}
      />

      <div className="mb-3 flex items-baseline gap-2">
        <span
          className={cn(
            'text-sm font-semibold',
            isToday ? 'text-zels-primary' : 'text-foreground'
          )}
        >
          {label}
        </span>
        <span className="text-xs text-zels-text-faint">{dateFormatted}</span>
      </div>

      <div
        className={cn(
          'rounded-xl bg-card shadow-sm ring-1 divide-y divide-border/50 overflow-hidden',
          isToday ? 'ring-zels-primary/15' : 'ring-black/5'
        )}
      >
        {items.map(item => (
          <div key={item.id} className="px-4 py-3">
            <AgendaItemRow item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
