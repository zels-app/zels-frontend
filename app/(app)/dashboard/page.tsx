'use client'

import { useEffect, useState }   from 'react'
import { useRouter }             from 'next/navigation'
import { useCurrentUser }        from '@/lib/api/user'
import { useHealthProfile }      from '@/lib/api/health-profile'
import { getAccessInfo }         from '@/lib/access-level'
import { DashboardHeader }       from '@/components/dashboard/dashboard-header'
import { AlertsWidget }          from '@/components/dashboard/alerts-widget'
import { MedicationsTodayWidget } from '@/components/dashboard/medications-today-widget'
import { VitalsLatestWidget }    from '@/components/dashboard/vitals-latest-widget'
import { AppointmentsWidget }    from '@/components/dashboard/appointments-widget'
import { SummaryWidget }         from '@/components/dashboard/summary-widget'
import { DashHero }              from '@/components/dashboard/dash-hero'
import { DashTimeline }          from '@/components/dashboard/dash-timeline'
import { DashAttention }         from '@/components/dashboard/dash-attention'
import { DashRecentRecords }     from '@/components/dashboard/dash-recent-records'
import { DashNextSteps }         from '@/components/dashboard/dash-next-steps'
import { PendingApprovals }      from '@/components/approvals/pending-approvals'
import { WelcomeModal }          from '@/components/modals/welcome-modal'

export default function DashboardPage() {
  const router = useRouter()
  const { data: user, isLoading: userLoading }  = useCurrentUser()
  const { data: profile, isLoading: profileLoading } = useHealthProfile()
  const access = getAccessInfo(user, profile)

  const [welcomeOpen, setWelcomeOpen] = useState(false)

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.replace('/onboarding')
    }
  }, [profile, profileLoading, router])

  useEffect(() => {
    if (!userLoading && user?.hasSeenWelcome === false) {
      setWelcomeOpen(true)
    }
  }, [user, userLoading])

  return (
    <>
      <WelcomeModal open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />

      {/* ── Mobile ───────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col gap-6">
        <DashHero isSelf={access.isSelf} />
        {access.canApprove && profile?.id && (
          <PendingApprovals healthProfileId={profile.id} />
        )}
        <DashTimeline />
        <DashAttention />
        <DashRecentRecords />
        <DashNextSteps />
      </div>

      {/* ── Desktop (protótipo bold) ──────────────────────────── */}
      <div className="hidden lg:flex lg:flex-col" style={{ gap: '2rem' }}>
        <DashHero isSelf={access.isSelf} />
        {access.canApprove && profile?.id && (
          <PendingApprovals healthProfileId={profile.id} />
        )}
        <DashTimeline />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <DashAttention />
          <DashRecentRecords />
          <DashNextSteps />
        </div>
      </div>
    </>
  )
}
