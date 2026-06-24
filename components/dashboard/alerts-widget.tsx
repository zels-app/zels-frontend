'use client'

import { useHealthProfile } from '@/lib/api/health-profile'
import { useAlerts } from '@/hooks/useAlerts'
import { AlertCard } from '@/components/domain/AlertCard'

export function AlertsWidget() {
  const { data: profile } = useHealthProfile()
  const { data: alerts, isLoading, isError } = useAlerts(profile?.id)

  if (isLoading || isError) return null

  const alertList = Array.isArray(alerts) ? alerts : []

  if (alertList.length === 0) return null

  return (
    <div className="space-y-2">
      {alertList.map((alert, i) => (
        <AlertCard
          key={alert.id ?? i}
          level={alert.level}
          title={alert.title}
          detail={alert.detail}
          when={alert.when}
        />
      ))}
    </div>
  )
}
