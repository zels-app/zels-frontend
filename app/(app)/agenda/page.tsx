import { AgendaMobile } from '@/components/agenda/agenda-mobile'
import { AgendaDesktop } from '@/components/agenda/agenda-desktop'

export default function AgendaPage() {
  return (
    <>
      <div className="lg:hidden">
        <AgendaMobile />
      </div>
      <div className="hidden lg:block">
        <AgendaDesktop />
      </div>
    </>
  )
}
