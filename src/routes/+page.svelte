<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrganization, listDepartments } from '$lib/api/admin';
  import type { Organization, Department } from '$lib/types/organization';
  import {
    FolderLock,
    ShieldAlert,
    Clock,
    UserCheck,
    ArrowUpRight,
    Building2,
    ShieldCheck,
    AlertTriangle,
    Calendar,
    Award,
    FileSpreadsheet,
    Copy,
    Check
  } from 'lucide-svelte';

  let org = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);

  // Countdowns
  let renewalDays = $state<number | null>(null);
  let asirDays = $state<number | null>(null);
  let renewalStatus = $state<{ text: string; color: string }>({ text: 'Calculating...', color: 'text-slate-500' });
  let asirStatus = $state<{ text: string; color: string }>({ text: 'Calculating...', color: 'text-slate-500' });

  function calculateDaysLeft(targetDateStr?: string | null): number | null {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr);
    const now = new Date();
    // Reset time part
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  onMount(async () => {
    try {
      const [fetchedOrg, fetchedDepts] = await Promise.all([
        getOrganization(),
        listDepartments('')
      ]);
      org = fetchedOrg;
      departments = fetchedDepts;

      // Calculate NPCRS Annual Renewal Countdown
      const rDays = calculateDaysLeft(fetchedOrg.renewal_deadline);
      renewalDays = rDays;
      if (rDays === null) {
        renewalStatus = { text: 'Date Not Configured', color: 'text-slate-500' };
      } else if (rDays < 0) {
        renewalStatus = { text: `Overdue by ${Math.abs(rDays)} days!`, color: 'text-rose-600 bg-rose-50 border-rose-200' };
      } else if (rDays <= 30) {
        renewalStatus = { text: `${rDays} Days Left (Urgent)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      } else {
        renewalStatus = { text: `${rDays} Days Remaining`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      }

      // Calculate Annual ASIR Report Countdown (mandated by March 31)
      const aDays = calculateDaysLeft(fetchedOrg.asir_due_date || '2027-03-31');
      asirDays = aDays;
      if (aDays === null) {
        asirStatus = { text: 'Not Configured', color: 'text-slate-500' };
      } else if (aDays < 0) {
        asirStatus = { text: `Overdue by ${Math.abs(aDays)} days!`, color: 'text-rose-600 bg-rose-50 border-rose-200' };
      } else if (aDays <= 45) {
        asirStatus = { text: `${aDays} Days (Due March 31)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      } else {
        asirStatus = { text: `${aDays} Days (Due March 31)`, color: 'text-slate-700 bg-slate-100 border-slate-200' };
      }

    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  });
</script>

<div class="space-y-8">
  <!-- Executive Welcome Banner -->
  <div class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-8 text-white shadow-md relative overflow-hidden">
    <div class="relative z-10 max-w-2xl space-y-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
        <ShieldCheck class="h-3.5 w-3.5" />
        <span>Philippine DPA (RA 10173) & NPC Circular 2022-04 Compliance</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
        {org?.name || 'Republic Health System'}
        {#if org?.has_npc_seal}
          <span class="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
            <Award class="h-3.5 w-3.5 text-emerald-400" />
            NPC Seal Awarded
          </span>
        {/if}
      </h1>
      <p class="text-xs text-slate-300 leading-relaxed">
        Offline local workspace active. Head of Organization: <strong>{org?.head_name || 'Designated Head'}</strong> ({org?.head_title || 'CEO'}). Primary DPO: <strong>{org?.dpo_name || 'Designated DPO'}</strong>.
      </p>
    </div>

    <!-- Background Emblem Accent -->
    <div class="absolute -right-6 -bottom-6 w-48 h-48 opacity-10 pointer-events-none">
      <img src="/favicon.svg" alt="Emblem" class="w-full h-full object-contain" />
    </div>
  </div>

  <!-- Statutory Regulatory Clocks Row (NPC Deadlines) -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
    
    <!-- Clock 1: NPCRS Annual Renewal Countdown -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">NPCRS Annual Renewal</span>
        <Calendar class="h-4 w-4 text-amber-600" />
      </div>
      <div class="text-xs font-bold font-mono px-2.5 py-1.5 rounded-md border inline-block {renewalStatus.color}">
        {renewalStatus.text}
      </div>
      <p class="text-[11px] text-slate-400 mt-2">
        Deadline: {org?.renewal_deadline || 'Set in Settings'}
      </p>
    </div>

    <!-- Clock 2: ASIR Submission (Annual Security Incident Report) -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Annual ASIR Report</span>
        <FileSpreadsheet class="h-4 w-4 text-slate-700" />
      </div>
      <div class="text-xs font-bold font-mono px-2.5 py-1.5 rounded-md border inline-block {asirStatus.color}">
        {asirStatus.text}
      </div>
      <p class="text-[11px] text-slate-400 mt-2">
        Mandatory filing due March 31 annually
      </p>
    </div>

    <!-- Clock 3: 72-Hour Breach Alert Status -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Breach Incident Alert</span>
        <Clock class="h-4 w-4 text-emerald-600" />
      </div>
      <div class="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 inline-block">
        CLEAN / NO ACTIVE BREACH
      </div>
      <p class="text-[11px] text-slate-400 mt-2">72-Hour statutory countdown inactive</p>
    </div>

    <!-- Clock 4: Active ROPA Entries -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2">
        <span class="text-xs font-semibold">Active ROPA Records</span>
        <FolderLock class="h-4 w-4 text-blue-600" />
      </div>
      <div class="text-2xl font-bold text-slate-900 font-mono">
        {departments.reduce((acc, d) => acc + d.process_count, 0)}
      </div>
      <p class="text-[11px] text-slate-400 mt-1">Across {departments.length} registered divisions</p>
    </div>
  </div>

  <!-- Statutory Compliance Guide & Quick Action Banners -->
  <div class="bg-amber-500/10 border border-amber-500/25 rounded-xl p-5 flex items-center justify-between">
    <div class="space-y-1">
      <h3 class="text-xs font-bold text-amber-950 flex items-center gap-1.5">
        <Award class="h-4 w-4 text-amber-600" />
        Filing with the National Privacy Commission (NPCRS Portal)?
      </h3>
      <p class="text-xs text-amber-900 leading-relaxed max-w-3xl">
        Need to submit your DPO renewal, DPS registration, or ASIR report? Open the <strong>NPCRS Portal Helper</strong> in Settings to easily copy-paste your verified statutory details into <span class="font-mono text-amber-950 font-semibold">npcregistration.privacy.gov.ph</span>.
      </p>
    </div>

    <a
      href="/settings"
      class="shrink-0 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all shadow-xs"
    >
      Open NPCRS Helper
    </a>
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
        <h3 class="text-sm font-bold text-slate-900">NPCRS & Governance Team</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          Maintain Head of Organization credentials, designate the primary DPO and branch COPs, and track renewal timers.
        </p>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
        <span>Manage Settings</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>
  </div>
</div>
