import { CareCircleMobile } from '@/components/ciclo/care-circle-mobile'
import { CareCircleDesktop } from '@/components/ciclo/care-circle-desktop'

export default function CicloPage() {
  return (
    <>
      <div className="lg:hidden">
        <CareCircleMobile />
      </div>
      <div className="hidden lg:block">
        <CareCircleDesktop />
      </div>
    </>
  )
}
