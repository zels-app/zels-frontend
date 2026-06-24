'use client'

import { useMemo } from 'react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useMedications } from '@/lib/api/medications'
import { useExams } from '@/lib/api/exams'
import { useHealthRecords } from '@/lib/api/health-records'
import { AgendaDayGroup } from './agenda-day-group'
import type { AgendaItem } from './agenda-item-row'

// ── Date helpers ──────────────────────────────────────────────

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function dayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Hoje'
  const tomorrow = new Date(todayStr + 'T12:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === formatISO(tomorrow)) return 'Amanhã'
  const d = new Date(dateStr + 'T12:00:00')
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  return weekDays[d.getDay()]
}

// ── Skeleton ──────────────────────────────────────────────────

function DaySkeleton() {
  return (
    <div className="relative pl-7 pb-8">
      <div className="absolute left-2.5 top-3.5 bottom-0 w-px bg-border" />
      <div className="absolute left-2.5 top-3.5 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-border ring-2 ring-background" />
      <div className="mb-3 flex items-baseline gap-2">
        <div className="h-3.5 w-12 bg-muted rounded animate-pulse" />
        <div className="h-3 w-10 bg-muted rounded animate-pulse" />
      </div>
      <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 divide-y divide-border/50 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-4 py-3 flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2 py-0.5">
              <div className="h-3.5 w-3/5 bg-muted rounded" />
              <div className="h-3 w-2/5 bg-muted rounded" />
            </div>
            <div className="h-6 w-12 bg-muted rounded-md shrink-0 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function AgendaView() {
  const { data: profile } = useHealthProfile()
  const healthProfileId = profile?.id

  const examFilters = useMemo(() => {
    const today = new Date()
    const future = new Date(today)
    future.setDate(today.getDate() + 30)
    return { from: formatISO(today), to: formatISO(future) }
  }, [])

  const { data: medications, isLoading: medLoading } = useMedications(healthProfileId)
  const { data: exams, isLoading: examLoading } = useExams(healthProfileId, examFilters)
  const { data: eventsData, isLoading: eventLoading } = useHealthRecords(healthProfileId, {
    type: 'EVENT',
    limit: 20,
  })

  const isLoading = !healthProfileId || medLoading || examLoading || eventLoading

  const grouped = useMemo(() => {
    if (!medications || !exams || !eventsData) return null

    const today = new Date()
    const todayStr = formatISO(today)
    const items: AgendaItem[] = []

    // Medications → expand horários para hoje + próximos 6 dias
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(today)
      d.setDate(today.getDate() + offset)
      const dateStr = formatISO(d)

      for (const med of medications) {
        for (const time of med.schedule) {
          items.push({
            id: `med-${med.id}-${dateStr}-${time}`,
            date: dateStr,
            time,
            kind: 'medication',
            title: med.name,
            subtitle: med.instructions
              ? `${med.dosage} · ${med.instructions}`
              : med.dosage,
          })
        }
      }
    }

    // Exams → usar examDate; API já filtra from/to, mas garantimos >= hoje no cliente
    for (const exam of exams) {
      const dateStr = exam.examDate.slice(0, 10)
      if (dateStr >= todayStr) {
        items.push({
          id: `exam-${exam.id}`,
          date: dateStr,
          kind: 'exam',
          title: exam.type,
          subtitle: exam.notes ?? undefined,
        })
      }
    }

    // Events → prefere data.date se existir; só mostra hoje ou futuro
    for (const record of eventsData.records) {
      const rawDate = (record.data as { date?: string }).date ?? record.createdAt
      const dateStr = rawDate.slice(0, 10)
      if (dateStr >= todayStr) {
        items.push({
          id: `event-${record.id}`,
          date: dateStr,
          kind: 'event',
          title: record.data.description ?? 'Evento de saúde',
          subtitle: record.data.location ?? undefined,
        })
      }
    }

    // Agrupa por data
    const map = new Map<string, AgendaItem[]>()
    for (const item of items) {
      const group = map.get(item.date) ?? []
      group.push(item)
      map.set(item.date, group)
    }

    // Dentro de cada dia: itens com horário primeiro (por hora), depois sem horário
    for (const group of map.values()) {
      group.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time)
        if (a.time) return -1
        if (b.time) return 1
        return 0
      })
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayItems]) => ({
        date,
        label: dayLabel(date, todayStr),
        dateFormatted: formatDisplay(date),
        isToday: date === todayStr,
        items: dayItems,
      }))
  }, [medications, exams, eventsData])

  if (isLoading || !grouped) {
    return (
      <div>
        <DaySkeleton />
        <DaySkeleton />
      </div>
    )
  }

  if (grouped.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zels-text-soft">
        Nenhum item agendado para os próximos dias.
      </p>
    )
  }

  return (
    <div>
      {grouped.map((group, idx) => (
        <AgendaDayGroup
          key={group.date}
          label={group.label}
          dateFormatted={group.dateFormatted}
          isToday={group.isToday}
          isLast={idx === grouped.length - 1}
          items={group.items}
        />
      ))}
    </div>
  )
}
