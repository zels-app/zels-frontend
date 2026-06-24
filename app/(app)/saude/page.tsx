'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { HealthRecordsList } from '@/components/health/health-records-list'
import { PageHeader } from '@/components/layout/page-header'
import { useHealthProfile } from '@/lib/api/health-profile'

export default function SaudePage() {
  const router = useRouter()
  const { data: profile } = useHealthProfile()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="lg:hidden p-1 -ml-1 mt-0.5 rounded-md"
          style={{ color: 'rgba(61,43,31,0.42)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <PageHeader overline={profile?.fullName} title="Saúde" subtitle="Registros de saúde e sinais vitais" />
      </div>
      <HealthRecordsList />
    </div>
  )
}
