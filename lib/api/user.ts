import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type User = {
  id: string
  name: string
  displayName?: string
  email: string
  phone?: string
  role: 'ELDERLY' | 'CURATOR' | 'FAMILY' | 'CAREGIVER' | 'ADMIN'
  hasSeenWelcome?: boolean
}

export type UpdateUserInput = {
  name?: string
  displayName?: string
  phone?: string
  hasSeenWelcome?: boolean
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => api.get<User>('/users/me'),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateUserInput) => api.patch<User>('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
      queryClient.invalidateQueries({ queryKey: ['access-control'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      api.patch<{ message: string }>('/users/me/password', data),
  })
}
