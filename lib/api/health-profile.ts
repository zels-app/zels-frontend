import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type HealthProfile = {
  id: string
  elderlyUserId: string
  curatorUserId?: string
  fullName: string
  birthDate: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  bloodType: 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG'
  hasDigitalDependency: boolean
  emergencyNotes?: string
}

export function useHealthProfile() {
  return useQuery({
    queryKey: ['health-profile', 'me'],
    queryFn: () => api.get<HealthProfile>('/health-profile/me'),
  })
}

export type UpdateHealthProfilePayload = {
  fullName?: string
  birthDate?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  bloodType?: 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG' | null
  hasDigitalDependency?: boolean
  emergencyNotes?: string
}

export function useUpdateHealthProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHealthProfilePayload }) =>
      api.patch<HealthProfile>(`/health-profile/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-profile', 'me'] })
    },
  })
}
