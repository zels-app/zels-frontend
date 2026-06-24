import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export type HealthRecordType = 'DIARY' | 'SYMPTOM' | 'VITAL' | 'EXAM' | 'EVENT'

export type HealthRecordData = {
  // VITAL
  type?: string
  systolic?: number
  diastolic?: number
  value?: number
  unit?: string
  // DIARY
  text?: string
  // SYMPTOM
  symptom?: string
  intensity?: string
  context?: string
  // EVENT
  description?: string
  location?: string
}

export type VitalData = HealthRecordData

export type HealthRecord = {
  id: string
  healthProfileId: string
  type: HealthRecordType
  data: HealthRecordData
  source: 'APP' | 'WHATSAPP' | 'AUDIO' | 'IMAGE'
  originalContent?: string
  createdAt: string
}

export type HealthRecordsFilters = {
  type?: HealthRecordType
  from?: string
  to?: string
  limit?: number
}

type ApiResponse =
  | HealthRecord[]
  | { records: HealthRecord[]; total: number; page: number; limit: number }

function unpack(res: ApiResponse): { records: HealthRecord[]; total: number } {
  if (Array.isArray(res)) return { records: res, total: res.length }
  return { records: res.records, total: res.total }
}

export function useHealthRecords(
  healthProfileId: string | undefined,
  filters: HealthRecordsFilters = {}
) {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  params.set('limit', String(filters.limit ?? 10))

  return useQuery({
    queryKey: ['health-records', 'list', healthProfileId, filters],
    queryFn: () =>
      api.get<ApiResponse>(`/health-records/${healthProfileId}?${params}`).then(unpack),
    enabled: !!healthProfileId,
  })
}

export function useCreateHealthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      healthProfileId: string
      type: HealthRecordType
      data: HealthRecordData
      source: 'APP'
    }) => api.post<HealthRecord>('/health-records', body),
    onSuccess: () => {
      toast.success('Registro salvo')
      queryClient.invalidateQueries({ queryKey: ['health-records'] })
    },
    onError: () => {
      toast.error('Erro ao salvar registro')
    },
  })
}

export function useDeleteHealthRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/health-records/${id}`),
    onSuccess: () => {
      toast.success('Registro removido')
      queryClient.invalidateQueries({ queryKey: ['health-records'] })
    },
    onError: () => {
      toast.error('Erro ao remover registro')
    },
  })
}

export function useVitals(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['health-records', healthProfileId, 'vitals'],
    queryFn: () =>
      api
        .get<ApiResponse>(`/health-records/${healthProfileId}?type=VITAL&limit=5`)
        .then(res => (Array.isArray(res) ? res : res.records)),
    enabled: !!healthProfileId,
  })
}
