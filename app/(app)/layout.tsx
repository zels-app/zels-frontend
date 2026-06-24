import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from 'sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster
        richColors
        position="bottom-center"
        duration={4000}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            background: '#3D2B1F',
            color: '#f6f4ef',
            border: '1px solid rgba(246,244,239,0.1)',
            borderRadius: '12px',
          },
          classNames: {
            success: 'toast-success',
            error: 'toast-error',
          },
        }}
      />
    </>
  )
}
