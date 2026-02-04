import { Home, FolderOpen, AlertTriangle, Shield, Settings } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { AIStatus } from '@/components/ai-status'
import { SidebarHeader } from '@/components/sidebar-header'

interface SidebarProps {
  className?: string
}

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'My ROPA',
    href: '/ropa',
    icon: FolderOpen,
  },
  {
    title: 'Risk Assessment',
    href: '/risk',
    icon: AlertTriangle,
  },
  {
    title: 'Breach Monitor',
    href: '/breach',
    icon: Shield,
  },
]

const adminItems = [
  {
    title: 'Administration',
    href: '/admin',
    icon: Settings,
  },
]

export function Sidebar({ className }: SidebarProps) {
  return (
    <div className={cn('flex flex-col min-h-screen border-r bg-slate-50', className)}>
      {/* Main Content */}
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <SidebarHeader />
          <Separator className="my-4" />
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.title}</span>
              </Link>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-1">
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* AI Status Footer with App Name */}
      <div className="border-t bg-white p-4">
        <div className="text-xs font-medium text-slate-600 mb-3">AI Status</div>
        <AIStatus />
        <Separator className="my-3" />
        <div className="flex flex-col items-center text-center py-2 gap-2">
          <Image
            src="/tanod-logo.svg"
            alt="TANOD Logo"
            width={32}
            height={32}
          />
          <div>
            <p className="text-xs font-semibold text-slate-700">TANOD</p>
            <p className="text-xs text-slate-500">DPO Compliance Platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
