'use client'

import { useCurrentUser } from '@/lib/api/user'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function DashboardHeader() {
  const { data: user } = useCurrentUser()
  const greeting = getGreeting()
  const firstName = user?.displayName || user?.name.split(' ')[0]

  return (
    <div>
      <h1 className="text-[1.375rem] font-semibold text-foreground leading-tight">
        {firstName ? `${greeting}, ${firstName}!` : 'Painel de saúde'}
      </h1>
      <p className="text-sm text-zels-text-soft mt-1">
        Acompanhe os registros e atividades recentes.
      </p>
    </div>
  )
}
