import { Home, FolderOpen, AlertTriangle, Shield, Settings, ClipboardCheck, FileCheck, Users, Bell, Lock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { AIStatus } from '@/components/ai-status'
import { SidebarHeader } from '@/components/sidebar-header'

interface SidebarProps {
  className?: string
}

const menuGroups = [
  {
    title: 'Core',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
      },
      {
        title: 'ROPA',
        href: '/ropa',
        icon: FolderOpen,
      },
    ],
  },
  {
    title: 'Governance',
    items: [
      {
        title: 'PIA / DPIA',
        href: '/governance/pia',
        icon: ClipboardCheck,
      },
      {
        title: 'Policies & Notices',
        href: '#',
        icon: FileCheck,
        disabled: true,
      },
      {
        title: 'Vendor & DPA Tracking',
        href: '#',
        icon: Users,
        disabled: true,
      },
    ],
  },
  {
    title: 'Monitoring',
    items: [
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
      {
        title: 'DSAR & Requests',
        href: '#',
        icon: Bell,
        disabled: true,
      },
    ],
  },
  {
    title: 'Security & Access',
    items: [
      {
        title: 'Roles & Access',
        href: '#',
        icon: Lock,
        disabled: true,
      },
    ],
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
          <div className="space-y-4">
            {menuGroups.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900 ${
                        item.disabled ? 'pointer-events-none opacity-50' : ''
                      }`}
                      aria-disabled={item.disabled}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
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
