import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { ConfirmDialogHost } from '@/components/ui/confirm-dialog'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <ConfirmDialogHost />
    </div>
  )
}
