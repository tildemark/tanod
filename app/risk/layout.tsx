import { Sidebar } from '@/components/sidebar'

export default function RiskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="w-64" />
      <main className="flex-1 p-8 bg-white">
        {children}
      </main>
    </div>
  )
}
