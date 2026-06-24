'use client'

import { useState } from 'react'
import { Pill, Calendar, RefreshCw, X, Check } from 'lucide-react'
import { api } from '@/lib/api/client'
import { toISOLocal, toDatetimeLocal } from '@/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuggestedItem = {
  id: string
  itemName: string
  scheduledTime: string | undefined
  group: 'medication' | 'appointment' | 'template'
}

export type SuggestionsData = {
  routines: SuggestedItem[]
  medications: SuggestedItem[]
  appointments: SuggestedItem[]
}

type MedDose = { medicationName?: string; name?: string; scheduledTime?: string }
type ApptRaw = { id: string; title: string; professional?: string; scheduledAt: string; status: string }
type TemplateRaw = { id: string; itemName: string; scheduledTime?: string }

// ─── fetchSuggestions ─────────────────────────────────────────────────────────

export async function fetchSuggestions(healthProfileId: string): Promise<SuggestionsData> {
  const today    = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const from = toISOLocal(today)
  const to   = toISOLocal(tomorrow)

  const [medsRaw, apptsRaw, templatesRaw] = await Promise.all([
    api.get<{ doses?: MedDose[] }>(`/medications/today?healthProfileId=${healthProfileId}`),
    api.get<ApptRaw[] | { appointments?: ApptRaw[] }>(
      `/appointments?from=${from}&to=${to}&healthProfileId=${healthProfileId}`
    ),
    api.get<TemplateRaw[] | { templates?: TemplateRaw[] }>(
      `/checklist-templates/${healthProfileId}`
    ),
  ])

  // Routines — from saved templates
  const templatesArr = Array.isArray(templatesRaw)
    ? templatesRaw
    : (templatesRaw as { templates?: TemplateRaw[] }).templates ?? []
  const routines: SuggestedItem[] = (templatesArr as TemplateRaw[]).map((t) => ({
    id: `tpl|${t.id}`,
    itemName: t.itemName,
    scheduledTime: t.scheduledTime ?? undefined,
    group: 'template' as const,
  }))

  // Medications — deduplicate by medicationName+scheduledTime
  const doses = (medsRaw as { doses?: MedDose[] }).doses ?? []
  const seen  = new Set<string>()
  const medications: SuggestedItem[] = []
  for (const dose of doses) {
    const name = dose.medicationName ?? dose.name ?? ''
    const time = dose.scheduledTime ?? ''
    const key  = `med|${name}|${time}`
    if (name && !seen.has(key)) {
      seen.add(key)
      medications.push({
        id: key,
        itemName: time ? `${name} — ${time}` : name,
        scheduledTime: time || undefined,
        group: 'medication',
      })
    }
  }

  // Appointments — only SCHEDULED ones today
  const rawList = Array.isArray(apptsRaw)
    ? apptsRaw
    : (apptsRaw as { appointments?: ApptRaw[] }).appointments ?? []
  const appointments: SuggestedItem[] = (rawList as ApptRaw[])
    .filter((a) => a.status === 'SCHEDULED')
    .map((appt) => ({
      id: appt.id,
      itemName: appt.professional ? `${appt.title} · ${appt.professional}` : appt.title,
      scheduledTime: toDatetimeLocal(appt.scheduledAt).slice(11, 16),
      group: 'appointment' as const,
    }))

  return { routines, medications, appointments }
}

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  checked,
  onToggle,
}: {
  item: SuggestedItem
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors hover:bg-[#f6f4ef]"
      style={{ borderColor: '#e8e5de' }}
    >
      <div
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors"
        style={{
          backgroundColor: checked ? 'var(--zels-primary)' : 'transparent',
          borderColor:     checked ? 'var(--zels-primary)' : '#e8e5de',
        }}
      >
        {checked && <Check size={12} color="white" strokeWidth={3} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate text-[#3D2B1F]" style={{ fontSize: '0.875rem' }}>
          {item.itemName}
        </p>
      </div>

      {item.scheduledTime && (
        <span
          className="font-mono shrink-0"
          style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
        >
          {item.scheduledTime}
        </span>
      )}
    </button>
  )
}

// ─── SuggestionsContent ───────────────────────────────────────────────────────

type ContentProps = {
  data: SuggestionsData
  onConfirm: (items: SuggestedItem[]) => void
  onCancel: () => void
  isCreating: boolean
}

function SuggestionsContent({ data, onConfirm, onCancel, isCreating }: ContentProps) {
  const allItems = [...data.routines, ...data.medications, ...data.appointments]
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allItems.map((i) => i.id)))
  const isEmpty = allItems.length === 0

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-[700] text-[#3D2B1F]" style={{ fontSize: '1.125rem' }}>
          Checklist de hoje
        </h2>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'rgba(61,43,31,0.42)' }}
        >
          <X size={18} />
        </button>
      </div>

      {isEmpty ? (
        <>
          <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)', lineHeight: 1.6 }}>
            Nenhuma rotina, medicação ou compromisso encontrado para hoje. O checklist será criado vazio.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm([])}
              disabled={isCreating}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isCreating ? 'Criando…' : 'Criar assim mesmo'}
            </button>
            <button
              onClick={onCancel}
              disabled={isCreating}
              className="px-4 py-3 rounded-xl text-sm border"
              style={{ color: 'rgba(61,43,31,0.42)', borderColor: '#e8e5de' }}
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Rotinas */}
          {data.routines.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={13} style={{ color: 'var(--zels-primary-strong)' }} />
                <span
                  className="font-mono uppercase tracking-wider"
                  style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
                >
                  Rotinas
                </span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e8e5de' }}>
                {data.routines.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    checked={selected.has(item.id)}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medicações */}
          {data.medications.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Pill size={13} style={{ color: 'var(--zels-primary-strong)' }} />
                <span
                  className="font-mono uppercase tracking-wider"
                  style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
                >
                  Medicações
                </span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e8e5de' }}>
                {data.medications.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    checked={selected.has(item.id)}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Compromissos */}
          {data.appointments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar size={13} style={{ color: '#A86E13' }} />
                <span
                  className="font-mono uppercase tracking-wider"
                  style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
                >
                  Compromissos
                </span>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e8e5de' }}>
                {data.appointments.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    checked={selected.has(item.id)}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onConfirm(allItems.filter((i) => selected.has(i.id)))}
              disabled={isCreating}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isCreating ? 'Criando…' : 'Confirmar e criar'}
            </button>
            <button
              onClick={onCancel}
              disabled={isCreating}
              className="px-4 py-3 rounded-xl text-sm border"
              style={{ color: 'rgba(61,43,31,0.42)', borderColor: '#e8e5de' }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── SuggestionsSheet ─────────────────────────────────────────────────────────

export function SuggestionsSheet({
  data,
  onConfirm,
  onCancel,
  isCreating,
  variant,
}: ContentProps & { variant: 'sheet' | 'dialog' }) {
  if (variant === 'sheet') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden />
        <div className="relative bg-white rounded-t-2xl pt-8 pb-8 px-6 max-h-[85vh] overflow-y-auto">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#efece5]" />
          <SuggestionsContent
            data={data}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isCreating={isCreating}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-[14px] shadow-xl p-6 max-h-[85vh] overflow-y-auto">
        <SuggestionsContent
          data={data}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isCreating={isCreating}
        />
      </div>
    </div>
  )
}
