import { SummaryDetail } from '@/components/resumo/summary-detail'
import { SummaryPrint }  from '@/components/resumo/summary-print'
import type { SummaryPeriod } from '@/lib/api/summary'

const VALID_PERIODS: SummaryPeriod[] = ['7d', '30d', '90d']

type Params = Promise<{ id: string }>

export default async function SummaryDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const period: SummaryPeriod = VALID_PERIODS.includes(id as SummaryPeriod)
    ? (id as SummaryPeriod)
    : '7d'

  return (
    <div>
      <div className="print:hidden">
        <SummaryDetail period={period} />
      </div>
      <div className="hidden print:block">
        <SummaryPrint period={period} />
      </div>
    </div>
  )
}
