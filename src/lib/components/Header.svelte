<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrganization } from '$lib/api/admin';
  import type { Organization } from '$lib/types/organization';
  import { ShieldCheck, Building2, User } from 'lucide-svelte';

  let org = $state<Organization | null>(null);

  onMount(async () => {
    try {
      org = await getOrganization();
    } catch (e) {
      console.error('Failed to load organization profile', e);
    }
  });
</script>

<header class="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-xs select-none">
  <!-- Left: Entity Title & Classification -->
  <div class="flex items-center gap-3">
    <div class="h-8 w-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
      <Building2 class="h-4 w-4" />
    </div>
    <div>
      <h1 class="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
        {org?.name || 'Republic Health System'}
        <span class="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          <ShieldCheck class="h-3 w-3 text-emerald-600" />
          PIC Registered
        </span>
      </h1>
      <p class="text-[11px] text-slate-500 font-mono">
        {org?.industry || 'Healthcare & Medical Services'} • {org?.city || 'Metro Manila'}, Philippines
      </p>
    </div>
  </div>

  <!-- Right: Registered DPO Badge -->
  <div class="flex items-center gap-3 pl-4 border-l border-slate-200">
    <div class="text-right">
      <p class="text-xs font-semibold text-slate-800">{org?.dpo_name || 'Designated DPO'}</p>
      <p class="text-[11px] text-slate-500 font-mono">{org?.dpo_email || 'dpo@organization.ph'}</p>
    </div>
    <div class="h-8 w-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
      <User class="h-4 w-4" />
    </div>
  </div>
</header>
