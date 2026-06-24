import { EmergencyView } from '@/components/emergencia/emergency-view'
import { EmergencyPrint } from '@/components/emergencia/emergency-print'

export default function FichaEmergenciaPage() {
  return (
    // Bleed wrapper: negates <main> padding so the dark bg preenche a tela toda.
    // print:m-0 desfaz o bleed na impressão (EmergencyPrint já tem seu próprio padding).
    <div className="-m-6 md:-m-8 print:m-0 print:p-0">
      <div className="print:hidden">
        <EmergencyView />
      </div>
      <div className="hidden print:block">
        <EmergencyPrint />
      </div>
    </div>
  )
}
