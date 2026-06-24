import { MedsMobile } from '@/components/medications/meds-mobile'
import { MedsDesktop } from '@/components/medications/meds-desktop'

export default function MedicamentosPage() {
  return (
    <>
      <div className="lg:hidden">
        <MedsMobile />
      </div>
      <div className="hidden lg:block">
        <MedsDesktop />
      </div>
    </>
  )
}
