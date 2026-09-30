import { ReactNode } from 'react'
import { Sidebar } from '@/components/sidebar'

export const metadata = {
  title: 'Administration | TANOD',
  description: 'Manage your organization settings',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-8 px-4 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
