<script lang="ts">
  import { page } from '$app/stores';
  import {
    LayoutDashboard,
    FolderLock,
    ShieldAlert,
    Clock,
    UserCheck,
    FileText,
    Settings,
    Shield,
    HardDrive,
    Info,
    Archive
  } from 'lucide-svelte';

  let currentPath = $derived($page.url.pathname);

  const navigation = [
    {
      group: 'Core Compliance',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'ROPA Registry', href: '/ropa', icon: FolderLock },
        { name: 'PIA 4×4 Matrix', href: '/pia', icon: ShieldAlert },
      ]
    },
    {
      group: 'Regulatory Enforcement',
      items: [
        { name: '72-Hour Breach Monitor', href: '/incidents', icon: Clock },
        { name: 'DSR Rights Helpdesk', href: '/dsr', icon: UserCheck },
        { name: 'DPO Directives & Memos', href: '/memos', icon: FileText },
      ]
    },
    {
      group: 'Statutory Archive',
      items: [
        { name: 'Document Vault', href: '/vault', icon: FolderLock },
        { name: 'Backup & Recovery', href: '/backup', icon: Archive },
      ]
    },
    {
      group: 'Administration & System',
      items: [
        { name: 'Entity & Governance', href: '/settings', icon: Settings },
        { name: 'About TANOD', href: '/about', icon: Info },
      ]
    }
  ];
</script>

<aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none">
  <!-- Brand / Header -->
  <div class="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/60">
    <div class="h-9 w-9 rounded-lg overflow-hidden bg-slate-950 border border-amber-500/40 flex items-center justify-center p-0.5 shadow-md">
      <img src="/images/tanod-logo.jpg" alt="TANOD Shield Logo" class="h-full w-full object-cover rounded-md" />
    </div>
    <div class="flex flex-col min-w-0">
      <span class="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-1.5">
        TANOD
        <span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">RA 10173</span>
      </span>
      <span class="text-[11px] text-slate-400 truncate">Philippine DPO Workspace</span>
    </div>
  </div>

  <!-- Navigation Links -->
  <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
    {#each navigation as section}
      <div>
        <h3 class="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
          {section.group}
        </h3>
        <div class="space-y-1">
          {#each section.items as item}
            {@const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))}
            <a
              href={item.href}
              class="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors {
                isActive 
                  ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30' 
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
              }"
            >
              <item.icon class="h-4 w-4 shrink-0 {isActive ? 'text-amber-400' : 'text-slate-400'}" />
              <span>{item.name}</span>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  </nav>

  <!-- Offline Sovereignty Status Banner -->
  <div class="p-3 m-3 rounded-lg border border-slate-800 bg-slate-950/80">
    <div class="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1">
      <HardDrive class="h-3.5 w-3.5 text-emerald-400" />
      <span>Local Encrypted DB</span>
    </div>
    <div class="flex items-center justify-between text-[11px] text-slate-400">
      <span>Storage</span>
      <span class="font-mono text-[10px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">100% Offline</span>
    </div>
  </div>
</aside>
