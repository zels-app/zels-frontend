import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export type ChecklistTemplate = {
  id: string
  healthProfileId: string
  itemName: string
  scheduledTime?: string
  createdAt: string
  updatedAt: string
}

export function useChecklistTemplates(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['checklist-templates', healthProfileId],
    queryFn: async () => {
      const res = await api.get<
        ChecklistTemplate[] | { templates?: ChecklistTemplate[]; data?: ChecklistTemplate[] }
      >(`/checklist-templates/${healthProfileId}`)
      if (Array.isArray(res)) return res
      const r = res as { templates?: ChecklistTemplate[]; data?: ChecklistTemplate[] }
      return r.templates ?? r.data ?? []
    },
    enabled: !!healthProfileId,
  })
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { healthProfileId: string; itemName: string; scheduledTime?: string }) =>
      api.post<ChecklistTemplate>('/checklist-templates', body),
    onSuccess: (_data, vars) => {
      toast.success('Rotina criada')
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', vars.healthProfileId] })
    },
    onError: () => {
      toast.error('Erro ao criar rotina')
    },
  })
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; healthProfileId: string }) =>
      api.delete<void>(`/checklist-templates/${id}`),
    onSuccess: (_data, vars) => {
      toast.success('Rotina removida')
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', vars.healthProfileId] })
    },
    onError: () => {
      toast.error('Erro ao remover rotina')
    },
  })
}
