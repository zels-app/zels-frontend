import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export type ChecklistItemStatus = 'PENDING' | 'COMPLETED' | 'NOT_DONE' | 'PARTIAL'

export type Checklist = {
  id: string
  healthProfileId: string
  date: string
}

export type ChecklistItem = {
  id: string
  checklistId: string
  itemName: string
  scheduledTime: string
  status: ChecklistItemStatus
  notes: string | null
  executedByUserId: string | null
  executedAt: string | null
}

export type ChecklistReport = {
  total: number
  completed: number
  pending: number
  notDone: number
}

function todayParam() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useChecklist(healthProfileId: string | undefined) {
  const today = todayParam()
  return useQuery({
    queryKey: ['checklists', healthProfileId, today],
    queryFn: () =>
      api.get<Checklist[]>(`/checklists/${healthProfileId}?from=${today}&to=${today}`),
    enabled: !!healthProfileId,
  })
}

export function useChecklistItems(checklistId: string | undefined) {
  return useQuery({
    queryKey: ['checklist-items', checklistId],
    queryFn: () => api.get<ChecklistItem[]>(`/checklists/${checklistId}/items`),
    enabled: !!checklistId,
  })
}

export function useChecklistReport(checklistId: string | undefined) {
  return useQuery({
    queryKey: ['checklist-report', checklistId],
    queryFn: () => api.get<ChecklistReport>(`/checklists/${checklistId}/report`),
    enabled: !!checklistId,
  })
}

export function useUpdateChecklistItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      status,
      notes,
    }: {
      itemId: string
      status: ChecklistItemStatus
      notes?: string
    }) => api.patch<ChecklistItem>(`/checklists/items/${itemId}`, { status, notes }),
    onSuccess: () => {
      toast.success('Item atualizado')
      queryClient.invalidateQueries({ queryKey: ['checklist-items', checklistId] })
      queryClient.invalidateQueries({ queryKey: ['checklist-report', checklistId] })
    },
    onError: () => {
      toast.error('Erro ao atualizar item')
    },
  })
}

export function useCreateChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { healthProfileId: string; date: string }) =>
      api.post<Checklist>('/checklists', body),
    onSuccess: (_data, vars) => {
      toast.success('Checklist do dia criado')
      queryClient.invalidateQueries({ queryKey: ['checklists', vars.healthProfileId] })
    },
    onError: () => {
      toast.error('Erro ao criar checklist')
    },
  })
}

export function useCreateChecklistItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { itemName: string; scheduledTime?: string }) =>
      api.post<ChecklistItem>(`/checklists/${checklistId}/items`, body),
    onSuccess: () => {
      toast.success('Item adicionado ao checklist')
      queryClient.invalidateQueries({ queryKey: ['checklist-items', checklistId] })
      queryClient.invalidateQueries({ queryKey: ['checklist-report', checklistId] })
    },
    onError: () => {
      toast.error('Erro ao adicionar item')
    },
  })
}

export function useDeleteChecklistItem(checklistId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      api.delete<void>(`/checklists/items/${itemId}`),
    onSuccess: () => {
      toast.success('Item removido do checklist')
      queryClient.invalidateQueries({ queryKey: ['checklist-items', checklistId] })
      queryClient.invalidateQueries({ queryKey: ['checklist-report', checklistId] })
    },
    onError: () => {
      toast.error('Erro ao remover item')
    },
  })
}
