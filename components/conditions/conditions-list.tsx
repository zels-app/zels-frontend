'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import { getAccessInfo } from '@/lib/access-level'
import { useConditions } from '@/lib/api/conditions'
import { ConditionCard } from './condition-card'
import { ConditionForm } from './condition-form'

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-4 animate-pulse flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/5 bg-muted rounded" />
        <div className="h-3 w-2/5 bg-muted rounded" />
      </div>
      <div className="h-5 w-16 bg-muted rounded-full shrink-0 mt-0.5" />
    </div>
  )
}

export function ConditionsList() {
  const [showForm, setShowForm] = useState(false)

  const { data: profile } = useHealthProfile()
  const { data: user }    = useCurrentUser()
  const access = getAccessInfo(user, profile)

  const {
    data: conditions,
    isLoading,
    isError,
  } = useConditions(profile?.id)

  const addBtnClass = (open: boolean) =>
    cn(
      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
      open
        ? 'bg-muted text-zels-text-soft'
        : 'bg-zels-primary text-white hover:opacity-90'
    )

  return (
    <div className="space-y-4">
      {access.canCreate && (
        <button
          type="button"
          onClick={() => setShowForm(prev => !prev)}
          className={addBtnClass(showForm)}
        >
          <Plus size={15} />
          {showForm ? 'Cancelar' : 'Nova condição'}
        </button>
      )}

      {showForm && profile?.id && (
        <ConditionForm
          healthProfileId={profile.id}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {isError && (
        <p className="py-12 text-center text-sm text-zels-text-soft">
          Não foi possível carregar as condições.
        </p>
      )}
      {isLoading && (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}
      {!isLoading && !isError && conditions?.length === 0 && (
        <p className="py-12 text-center text-sm text-zels-text-soft">
          Nenhuma condição registrada.
        </p>
      )}
      {!isLoading && !isError && conditions && conditions.length > 0 && (
        <div className="space-y-3">
          {conditions.map(c => (
            <ConditionCard
              key={c.id}
              condition={c}
              healthProfileId={profile?.id ?? ''}
              canCreate={access.canCreate}
              canManage={access.canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}
