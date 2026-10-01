<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrganization, listDepartments } from '$lib/api/admin';
  import { listIncidents, listDsrRequests, listDpoMemos } from '$lib/api/enforcement';
  import { listPiaAssessments } from '$lib/api/pia';
  import { listProcesses } from '$lib/api/ropa';
  import { listStatutoryDocuments } from '$lib/api/vault';
  import { listDataSharingAgreements } from '$lib/api/dsa';
  import type { Organization, Department } from '$lib/types/organization';
  import type { Incident, DsrRequest, DpoMemo } from '$lib/types/enforcement';
  import type { PiaAssessment } from '$lib/types/pia';
  import type { Process } from '$lib/types/ropa';
  import type { StatutoryDocument } from '$lib/types/vault';
  import type { DataSharingAgreement } from '$lib/types/dsa';
  import {
    FolderLock, ShieldAlert, Clock, UserCheck, ArrowUpRight,
    Building2, ShieldCheck, Calendar, Award, FileSpreadsheet,
    Users, TrendingUp, CheckCircle2, AlertCircle, XCircle,
    Activity, BarChart3, Zap, FileText, Check, AlertTriangle
  } from 'lucide-svelte';

  let org = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let incidents = $state<Incident[]>([]);
  let dsrRequests = $state<DsrRequest[]>([]);
  let piaAssessments = $state<PiaAssessment[]>([]);
  let processes = $state<Process[]>([]);
  let vaultDocuments = $state<StatutoryDocument[]>([]);
  let dsaAgreements = $state<DataSharingAgreement[]>([]);
  let policies = $state<DpoMemo[]>([]);
  let isLoading = $state(true);

  let renewalStatus = $state<{ text: string; color: string }>({ text: 'Calculating...', color: 'text-slate-500' });
  let asirStatus = $state<{ text: string; color: string }>({ text: 'Calculating...', color: 'text-slate-500' });

  function calculateDaysLeft(d?: string | null): number | null {
    if (!d) return null;
    const t = new Date(d); const n = new Date();
    t.setHours(0,0,0,0); n.setHours(0,0,0,0);
    return Math.ceil((t.getTime() - n.getTime()) / 86400000);
  }

  let totalIncidents = $derived(incidents.length);
  let openBreaches = $derived(incidents.filter(i => i.is_notifiable_breach && !i.npc_notified).length);
  let criticalIncidents = $derived(incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length);
  let openDsrs = $derived(dsrRequests.filter(d => d.status === 'RECEIVED' || d.status === 'UNDER_REVIEW').length);
  let overdueDsrs = $derived(dsrRequests.filter(d => {
    const sla = new Date(d.sla_deadline);
    return (d.status === 'RECEIVED' || d.status === 'UNDER_REVIEW') && sla < new Date();
  }));
  let highRiskPias = $derived(piaAssessments.filter(p => p.risk_level === 'HIGH'));
  let ropaCount = $derived(processes.length);

  let severityBreakdown = $derived({
    CRITICAL: incidents.filter(i => i.severity === 'CRITICAL').length,
    HIGH: incidents.filter(i => i.severity === 'HIGH').length,
    MEDIUM: incidents.filter(i => i.severity === 'MEDIUM').length,
    LOW: incidents.filter(i => i.severity === 'LOW').length,
  });

  function getMonthlyIncidents() {
    const result: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const yr = d.getFullYear(), mo = d.getMonth();
      result.push({
        label: d.toLocaleString('en', { month: 'short' }),
        count: incidents.filter(inc => {
          const id = new Date(inc.incident_date);
          return id.getFullYear() === yr && id.getMonth() === mo;
        }).length
      });
    }
    return result;
  }
  let monthlyIncidents = $derived(getMonthlyIncidents());
  let monthlyMax = $derived(Math.max(1, ...monthlyIncidents.map(m => m.count)));

  let complianceScore = $derived(() => {
    let s = 100;
    if (openBreaches > 0) s -= openBreaches * 15;
    if (overdueDsrs.length > 0) s -= overdueDsrs.length * 10;
    if (highRiskPias.length > 0) s -= 10;
    if (!org?.npc_registration_number) s -= 15;
    if (ropaCount === 0) s -= 15;
    // Factor in lacking renewal documents (up to -15 points for missing docs)
    const missingDocsCount = docStat.missingCount;
    if (missingDocsCount > 0) {
      s -= Math.min(15, missingDocsCount * 3);
    }
    // Deduct if no approved Privacy Manual (NPC Advisory 2017-01)
    const hasApprovedManual = policies.some(p => p.policy_category === 'PRIVACY_MANUAL' && p.status === 'APPROVED');
    if (!hasApprovedManual) s -= 10;
    return Math.max(0, Math.min(100, s));
  });

  let scoreColor = $derived(() => {
    const s = complianceScore();
    if (s >= 80) return { ring: '#16a34a', text: 'text-emerald-400', label: 'Healthy' };
    if (s >= 50) return { ring: '#d97706', text: 'text-amber-400', label: 'Needs Attention' };
    return { ring: '#dc2626', text: 'text-rose-400', label: 'At Risk' };
  });

  let actionItems = $derived(() => {
    const items: { severity: 'critical' | 'warning' | 'info'; text: string; link: string }[] = [];
    for (const b of incidents.filter(i => i.is_notifiable_breach && !i.npc_notified)) {
      const hoursLeft = Math.max(0, Math.floor((new Date(b.breach_timer_deadline).getTime() - Date.now()) / 3600000));
      items.push({ severity: hoursLeft < 24 ? 'critical' : 'warning', text: `Breach "${b.title}" — ${hoursLeft}h left to notify NPC`, link: '/incidents' });
    }
    for (const d of overdueDsrs) items.push({ severity: 'critical', text: `DSR overdue: ${d.request_type} from ${d.requester_name}`, link: '/dsr' });
    
    // Add missing renewal documents alert
    if (docStat.missingCount > 0) {
      items.push({
        severity: docStat.missingCount >= 4 ? 'critical' : 'warning',
        text: `Statutory Vault: ${docStat.missingCount} of ${docStat.totalCount} mandatory renewal documents missing`,
        link: '/npc-registration'
      });
    }

    // Check Data Privacy Manual (NPC Advisory 2017-01)
    const approvedManual = policies.find(p => p.policy_category === 'PRIVACY_MANUAL' && p.status === 'APPROVED');
    if (!approvedManual) {
      const draftManual = policies.find(p => p.policy_category === 'PRIVACY_MANUAL');
      items.push({
        severity: 'warning',
        text: draftManual 
          ? `Data Privacy Manual (NPC Adv. 2017-01) is currently in ${draftManual.status} status — approval needed` 
          : 'Data Privacy Manual (NPC Adv. 2017-01) is missing — formulate and approve institutional manual',
        link: '/memos'
      });
    }

    // Add Expired or Expiring DSA alerts
    const expiredDsas = dsaAgreements.filter(d => d.status === 'EXPIRED');
    for (const d of expiredDsas) {
      items.push({
        severity: 'critical',
        text: `Data Sharing Agreement with "${d.counterparty_name}" is EXPIRED (${d.expiration_date})`,
        link: '/dsa'
      });
    }
    const expiringDsas = dsaAgreements.filter(d => d.status === 'EXPIRING');
    for (const d of expiringDsas) {
      items.push({
        severity: 'warning',
        text: `Data Sharing Agreement with "${d.counterparty_name}" expires soon (${d.expiration_date})`,
        link: '/dsa'
      });
    }

    for (const p of highRiskPias) items.push({ severity: 'warning', text: `High-risk PIA: "${p.process_title || 'Unnamed'}" — mitigation required`, link: '/pia' });
    if (!org?.npc_registration_number) items.push({ severity: 'warning', text: 'NPC Registration Number not configured in Settings', link: '/settings' });
    if (ropaCount === 0) items.push({ severity: 'info', text: 'No processing activities in ROPA registry yet', link: '/ropa' });
    if (piaAssessments.length === 0 && ropaCount > 0) items.push({ severity: 'info', text: `${ropaCount} ROPA process(es) have no PIA conducted`, link: '/pia' });
    return items;
  });

  const CIRCUMFERENCE = 2 * Math.PI * 36;
  function buildDonut(data: { value: number; color: string }[]) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return [];
    let cum = 0;
    return data.map(d => {
      const frac = d.value / total;
      const offset = CIRCUMFERENCE - cum * CIRCUMFERENCE;
      cum += frac;
      return { ...d, dasharray: `${frac * CIRCUMFERENCE} ${CIRCUMFERENCE}`, offset };
    });
  }
  let severitySegments = $derived(buildDonut([
    { value: severityBreakdown.CRITICAL, color: '#dc2626' },
    { value: severityBreakdown.HIGH, color: '#ea580c' },
    { value: severityBreakdown.MEDIUM, color: '#d97706' },
    { value: severityBreakdown.LOW, color: '#64748b' },
  ]));

  function pct(v: number, t: number) { return t === 0 ? 0 : Math.round((v / t) * 100); }

  let currentYear = new Date().getFullYear();

  // 7 Statutory Filing & Renewal Documents Checklist
  const RENEWAL_DOC_REQS = [
    { id: 'NOTARIZED_DPO_FORM', label: 'Notarized DPO / COP Form', check: (docs: StatutoryDocument[]) => docs.some(d => d.year === currentYear && d.category === 'NOTARIZED_DPO_FORM') },
    { id: 'SEC_GIS', label: 'SEC General Information Sheet (GIS)', check: (docs: StatutoryDocument[]) => docs.some(d => d.year === currentYear && d.category === 'SEC_GIS') },
    { id: 'SECRETARY_CERTIFICATE', label: "Corporate Secretary's Certificate", check: (docs: StatutoryDocument[]) => docs.some(d => d.category === 'SECRETARY_CERTIFICATE' || d.category === 'BOARD_RESOLUTION') },
    { id: 'NPC_REGISTRATION_CERT', label: 'NPC Certificate of Registration', check: (docs: StatutoryDocument[]) => docs.some(d => d.category === 'NPC_REGISTRATION_CERT') },
    { id: 'NPC_SEAL_OF_REGISTRATION', label: 'Official NPC Seal of Registration', check: (docs: StatutoryDocument[]) => docs.some(d => d.category === 'NPC_SEAL_OF_REGISTRATION') },
    { id: 'BUSINESS_PERMIT', label: 'Current LGU Business Permit', check: (docs: StatutoryDocument[]) => docs.some(d => d.year === currentYear && d.category === 'OTHER_COMPLIANCE' && d.title.toLowerCase().includes('permit')) },
    { id: 'ASIR_PROOF', label: 'Annual Security Incident Report (ASIR)', check: (docs: StatutoryDocument[]) => docs.some(d => d.year === currentYear && d.category === 'OTHER_COMPLIANCE' && d.title.toLowerCase().includes('asir')) },
  ];

  let docStat = $derived.by(() => {
    const list = RENEWAL_DOC_REQS.map(req => {
      const isCompliant = req.check(vaultDocuments);
      return {
        id: req.id,
        label: req.label,
        isCompliant
      };
    });
    const completeCount = list.filter(item => item.isCompliant).length;
    const totalCount = list.length;
    const missingItems = list.filter(item => !item.isCompliant);
    return {
      list,
      completeCount,
      totalCount,
      missingCount: totalCount - completeCount,
      isAllComplete: completeCount === totalCount,
      missingItems
    };
  });

  onMount(async () => {
    try {
      const fetchedOrg = await getOrganization();
      org = fetchedOrg;

      const [fetchedDepts, fetchedInc, fetchedDsrs, fetchedPias, fetchedProc, fetchedDocs, fetchedDsas, fetchedMemos] = await Promise.all([
        listDepartments(''), listIncidents(''),
        listDsrRequests(''), listPiaAssessments(''), listProcesses(''),
        listStatutoryDocuments(fetchedOrg.id).catch(() => []),
        listDataSharingAgreements(fetchedOrg.id).catch(() => []),
        listDpoMemos().catch(() => [])
      ]);
      departments = fetchedDepts; incidents = fetchedInc;
      dsrRequests = fetchedDsrs; piaAssessments = fetchedPias; processes = fetchedProc;
      vaultDocuments = fetchedDocs;
      dsaAgreements = fetchedDsas;
      policies = fetchedMemos;

      const rDays = calculateDaysLeft(fetchedOrg.renewal_deadline);
      if (rDays === null) renewalStatus = { text: 'Date Not Configured', color: 'text-slate-500' };
      else if (rDays < 0) renewalStatus = { text: `Overdue by ${Math.abs(rDays)} days!`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      else if (rDays <= 30) renewalStatus = { text: `${rDays} Days Left (Urgent)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      else renewalStatus = { text: `${rDays} Days Remaining`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };

      const aDays = calculateDaysLeft(fetchedOrg.asir_due_date || '2027-03-31');
      if (aDays === null) asirStatus = { text: 'Not Configured', color: 'text-slate-500' };
      else if (aDays < 0) asirStatus = { text: `Overdue by ${Math.abs(aDays)} days!`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      else if (aDays <= 45) asirStatus = { text: `${aDays} Days (Due March 31)`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      else asirStatus = { text: `${aDays} Days Remaining`, color: 'text-slate-700 bg-slate-100 border-slate-200' };
    } catch (e) { console.error('Dashboard load error', e); }
    finally { isLoading = false; }
  });
</script>

<div class="space-y-6">

  <!-- Executive Banner + Compliance Gauge -->
  <div class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-7 text-white shadow-md relative overflow-hidden">
    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div class="space-y-2 max-w-xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <ShieldCheck class="h-3.5 w-3.5" />
          <span>Philippine DPA (RA 10173) · NPC Circular 2022-04</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          {org?.name || 'Privacy Command Center'}
          {#if org?.has_npc_seal}
            <span class="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Award class="h-3.5 w-3.5 text-emerald-400" /> NPC Seal Awarded
            </span>
          {/if}
        </h1>
        <p class="text-xs text-slate-300 leading-relaxed">
          Head: <strong>{org?.head_name || '—'}</strong> · DPO: <strong>{org?.dpo_name || '—'}</strong> ·
          Reg: <span class="font-mono">{org?.npc_registration_number || 'Not set'}</span>
        </p>
      </div>
      <div class="shrink-0 flex flex-col items-center" style="position:relative;width:96px;">
        <svg width="96" height="96" viewBox="0 0 90 90" style="transform:rotate(-90deg);">
          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="9" />
          <circle cx="45" cy="45" r="36" fill="none" stroke={scoreColor().ring}
            stroke-width="9" stroke-linecap="round"
            stroke-dasharray="{(complianceScore() / 100) * CIRCUMFERENCE} {CIRCUMFERENCE}"
            class="transition-all duration-700" />
        </svg>
        <div style="position:absolute;top:30px;left:50%;transform:translateX(-50%);text-align:center;width:60px;">
          <p class="text-2xl font-black text-white leading-none">{complianceScore()}</p>
          <p class="text-[9px] text-slate-400 font-mono uppercase tracking-wide">Score</p>
        </div>
        <p class="text-[11px] font-semibold {scoreColor().text}" style="margin-top:6px;">{scoreColor().label}</p>
      </div>
    </div>
    <div class="absolute -right-6 -bottom-6 w-44 h-44 opacity-[0.06] pointer-events-none">
      <img src="/favicon.svg" alt="" class="w-full h-full object-contain" />
    </div>
  </div>

  <!-- KPI Stats -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    {#each [
      { label: 'Security Incidents', value: totalIncidents, sub: `${criticalIncidents} high/critical`, color: 'text-rose-600', bg: 'bg-rose-50', bdr: 'border-rose-200', icon: ShieldAlert, link: '/incidents' },
      { label: 'Open DSR Requests', value: openDsrs, sub: `${overdueDsrs.length} past SLA`, color: 'text-blue-600', bg: 'bg-blue-50', bdr: 'border-blue-200', icon: UserCheck, link: '/dsr' },
      { label: 'ROPA Processes', value: ropaCount, sub: `${departments.length} dept(s) covered`, color: 'text-indigo-600', bg: 'bg-indigo-50', bdr: 'border-indigo-200', icon: FolderLock, link: '/ropa' },
      { label: 'PIA Assessments', value: piaAssessments.length, sub: `${highRiskPias.length} HIGH risk`, color: 'text-purple-600', bg: 'bg-purple-50', bdr: 'border-purple-200', icon: Activity, link: '/pia' },
    ] as s}
      <a href={s.link} class="group bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs transition-all hover:shadow-sm">
        <div class="flex items-start justify-between mb-2">
          <span class="text-xs font-semibold text-slate-500">{s.label}</span>
          <div class="p-1.5 rounded-lg {s.bg} border {s.bdr}">
            <svelte:component this={s.icon} class="h-3.5 w-3.5 {s.color}" />
          </div>
        </div>
        <p class="text-2xl font-black font-mono text-slate-900">{s.value}</p>
        <p class="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
      </a>
    {/each}
  </div>

  <!-- Action Items -->
  {#if actionItems().length > 0}
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Zap class="h-3.5 w-3.5 text-amber-500" />
        <span class="text-xs font-bold uppercase tracking-wider text-slate-700">Action Required — {actionItems().length} item(s)</span>
      </div>
      <div class="divide-y divide-slate-100">
        {#each actionItems() as item}
          <a href={item.link} class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors group">
            {#if item.severity === 'critical'}
              <XCircle class="h-4 w-4 shrink-0 text-rose-500" />
            {:else if item.severity === 'warning'}
              <AlertCircle class="h-4 w-4 shrink-0 text-amber-500" />
            {:else}
              <CheckCircle2 class="h-4 w-4 shrink-0 text-blue-400" />
            {/if}
            <span class="text-xs text-slate-700 flex-1">{item.text}</span>
            <ArrowUpRight class="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Regulatory Clocks & Statutory Compliance Readiness -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Card 1: Statutory Renewal Documents Readiness -->
    <div class="bg-white p-5 rounded-xl border {docStat.isAllComplete ? 'border-emerald-200 bg-emerald-50/20' : docStat.completeCount >= 4 ? 'border-amber-200 bg-amber-50/20' : 'border-rose-200 bg-rose-50/20'} shadow-2xs flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-slate-700">Renewal Documents</span>
          <FileText class="h-4 w-4 {docStat.isAllComplete ? 'text-emerald-600' : 'text-amber-600'}" />
        </div>
        
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-black font-mono {docStat.isAllComplete ? 'text-emerald-700' : docStat.completeCount >= 4 ? 'text-amber-700' : 'text-rose-700'}">
            {docStat.completeCount}/{docStat.totalCount}
          </span>
          <span class="text-xs font-semibold {docStat.isAllComplete ? 'text-emerald-600' : 'text-slate-500'}">
            {docStat.isAllComplete ? 'Audit-Ready' : 'Documents Ready'}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="w-full bg-slate-200/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 {docStat.isAllComplete ? 'bg-emerald-500' : docStat.completeCount >= 4 ? 'bg-amber-500' : 'bg-rose-500'}"
            style="width: {pct(docStat.completeCount, docStat.totalCount)}%"
          ></div>
        </div>

        {#if docStat.missingCount > 0}
          <div class="mt-2.5 space-y-1">
            <p class="text-[11px] font-bold text-amber-800 flex items-center gap-1">
              <span>⚠️ {docStat.missingCount} lacking for {currentYear}:</span>
            </p>
            <ul class="text-[10.5px] text-slate-600 space-y-0.5 max-h-16 overflow-y-auto pr-1">
              {#each docStat.missingItems.slice(0, 3) as item}
                <li class="truncate flex items-center gap-1">
                  <span class="text-rose-400 font-bold">•</span>
                  <span class="truncate">{item.label}</span>
                </li>
              {/each}
              {#if docStat.missingItems.length > 3}
                <li class="text-[10px] text-slate-400 italic">
                  +{docStat.missingItems.length - 3} more missing...
                </li>
              {/if}
            </ul>
          </div>
        {:else}
          <p class="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
            <Check class="h-3.5 w-3.5 stroke-[2.5]" /> All 7 statutory proofs archived!
          </p>
        {/if}
      </div>

      <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <a
          href="/npc-registration"
          class="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
        >
          <span>View Checklist</span>
          <ArrowUpRight class="h-3 w-3" />
        </a>
        <a
          href="/vault"
          class="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
        >
          Open Vault
        </a>
      </div>
    </div>

    <!-- Card 2: NPCRS Renewal Deadline -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold text-slate-600">NPCRS Annual Renewal</span>
          <Calendar class="h-4 w-4 text-amber-500" />
        </div>
        <div class="text-xs font-bold font-mono px-2.5 py-1.5 rounded-md border inline-block {renewalStatus.color}">{renewalStatus.text}</div>
        <p class="text-[11px] text-slate-400 mt-2">Deadline: {org?.renewal_deadline || 'Set in Settings'}</p>
      </div>
      <div class="mt-3 pt-2.5 border-t border-slate-100">
        <a href="/npc-registration" class="text-[11px] font-semibold text-amber-800 hover:underline flex items-center gap-1">
          <span>Manage Renewal</span>
          <ArrowUpRight class="h-3 w-3" />
        </a>
      </div>
    </div>

    <!-- Card 3: ASIR Filing Deadline -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold text-slate-600">ASIR Filing Deadline</span>
          <FileSpreadsheet class="h-4 w-4 text-slate-500" />
        </div>
        <div class="text-xs font-bold font-mono px-2.5 py-1.5 rounded-md border inline-block {asirStatus.color}">{asirStatus.text}</div>
        <p class="text-[11px] text-slate-400 mt-2">Annual Security Incident Report — March 31</p>
      </div>
      <div class="mt-3 pt-2.5 border-t border-slate-100">
        <a href="/incidents" class="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline">
          <span>Incident Registry</span>
          <ArrowUpRight class="h-3 w-3" />
        </a>
      </div>
    </div>

    <!-- Card 4: 72-Hour Breach Timer -->
    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-semibold text-slate-600">Active 72-Hour Breach Timer</span>
          <Clock class="h-4 w-4 {openBreaches > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}" />
        </div>
        {#if openBreaches > 0}
          <div class="text-xs font-bold font-mono px-2.5 py-1.5 rounded-md border inline-block text-rose-700 bg-rose-50 border-rose-200 animate-pulse">
            {openBreaches} ACTIVE BREACH{openBreaches > 1 ? 'ES' : ''}
          </div>
          <a href="/incidents" class="text-[11px] text-rose-600 font-semibold mt-2 block hover:underline">→ Respond now</a>
        {:else}
          <div class="text-xs font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 inline-block">CLEAN / NO ACTIVE BREACH</div>
          <p class="text-[11px] text-slate-400 mt-2">72-Hour statutory countdown inactive</p>
        {/if}
      </div>
      <div class="mt-3 pt-2.5 border-t border-slate-100">
        <a href="/incidents" class="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline">
          <span>View Breaches</span>
          <ArrowUpRight class="h-3 w-3" />
        </a>
      </div>
    </div>
  </div>

  <!-- Charts -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

    <!-- Severity Donut -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <BarChart3 class="h-3.5 w-3.5 text-rose-500" /> Incidents by Severity
      </h3>
      {#if totalIncidents === 0}
        <div class="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
          <ShieldCheck class="h-8 w-8 opacity-30" /><span>No incidents logged</span>
        </div>
      {:else}
        <div class="flex items-center gap-4">
          <div style="position:relative;width:100px;height:100px;flex-shrink:0;">
            <svg width="100" height="100" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="36" fill="none" stroke="#f1f5f9" stroke-width="14" />
              {#each severitySegments as seg}
                <circle cx="45" cy="45" r="36" fill="none" stroke={seg.color} stroke-width="14"
                  stroke-dasharray={seg.dasharray} stroke-dashoffset={seg.offset}
                  transform="rotate(-90 45 45)" class="transition-all duration-500" />
              {/each}
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <span class="text-lg font-black font-mono text-slate-900">{totalIncidents}</span>
              <span class="text-[9px] text-slate-400 font-mono uppercase">Total</span>
            </div>
          </div>
          <div class="flex-1 space-y-2">
            {#each [
              { label: 'Critical', val: severityBreakdown.CRITICAL, dot: 'bg-red-600' },
              { label: 'High', val: severityBreakdown.HIGH, dot: 'bg-orange-500' },
              { label: 'Medium', val: severityBreakdown.MEDIUM, dot: 'bg-amber-500' },
              { label: 'Low', val: severityBreakdown.LOW, dot: 'bg-slate-400' },
            ] as s}
              <div class="flex items-center gap-2 text-[11px]">
                <span class="w-2 h-2 rounded-full {s.dot} shrink-0"></span>
                <span class="text-slate-600 flex-1">{s.label}</span>
                <span class="font-mono font-bold text-slate-800">{s.val}</span>
                <span class="font-mono text-slate-400 w-7 text-right">{pct(s.val, totalIncidents)}%</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Monthly Bar Chart -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <TrendingUp class="h-3.5 w-3.5 text-blue-500" /> Incidents — Last 6 Months
      </h3>
      <div class="flex items-end gap-2" style="height:110px;">
        {#each monthlyIncidents as m}
          <div class="flex-1 flex flex-col items-center gap-1">
            <span class="text-[10px] font-mono text-slate-500" style="min-height:14px;">{m.count > 0 ? m.count : ''}</span>
            <div class="w-full rounded-t-md transition-all duration-500 {m.count === 0 ? 'bg-slate-100' : 'bg-blue-500 hover:bg-blue-400'}"
              style="height:{m.count === 0 ? 4 : Math.max(10, (m.count / monthlyMax) * 76)}px"
              title="{m.label}: {m.count}"></div>
            <span class="text-[10px] text-slate-400 font-mono">{m.label}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- DSR Types -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <Users class="h-3.5 w-3.5 text-indigo-500" /> DSR Requests by Type
      </h3>
      {#if dsrRequests.length === 0}
        <div class="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
          <CheckCircle2 class="h-8 w-8 opacity-30" /><span>No DSR requests logged</span>
        </div>
      {:else}
        <div class="space-y-2">
          {#each [
            { type: 'Access', bar: 'bg-blue-500' },
            { type: 'Erasure', bar: 'bg-rose-500' },
            { type: 'Rectification', bar: 'bg-amber-500' },
            { type: 'Portability', bar: 'bg-indigo-500' },
            { type: 'Objection', bar: 'bg-orange-500' },
          ] as t}
            {@const count = dsrRequests.filter(d => d.request_type === t.type).length}
            {#if count > 0}
              <div>
                <div class="flex justify-between text-[11px] mb-1">
                  <span class="text-slate-600">{t.type}</span>
                  <span class="font-mono font-bold text-slate-800">{count}</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="{t.bar} h-full rounded-full transition-all duration-500" style="width:{pct(count, dsrRequests.length)}%"></div>
                </div>
              </div>
            {/if}
          {/each}
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
          <div class="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center">
            <p class="font-black text-amber-800 font-mono">{openDsrs}</p><p class="text-amber-700">Open</p>
          </div>
          <div class="p-2 rounded-lg bg-rose-50 border border-rose-100 text-center">
            <p class="font-black text-rose-800 font-mono">{overdueDsrs.length}</p><p class="text-rose-700">Overdue</p>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- PIA Risk Distribution -->
  {#if piaAssessments.length > 0}
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
      <h3 class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <ShieldAlert class="h-3.5 w-3.5 text-purple-500" /> PIA Risk Distribution ({piaAssessments.length} Assessments)
      </h3>
      <div class="grid grid-cols-4 gap-3">
        {#each [
          { level: 'HIGH', label: 'High Risk', bar: 'bg-rose-600', text: 'text-rose-700', bg: 'bg-rose-50', bdr: 'border-rose-200' },
          { level: 'MEDIUM', label: 'Medium Risk', bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', bdr: 'border-amber-200' },
          { level: 'LOW', label: 'Low Risk', bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', bdr: 'border-blue-200' },
          { level: 'NEGLIGIBLE', label: 'Negligible', bar: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', bdr: 'border-slate-200' },
        ] as r}
          {@const count = piaAssessments.filter(p => p.risk_level === r.level).length}
          <div class="p-3.5 rounded-xl {r.bg} border {r.bdr} text-center">
            <p class="text-2xl font-black font-mono {r.text}">{count}</p>
            <p class="text-[11px] font-semibold {r.text} mt-0.5">{r.label}</p>
            <div class="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div class="{r.bar} h-full rounded-full" style="width:{pct(count, piaAssessments.length)}%"></div>
            </div>
            <p class="text-[10px] text-slate-400 mt-1 font-mono">{pct(count, piaAssessments.length)}%</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Quick Nav -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <a href="/ropa" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-400 shadow-2xs transition-all flex flex-col justify-between">
      <div class="space-y-2">
        <div class="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors"><FolderLock class="h-4 w-4" /></div>
        <h3 class="text-sm font-bold text-slate-900">Records of Processing (ROPA)</h3>
        <p class="text-xs text-slate-500">Document the 5 Statutory Pillars using the guided 4-step wizard.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
        <span>Open Registry · {ropaCount} entries</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>
    <a href="/pia" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-400 shadow-2xs transition-all flex flex-col justify-between">
      <div class="space-y-2">
        <div class="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition-colors"><ShieldAlert class="h-4 w-4" /></div>
        <h3 class="text-sm font-bold text-slate-900">NPC 4×4 Risk Matrix (PIA)</h3>
        <p class="text-xs text-slate-500">Automated risk ratings (1–16) and regulatory print dossiers.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-slate-900">
        <span>Launch Engine · {piaAssessments.length} assessed</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>
    <a href="/dsa" class="group bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-400 shadow-2xs transition-all flex flex-col justify-between">
      <div class="space-y-2">
        <div class="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-800 group-hover:bg-purple-900 group-hover:text-white transition-colors"><Users class="h-4 w-4" /></div>
        <h3 class="text-sm font-bold text-slate-900">Data Sharing & Vendors (DSA)</h3>
        <p class="text-xs text-slate-500">PIP outsourcing, contract expiration countdowns, and DPA Sec. 14 oversight.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700 group-hover:text-purple-900">
        <span>Manage Partners · {dsaAgreements.length} contracts</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>
    <a href="/npc-registration" class="group bg-amber-50 p-5 rounded-xl border border-amber-200 hover:border-amber-400 shadow-2xs transition-all flex flex-col justify-between">
      <div class="space-y-2">
        <div class="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 group-hover:bg-amber-800 group-hover:text-white transition-colors"><Building2 class="h-4 w-4" /></div>
        <h3 class="text-sm font-bold text-amber-950">NPCRS Portal & Renewal</h3>
        <p class="text-xs text-amber-900/70">Copy-paste companion, document checklist, and renewal readiness tracker.</p>
      </div>
      <div class="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs font-semibold text-amber-800 group-hover:text-amber-950">
        <span>Open Compliance Helper</span>
        <ArrowUpRight class="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </a>
  </div>
</div>
