import { EmergencyPanel } from '@/components/emergency/emergency-panel'

export default function EmergenciaPage() {
  return (
    // Fundo escuro sangra até as bordas negando o padding do <main> (p-6/p-8)
    <div className="-m-6 md:-m-8 min-h-screen bg-[#141210] p-6 md:p-8">
      <EmergencyPanel />
    </div>
  )
}
