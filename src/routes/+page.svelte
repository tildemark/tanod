<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrganization, listDepartments } from '$lib/api/admin';
  import type { Organization, Department } from '$lib/types/organization';
  import {
    FolderLock,
    ShieldAlert,
    Clock,
    UserCheck,
    FileText,
    ArrowUpRight,
    Building2,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle
  } from 'lucide-svelte';

  let org = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);

  onMount(async () => {
    try {
      const [fetchedOrg, fetchedDepts] = await Promise.all([
        getOrganization(),
        listDepartments('')
      ]);
      org = fetchedOrg;
      departments = fetchedDepts;
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  });
</script>

<div class="max-w-6xl mx-auto space-y-8">
  <!-- Executive Welcome Banner -->
  <div class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-8 text-white shadow-md relative overflow-hidden">
    <div class="relative z-10 max-w-2xl space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
        <ShieldCheck class="h-3.5 w-3.5" />
        <span>Philippine DPA (RA 10173) Compliance Posture</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white">
        {org?.name || 'Republic Health System'}
      </h1>
      <p class="text-xs text-slate-300 leading-relaxed">
        Offline local workspace active. All ROPA inventories, Privacy Impact Assessments, and Breach records are isolated on this device.
      </p>
    </div>

    <!-- Background Emblem Accent -->
    <div class="absolute -right-6 -bottom-6 w-48 h-48 opacity-10 pointer-events-none">
      <img src="/favicon.svg" alt="Emblem" class="w-full h-full object-contain" />
    </div>
  </div>

  <!-- Key Metrics Row -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Active ROPA Records</span>
        <FolderLock class="h-4 w-4 text-slate-700" />
      </div>
      <div class="text-2xl font-bold text-slate-900 font-mono">
        {departments.reduce((acc, d) => acc + d.process_count, 0)}
      </div>
      <p class="text-[11px] text-slate-400 mt-1">Across {departments.length} registered departments</p>
    </div>

    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Mandatory PIAs</span>
        <ShieldAlert class="h-4 w-4 text-amber-600" />
      </div>
      <div class="text-2xl font-bold text-slate-900 font-mono">
        0
      </div>
      <p class="text-[11px] text-slate-400 mt-1">4×4 Matrix risk assessments</p>
    </div>

    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Breach Incident Clock</span>
        <Clock class="h-4 w-4 text-emerald-600" />
      </div>
      <div class="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2 py-1 rounded inline-block">
        CLEAN / NO BREACH
      </div>
      <p class="text-[11px] text-slate-400 mt-2">72-Hour countdown inactive</p>
    </div>

    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Pending DSR Requests</span>
        <UserCheck class="h-4 w-4 text-blue-600" />
      </div>
      <div class="text-2xl font-bold text-slate-900 font-mono">
        0
      </div>
      <p class="text-[11px] text-slate-400 mt-1">30 working-day resolution clock</p>
    </div>
  </div>

  <!-- Compliance Module Shortcuts -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
    <a
      href="/ropa"
      class="group bg-white p-6 rounded-xl border border-slate-200 hover:border-slate-400 shadow-2xs transition-all flex flex-col justify-between"
    >
      <div class="space-y-2">
        <div class="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors">
          <FolderLock class="h-5 w-5" />
        </div>
        <h3 class="text-sm font-bold text-slate-900">Records of Processing (ROPA)</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Document the 5 Statutory Pillars (Subjects, Categories, Lawful Basis, Recipients, Retention) using the 4-step guided wizard.
        </p>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
        <span>Open Registry</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>

    <a
      href="/pia"
      class="group bg-white p-6 rounded-xl border border-slate-200 hover:border-slate-400 shadow-2xs transition-all flex flex-col justify-between"
    >
      <div class="space-y-2">
        <div class="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors">
          <ShieldAlert class="h-5 w-5" />
        </div>
        <h3 class="text-sm font-bold text-slate-900">Official NPC 4×4 Risk Matrix</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Conduct Privacy Impact Assessments with automated mathematical risk ratings (1–16) and generate regulatory print dossiers.
        </p>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
        <span>Launch Engine</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>

    <a
      href="/settings"
      class="group bg-white p-6 rounded-xl border border-slate-200 hover:border-slate-400 shadow-2xs transition-all flex flex-col justify-between"
    >
      <div class="space-y-2">
        <div class="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors">
          <Building2 class="h-5 w-5" />
        </div>
        <h3 class="text-sm font-bold text-slate-900">Entity & DPO Profile</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Maintain the 14 statutory PIC/PIP credentials, upload your corporate logo, and configure organizational divisions.
        </p>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
        <span>Manage Settings</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>
  </div>
</div>
