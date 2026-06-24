import { useMutation, useQueryClient } from '@tanstack/react-query'

type InviteByEmailBody = {
  healthProfileId: string
  email: string
  roleInProfile: 'CURATOR' | 'FAMILY' | 'CAREGIVER'
  canView: boolean
  canRegister: boolean
}

async function inviteByEmail(body: InviteByEmailBody) {
  const res = await fetch('/api/proxy/access-control/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message ?? 'Erro ao enviar convite')
  }

  return data
}

export function useInviteByEmail(healthProfileId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: InviteByEmailBody) => inviteByEmail(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['access-control', healthProfileId],
      })
    },
  })
}
