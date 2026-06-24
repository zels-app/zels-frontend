import { ChecklistMobile } from '@/components/checklist/checklist-mobile'
import { ChecklistDesktop } from '@/components/checklist/checklist-desktop'

export default function ChecklistPage() {
  return (
    <>
      <div className="lg:hidden">
        <ChecklistMobile />
      </div>
      <div className="hidden lg:block">
        <ChecklistDesktop />
      </div>
    </>
  )
}
