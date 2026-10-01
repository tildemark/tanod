<script lang="ts">
  import { onMount } from 'svelte';
  import { listIncidents, createIncident, updateIncident, deleteIncident } from '$lib/api/enforcement';
  import { getOrganization } from '$lib/api/admin';
  import type { Incident, CreateIncidentPayload, UpdateIncidentPayload } from '$lib/types/enforcement';
  import type { Organization } from '$lib/types/organization';
  import {
    Clock,
    ShieldAlert,
    AlertTriangle,
    Plus,
    X,
    Check,
    FileSpreadsheet,
    Mail,
    Trash2,
    Edit3,
    Calendar,
    Users,
    HardDrive,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Download,
    Info
  } from 'lucide-svelte';

  let incidents = $state<Incident[]>([]);
  let isLoading = $state(true);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let orgId = $state('');

  // Clock Ticker for 72h Countdowns
  let now = $state(Date.now());
  onMount(() => {
    const timer = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(timer);
  });

  // Modal State
  let isCreateModalOpen = $state(false);
  let editingIncident = $state<Incident | null>(null);

  // Form Fields
  let title = $state('');
  let incidentDate = $state(new Date().toISOString().slice(0, 10));
  let severity = $state<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  let impactedIndividuals = $state<number | ''>('');
  let systemsAffected = $state('');
  let description = $state('');
  let measuresTaken = $state('');
  let isNotifiableBreach = $state(false);
  let modalError = $state<string | null>(null);
  let deletingIncident = $state<Incident | null>(null);

  async function loadData() {
    try {
      isLoading = true;
      const orgData = await getOrganization();
      orgId = orgData.id;
      org = orgData;
      incidents = await listIncidents(orgData.id);
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to load incidents.' };
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  // Calculate Remaining 72-Hour Time for each incident
  function getTimerDetails(deadlineIso: string, npcNotified: boolean) {
    if (npcNotified) {
      return { text: 'NPC Notified', isCritical: false, isWarning: false, isDone: true };
    }
    const diffMs = new Date(deadlineIso).getTime() - now;
    if (diffMs <= 0) {
      return { text: 'EXPIRED - Statutory Default!', isCritical: true, isWarning: false, isDone: false };
    }
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (hours < 24) {
      return { text: `${formatted} Remaining`, isCritical: true, isWarning: false, isDone: false };
    } else if (hours < 48) {
      return { text: `${formatted} Remaining`, isCritical: false, isWarning: true, isDone: false };
    } else {
      return { text: `${formatted} Remaining`, isCritical: false, isWarning: false, isDone: false };
    }
  }

  function openCreateModal() {
    editingIncident = null;
    title = '';
    incidentDate = new Date().toISOString().slice(0, 10);
    severity = 'MEDIUM';
    impactedIndividuals = '';
    systemsAffected = '';
    description = '';
    measuresTaken = '';
    isNotifiableBreach = false;
    modalError = null;
    isCreateModalOpen = true;
  }

  function openEditModal(inc: Incident) {
    editingIncident = inc;
    title = inc.title;
    incidentDate = inc.incident_date.slice(0, 10);
    severity = inc.severity;
    impactedIndividuals = inc.impacted_individuals ?? '';
    systemsAffected = inc.systems_affected || '';
    description = inc.description || '';
    measuresTaken = inc.measures_taken || '';
    isNotifiableBreach = inc.is_notifiable_breach;
    modalError = null;
    isCreateModalOpen = true;
  }

  async function handleSaveIncident() {
    if (!title.trim()) {
      modalError = 'Incident title is required.';
      return;
    }

    try {
      if (editingIncident) {
        await updateIncident(editingIncident.id, {
          title: title.trim(),
          incident_date: incidentDate,
          severity,
          impacted_individuals: impactedIndividuals === '' ? undefined : Number(impactedIndividuals),
          systems_affected: systemsAffected.trim() || undefined,
          description: description.trim() || undefined,
          measures_taken: measuresTaken.trim() || undefined,
          is_notifiable_breach: isNotifiableBreach,
          npc_notified: editingIncident.npc_notified,
          npc_notification_date: editingIncident.npc_notification_date || undefined,
          status: editingIncident.status as any,
          asir_reported: editingIncident.asir_reported,
        });
        statusMessage = { type: 'success', text: 'Incident updated successfully.' };
      } else {
        await createIncident({
          org_id: orgId,
          title: title.trim(),
          incident_date: incidentDate,
          severity,
          impacted_individuals: impactedIndividuals === '' ? undefined : Number(impactedIndividuals),
          systems_affected: systemsAffected.trim() || undefined,
          description: description.trim() || undefined,
          measures_taken: measuresTaken.trim() || undefined,
          is_notifiable_breach: isNotifiableBreach,
        });
        statusMessage = { type: 'success', text: 'Security incident logged. 72-Hour statutory clock activated.' };
      }
      isCreateModalOpen = false;
      await loadData();
    } catch (e: any) {
      modalError = e?.toString() || 'Failed to record incident.';
    }
  }

  async function toggleNpcNotified(inc: Incident) {
    try {
      await updateIncident(inc.id, {
        title: inc.title,
        incident_date: inc.incident_date,
        severity: inc.severity,
        impacted_individuals: inc.impacted_individuals ?? undefined,
        systems_affected: inc.systems_affected || undefined,
        description: inc.description || undefined,
        measures_taken: inc.measures_taken || undefined,
        is_notifiable_breach: inc.is_notifiable_breach,
        npc_notified: !inc.npc_notified,
        npc_notification_date: !inc.npc_notified ? new Date().toISOString() : undefined,
        status: !inc.npc_notified ? 'NOTIFYING' : 'ASSESSING',
        asir_reported: inc.asir_reported,
      });
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to update NPC status.' };
    }
  }

  async function confirmDelete() {
    if (!deletingIncident) return;
    try {
      await deleteIncident(deletingIncident.id);
      statusMessage = { type: 'success', text: 'Incident record removed.' };
      deletingIncident = null;
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to delete incident.' };
    }
  }

  // ─── ASIR WIZARD STATE ─────────────────────────────────────────────────────
  let isAsirWizardOpen = $state(false);
  let asirStep = $state(1); // 1 = summary, 2 = AIC breakdown, 3 = attack vectors, 4 = review
  let asirYear = $state(new Date().getFullYear() - 1); // ASIR covers prior calendar year

  // Step 1: Incident Counts (pre-computed + editable)
  let asirMandatoryCount = $state(0);
  let asirVoluntaryCount = $state(0);
  let asirOtherCount = $state(0);

  // Step 2: AIC Impact Classification
  let asirAvailabilityCount = $state(0);
  let asirIntegrityCount = $state(0);
  let asirConfidentialityCount = $state(0);

  // Step 3: Attack Vectors
  let asirTheft = $state(0);
  let asirUnauthorizedAccess = $state(0);
  let asirHackingMalware = $state(0);
  let asirPhishing = $state(0);
  let asirInsiderThreat = $state(0);
  let asirPhysicalLoss = $state(0);
  let asirSystemError = $state(0);
  let asirOtherVector = $state(0);

  // Step 4: Certifier
  let asirCertifierName = $state('');
  let asirCertifierTitle = $state('');

  function openAsirWizard() {
    // Pre-populate from existing incident data
    const yearStart = new Date(`${asirYear}-01-01`).getTime();
    const yearEnd = new Date(`${asirYear}-12-31T23:59:59`).getTime();
    const yearIncidents = incidents.filter((i) => {
      const d = new Date(i.incident_date).getTime();
      return d >= yearStart && d <= yearEnd;
    });

    asirMandatoryCount = yearIncidents.filter((i) => i.is_notifiable_breach && i.npc_notified).length;
    asirVoluntaryCount = yearIncidents.filter((i) => i.is_notifiable_breach && !i.npc_notified).length;
    asirOtherCount = yearIncidents.filter((i) => !i.is_notifiable_breach).length;

    const total = yearIncidents.length;
    asirAvailabilityCount = 0;
    asirIntegrityCount = 0;
    asirConfidentialityCount = total; // default: most incidents affect confidentiality

    asirTheft = 0;
    asirUnauthorizedAccess = 0;
    asirHackingMalware = 0;
    asirPhishing = 0;
    asirInsiderThreat = 0;
    asirPhysicalLoss = 0;
    asirSystemError = 0;
    asirOtherVector = total;

    asirStep = 1;
    isAsirWizardOpen = true;
  }

  function exportAsirReport() {
    const totalIncidents = asirMandatoryCount + asirVoluntaryCount + asirOtherCount;
    const rows: string[][] = [];

    // Report Header
    rows.push(['ANNUAL SECURITY INCIDENT REPORT (ASIR)', '', '', '']);
    rows.push([`Reporting Year: ${asirYear}`, '', '', '']);
    rows.push([`Organization: ${org?.name || 'N/A'}`, '', '', '']);
    rows.push([`City/Municipality: ${org?.city || 'N/A'}`, '', '', '']);
    rows.push([`Entity Type: ${org?.entity_type || 'PIC'}`, '', '', '']);
    rows.push([`NPC Registration No.: ${org?.npc_registration_number || 'N/A'}`, '', '', '']);
    rows.push(['', '', '', '']);

    // Section 1: Incident Summary
    rows.push(['SECTION 1: INCIDENT SUMMARY', '', '', '']);
    rows.push(['Category', 'Count', '', '']);
    rows.push(['Mandatory Breach Notifications (NPC Circular 16-03)', String(asirMandatoryCount), '', '']);
    rows.push(['Voluntary Breach Notifications', String(asirVoluntaryCount), '', '']);
    rows.push(['Other Security Incidents (Non-breach)', String(asirOtherCount), '', '']);
    rows.push(['TOTAL SECURITY INCIDENTS', String(totalIncidents), '', '']);
    rows.push(['', '', '', '']);

    // Section 2: AIC Impact
    rows.push(['SECTION 2: IMPACT CLASSIFICATION (AIC)', '', '', '']);
    rows.push(['Type', 'Count', '', '']);
    rows.push(['Availability Incidents', String(asirAvailabilityCount), '', '']);
    rows.push(['Integrity Incidents', String(asirIntegrityCount), '', '']);
    rows.push(['Confidentiality Incidents', String(asirConfidentialityCount), '', '']);
    rows.push(['', '', '', '']);

    // Section 3: Attack Vectors
    rows.push(['SECTION 3: ATTACK VECTOR BREAKDOWN', '', '', '']);
    rows.push(['Vector', 'Count', '', '']);
    rows.push(['Theft (Physical Device/Media)', String(asirTheft), '', '']);
    rows.push(['Unauthorized Access', String(asirUnauthorizedAccess), '', '']);
    rows.push(['Hacking / Malware', String(asirHackingMalware), '', '']);
    rows.push(['Phishing / Social Engineering', String(asirPhishing), '', '']);
    rows.push(['Insider Threat / Misuse', String(asirInsiderThreat), '', '']);
    rows.push(['Physical Loss / Damage', String(asirPhysicalLoss), '', '']);
    rows.push(['System Error / Technical Failure', String(asirSystemError), '', '']);
    rows.push(['Other', String(asirOtherVector), '', '']);
    rows.push(['', '', '', '']);

    // Section 4: Incident Registry
    rows.push(['SECTION 4: INCIDENT REGISTRY (Source Data)', '', '', '']);
    rows.push(['ID', 'Title', 'Occurrence Date', 'Severity', 'Impacted Individuals', 'Notifiable', 'NPC Notified', 'Status']);
    const yearStart = new Date(`${asirYear}-01-01`).getTime();
    const yearEnd = new Date(`${asirYear}-12-31T23:59:59`).getTime();
    const yearIncidents = incidents.filter((i) => {
      const d = new Date(i.incident_date).getTime();
      return d >= yearStart && d <= yearEnd;
    });
    for (const i of yearIncidents) {
      rows.push([
        i.id,
        `"${i.title.replace(/"/g, '""')}"`,
        i.incident_date,
        i.severity,
        String(i.impacted_individuals || 0),
        i.is_notifiable_breach ? 'YES' : 'NO',
        i.npc_notified ? 'YES' : 'NO',
        i.status
      ]);
    }
    rows.push(['', '', '', '']);

    // Certification
    rows.push(['CERTIFICATION', '', '', '']);
    rows.push(['Certified by:', asirCertifierName || '___________________________', '', '']);
    rows.push(['Designation:', asirCertifierTitle || '___________________________', '', '']);
    rows.push(['Date:', new Date().toLocaleDateString('en-PH'), '', '']);

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TANOD-ASIR-${asirYear}-${(org?.name ?? 'Report').replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    isAsirWizardOpen = false;
  }

  // Keep reference to org for ASIR export
  let org = $state<Organization | null>(null);

  function exportAsirPdf() {
    const totalIncidents = asirMandatoryCount + asirVoluntaryCount + asirOtherCount;
    const yearStart = new Date(`${asirYear}-01-01`).getTime();
    const yearEnd = new Date(`${asirYear}-12-31T23:59:59`).getTime();
    const yearIncidents = incidents.filter(i => {
      const d = new Date(i.incident_date).getTime();
      return d >= yearStart && d <= yearEnd;
    });

    const incidentRows = yearIncidents.map(i => `
      <tr>
        <td>${i.incident_date}</td>
        <td>${i.title}</td>
        <td><span class="sev-${i.severity.toLowerCase()}">${i.severity}</span></td>
        <td>${i.impacted_individuals || 0}</td>
        <td>${i.is_notifiable_breach ? 'YES' : 'NO'}</td>
        <td>${i.npc_notified ? 'YES' : 'NO'}</td>
        <td>${i.status}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>ASIR ${asirYear} — ${org?.name || 'Organization'}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 24px; }
  h1 { font-size: 14pt; margin-bottom: 2px; }
  h2 { font-size: 11pt; background: #1e293b; color: #fff; padding: 6px 10px; margin: 18px 0 8px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9pt; }
  th { background: #f1f5f9; text-align: left; padding: 5px 8px; border: 1px solid #cbd5e1; }
  td { padding: 4px 8px; border: 1px solid #e2e8f0; }
  .meta { color: #475569; font-size: 9pt; margin-bottom: 16px; }
  .sev-critical { color: #dc2626; font-weight: bold; }
  .sev-high { color: #ea580c; font-weight: bold; }
  .sev-medium { color: #d97706; }
  .sev-low { color: #64748b; }
  .cert { margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
  .cert-row { display: flex; gap: 40px; margin-top: 12px; }
  .cert-field { flex: 1; border-bottom: 1px solid #94a3b8; padding-bottom: 2px; min-height: 24px; font-size: 9pt; }
  .cert-label { font-size: 8pt; color: #64748b; margin-top: 3px; }
  @media print { @page { size: A4; margin: 18mm 18mm 18mm 18mm; } }
</style>
</head><body>
<h1>Annual Security Incident Report (ASIR)</h1>
<div class="meta">
  <strong>Reporting Year:</strong> ${asirYear} &nbsp;|&nbsp;
  <strong>Organization:</strong> ${org?.name || 'N/A'} &nbsp;|&nbsp;
  <strong>Entity Type:</strong> ${org?.entity_type || 'PIC'} &nbsp;|&nbsp;
  <strong>NPC Reg. No.:</strong> ${org?.npc_registration_number || 'N/A'}<br/>
  <strong>City/Municipality:</strong> ${org?.city || 'N/A'} &nbsp;|&nbsp;
  <strong>Date Generated:</strong> ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>
<h2>Section 1: Incident Summary</h2>
<table><tr><th>Category</th><th>Count</th></tr>
  <tr><td>Mandatory Breach Notifications (NPC Circular 16-03)</td><td>${asirMandatoryCount}</td></tr>
  <tr><td>Voluntary Breach Notifications</td><td>${asirVoluntaryCount}</td></tr>
  <tr><td>Other Security Incidents (Non-breach)</td><td>${asirOtherCount}</td></tr>
  <tr><td><strong>TOTAL</strong></td><td><strong>${totalIncidents}</strong></td></tr>
</table>
<h2>Section 2: Impact Classification (AIC)</h2>
<table><tr><th>Type</th><th>Count</th></tr>
  <tr><td>Availability Incidents</td><td>${asirAvailabilityCount}</td></tr>
  <tr><td>Integrity Incidents</td><td>${asirIntegrityCount}</td></tr>
  <tr><td>Confidentiality Incidents</td><td>${asirConfidentialityCount}</td></tr>
</table>
<h2>Section 3: Attack Vector Breakdown</h2>
<table><tr><th>Vector</th><th>Count</th></tr>
  <tr><td>Theft (Physical Device/Media)</td><td>${asirTheft}</td></tr>
  <tr><td>Unauthorized Access</td><td>${asirUnauthorizedAccess}</td></tr>
  <tr><td>Hacking / Malware</td><td>${asirHackingMalware}</td></tr>
  <tr><td>Phishing / Social Engineering</td><td>${asirPhishing}</td></tr>
  <tr><td>Insider Threat / Misuse</td><td>${asirInsiderThreat}</td></tr>
  <tr><td>Physical Loss / Damage</td><td>${asirPhysicalLoss}</td></tr>
  <tr><td>System Error / Technical Failure</td><td>${asirSystemError}</td></tr>
  <tr><td>Other</td><td>${asirOtherVector}</td></tr>
</table>
<h2>Section 4: Incident Registry</h2>
<table><tr><th>Date</th><th>Title</th><th>Severity</th><th>Impacted</th><th>Notifiable</th><th>NPC Notified</th><th>Status</th></tr>
  ${incidentRows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No incidents for reporting year</td></tr>'}
</table>
<div class="cert">
  <strong>CERTIFICATION</strong>
  <div class="cert-row">
    <div><div class="cert-field">${asirCertifierName || ''}</div><div class="cert-label">Certified by (Name)</div></div>
    <div><div class="cert-field">${asirCertifierTitle || ''}</div><div class="cert-label">Designation</div></div>
    <div><div class="cert-field">${new Date().toLocaleDateString('en-PH')}</div><div class="cert-label">Date</div></div>
  </div>
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
    }
    isAsirWizardOpen = false;
  }

</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between border-b border-slate-200 pb-5">
    <div>
      <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <Clock class="h-6 w-6 text-slate-700" />
        72-Hour Statutory Breach Monitor & ASIR Aggregator
      </h2>
      <p class="text-xs text-slate-500 mt-1">
        Enforces mandatory 72-hour regulatory notification timelines under NPC Circular 16-03 and auto-compiles the Annual Security Incident Report (ASIR).
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={openAsirWizard}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-all cursor-pointer shadow-2xs"
      >
        <FileSpreadsheet class="h-3.5 w-3.5 text-emerald-600" />
        <span>Generate Annual ASIR</span>
      </button>

      <button
        onclick={openCreateModal}
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs"
      >
        <Plus class="h-4 w-4" />
        <span>Log Security Incident</span>
      </button>
    </div>
  </div>

  <!-- Status Alert -->
  {#if statusMessage}
    <div class="p-3 rounded-lg border text-xs flex items-center gap-2 {statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}">
      {#if statusMessage.type === 'success'}
        <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600" />
      {:else}
        <AlertCircle class="h-4 w-4 shrink-0 text-rose-600" />
      {/if}
      <span>{statusMessage.text}</span>
    </div>
  {/if}

  <!-- Active 72h Countdown Alert Banner (if any unnotified notifiable breach) -->
  {#each incidents.filter(i => i.is_notifiable_breach && !i.npc_notified) as urgent}
    {@const timer = getTimerDetails(urgent.breach_timer_deadline, urgent.npc_notified)}
    <div class="p-5 rounded-2xl border-2 flex items-center justify-between gap-4 animate-pulse {timer.isCritical ? 'bg-rose-50 border-rose-500 text-rose-950' : 'bg-amber-50 border-amber-500 text-amber-950'}">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-5 w-5 {timer.isCritical ? 'text-rose-600' : 'text-amber-600'}" />
          <h3 class="text-sm font-bold uppercase tracking-wider">
            Mandatory NPC Notification Countdown Active (Circular 16-03 Sec. 18)
          </h3>
        </div>
        <p class="text-xs">
          Breach: <strong class="font-bold">{urgent.title}</strong> • Discovered: {new Date(urgent.discovered_date).toLocaleString()}
        </p>
      </div>

      <div class="text-right shrink-0">
        <div class="text-2xl font-mono font-black tracking-tight {timer.isCritical ? 'text-rose-700' : 'text-amber-700'}">
          {timer.text}
        </div>
        <button
          onclick={() => toggleNpcNotified(urgent)}
          class="mt-1 text-xs font-semibold px-3 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          Mark NPC as Notified
        </button>
      </div>
    </div>
  {/each}

  <!-- Incidents Registry Table -->
  <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
          <tr>
            <th class="px-5 py-3.5">Security Event / Incident</th>
            <th class="px-5 py-3.5">Severity</th>
            <th class="px-5 py-3.5">Impacted Scope</th>
            <th class="px-5 py-3.5 text-center">72-Hour Regulatory Timer</th>
            <th class="px-5 py-3.5 text-center">NPC Notification Status</th>
            <th class="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each incidents as inc}
            {@const timer = getTimerDetails(inc.breach_timer_deadline, inc.npc_notified)}
            <tr class="hover:bg-slate-50/70 transition-colors">
              <!-- Event & Occurrence -->
              <td class="px-5 py-4 max-w-sm space-y-1">
                <span class="font-bold text-slate-900 block">{inc.title}</span>
                <span class="text-[11px] text-slate-500 font-mono">
                  Occurred: {inc.incident_date} • Discovered: {new Date(inc.discovered_date).toLocaleDateString()}
                </span>
                {#if inc.description}
                  <p class="text-[11px] text-slate-500 line-clamp-1">{inc.description}</p>
                {/if}
              </td>

              <!-- Severity -->
              <td class="px-5 py-4">
                <span class="inline-flex text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border {
                  inc.severity === 'CRITICAL' || inc.severity === 'HIGH'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : inc.severity === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }">
                  {inc.severity}
                </span>
              </td>

              <!-- Scope -->
              <td class="px-5 py-4 text-[11px] text-slate-600 space-y-0.5">
                <div><strong>Individuals:</strong> {inc.impacted_individuals ? inc.impacted_individuals.toLocaleString() : 'Undetermined'}</div>
                {#if inc.systems_affected}
                  <div class="text-[10px] text-slate-400 font-mono truncate max-w-xs">{inc.systems_affected}</div>
                {/if}
              </td>

              <!-- 72h Timer -->
              <td class="px-5 py-4 text-center">
                {#if inc.is_notifiable_breach}
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border {
                    timer.isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : timer.isCritical
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }">
                    <Clock class="h-3 w-3" />
                    <span>{timer.text}</span>
                  </div>
                {:else}
                  <span class="text-[11px] text-slate-400 font-mono">Non-Notifiable</span>
                {/if}
              </td>

              <!-- NPC Notification Status -->
              <td class="px-5 py-4 text-center">
                <button
                  type="button"
                  onclick={() => toggleNpcNotified(inc)}
                  class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all cursor-pointer {
                    inc.npc_notified
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }"
                >
                  {#if inc.npc_notified}
                    <Check class="h-3.5 w-3.5 text-emerald-600" />
                    <span>Notified ({inc.npc_notification_date ? new Date(inc.npc_notification_date).toLocaleDateString() : 'Done'})</span>
                  {:else}
                    <span>Pending Notification</span>
                  {/if}
                </button>
              </td>

              <!-- Actions -->
              <td class="px-5 py-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    onclick={() => openEditModal(inc)}
                    class="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Edit Record"
                  >
                    <Edit3 class="h-4 w-4" />
                  </button>
                  <button
                    onclick={() => (deletingIncident = inc)}
                    class="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Incident"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="6" class="px-6 py-12 text-center text-xs text-slate-400 space-y-1">
                {#if isLoading}
                  Loading incident logs from local database...
                {:else}
                  <p class="font-semibold text-slate-600">No security incidents logged.</p>
                  <p>All clean. Click "Log Security Incident" if a suspected breach or event occurs.</p>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Log / Edit Incident Modal -->
{#if isCreateModalOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">
          {editingIncident ? 'Edit Incident Record' : 'Log New Security Event / Breach'}
        </h3>
        <button onclick={() => (isCreateModalOpen = false)} class="text-slate-400 hover:text-slate-700">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        {#if modalError}
          <div class="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {modalError}
          </div>
        {/if}

        <div>
          <label for="inc_title" class="block text-xs font-semibold text-slate-700 mb-1">Incident Headline *</label>
          <input
            id="inc_title"
            type="text"
            bind:value={title}
            required
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="e.g. Unauthorized workstation access & patient roster export"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="inc_date" class="block text-xs font-semibold text-slate-700 mb-1">Occurrence Date *</label>
            <input
              id="inc_date"
              type="date"
              bind:value={incidentDate}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label for="inc_sev" class="block text-xs font-semibold text-slate-700 mb-1">Severity Assessment *</label>
            <select
              id="inc_sev"
              bind:value={severity}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-semibold"
            >
              <option value="LOW">Low (Minor Glitch)</option>
              <option value="MEDIUM">Medium (Local Containment)</option>
              <option value="HIGH">High (Sensitive Info Exposed)</option>
              <option value="CRITICAL">Critical (Large-scale Breach)</option>
            </select>
          </div>
        </div>

        <div class="p-3 rounded-xl border border-amber-300 bg-amber-50/70 space-y-1">
          <div class="flex items-center gap-2">
            <input
              id="inc_notifiable"
              type="checkbox"
              bind:checked={isNotifiableBreach}
              class="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-600"
            />
            <label for="inc_notifiable" class="text-xs font-bold text-amber-950 cursor-pointer">
              Mandatory Notifiable Breach (NPC Circular 16-03)
            </label>
          </div>
          <p class="text-[10px] text-amber-900 leading-relaxed pl-6">
            Check if sensitive personal information (SPI) or financial data has been compromised and poses a real risk to data subjects. This activates the 72-hour countdown clock.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="inc_individuals" class="block text-xs font-semibold text-slate-700 mb-1">Estimated Individuals Affected</label>
            <input
              id="inc_individuals"
              type="number"
              bind:value={impactedIndividuals}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white"
              placeholder="e.g. 250"
            />
          </div>

          <div>
            <label for="inc_systems" class="block text-xs font-semibold text-slate-700 mb-1">Systems / Assets Affected</label>
            <input
              id="inc_systems"
              type="text"
              bind:value={systemsAffected}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white"
              placeholder="e.g. MySQL Server #2, HRIS Portal"
            />
          </div>
        </div>

        <div>
          <label for="inc_desc" class="block text-xs font-semibold text-slate-700 mb-1">Incident Summary & Narrative</label>
          <textarea
            id="inc_desc"
            bind:value={description}
            rows={3}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white"
            placeholder="Circumstances of discovery, vectors utilized, and initial impact."
          ></textarea>
        </div>

        <div>
          <label for="inc_measures" class="block text-xs font-semibold text-slate-700 mb-1">Containment & Remedial Measures Taken</label>
          <textarea
            id="inc_measures"
            bind:value={measuresTaken}
            rows={2}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white"
            placeholder="Account revocations, patch deployments, and data subject advisories."
          ></textarea>
        </div>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button
          onclick={() => (isCreateModalOpen = false)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveIncident}
          class="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          {editingIncident ? 'Update Incident' : 'Record Incident'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingIncident}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-rose-100 bg-rose-50 flex items-center gap-2 text-rose-800">
        <AlertCircle class="h-4 w-4" />
        <h3 class="text-sm font-bold">Remove Incident Record</h3>
      </div>

      <div class="p-6 space-y-2">
        <p class="text-xs text-slate-600">
          Are you sure you want to remove <strong class="text-slate-900 font-semibold">{deletingIncident.title}</strong>?
        </p>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button
          onclick={() => (deletingIncident = null)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={confirmDelete}
          class="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          Delete Record
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ─────────────────────────────────────────────────────────────────────────
     ASIR WIZARD MODAL
───────────────────────────────────────────────────────────────────────────── -->
{#if isAsirWizardOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">

      <!-- Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-700 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet class="h-4 w-4" />
            Annual Security Incident Report (ASIR) Wizard
          </h3>
          <p class="text-[11px] text-emerald-100 mt-0.5">NPC DBNMS-Aligned · Reporting Year {asirYear}</p>
        </div>
        <button onclick={() => (isAsirWizardOpen = false)} class="text-white/70 hover:text-white">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Step Indicators -->
      <div class="flex border-b border-slate-200 bg-slate-50 text-[11px] font-semibold">
        {#each ['Incident Counts', 'AIC Impact', 'Attack Vectors', 'Review & Export'] as label, i}
          <div class="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-r border-slate-200 last:border-r-0 {
            asirStep === i + 1
              ? 'bg-white text-emerald-700 border-b-2 border-b-emerald-600'
              : asirStep > i + 1
              ? 'text-emerald-600'
              : 'text-slate-400'
          }">
            <span class="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold border {
              asirStep > i + 1 ? 'bg-emerald-600 border-emerald-600 text-white' :
              asirStep === i + 1 ? 'border-emerald-600 text-emerald-700' : 'border-slate-300 text-slate-400'
            }">{asirStep > i + 1 ? '✓' : i + 1}</span>
            <span class="hidden sm:inline">{label}</span>
          </div>
        {/each}
      </div>

      <!-- Step Content -->
      <div class="p-6 overflow-y-auto max-h-[55vh]">

        <!-- Step 1: Reporting Year + Incident Counts -->
        {#if asirStep === 1}
          <div class="space-y-5">
            <div class="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex gap-2">
              <Info class="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <p>Counts below are pre-computed from your incident registry for the selected year. Adjust as needed to match your actual DBNMS submission.</p>
            </div>

            <div>
              <label for="asir_year" class="block text-xs font-bold text-slate-700 mb-1">Reporting Year</label>
              <input
                id="asir_year"
                type="number"
                bind:value={asirYear}
                min="2012"
                max={new Date().getFullYear()}
                onchange={openAsirWizard}
                class="w-32 text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-mono"
              />
              <p class="text-[11px] text-slate-500 mt-1">ASIR covers the prior calendar year (January 1 – December 31).</p>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="p-4 rounded-xl border border-rose-200 bg-rose-50">
                <p class="text-[10px] font-bold uppercase tracking-wide text-rose-700 mb-2">Mandatory Notifications</p>
                <input type="number" bind:value={asirMandatoryCount} min="0"
                  class="w-full text-lg font-mono font-bold text-rose-900 bg-transparent border-b-2 border-rose-300 focus:outline-none focus:border-rose-600" />
                <p class="text-[10px] text-rose-600 mt-1">Breaches reported within 72 hrs (Cir. 16-03)</p>
              </div>
              <div class="p-4 rounded-xl border border-amber-200 bg-amber-50">
                <p class="text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-2">Voluntary Notifications</p>
                <input type="number" bind:value={asirVoluntaryCount} min="0"
                  class="w-full text-lg font-mono font-bold text-amber-900 bg-transparent border-b-2 border-amber-300 focus:outline-none focus:border-amber-600" />
                <p class="text-[10px] text-amber-600 mt-1">Breaches not meeting mandatory threshold</p>
              </div>
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <p class="text-[10px] font-bold uppercase tracking-wide text-slate-600 mb-2">Other Incidents</p>
                <input type="number" bind:value={asirOtherCount} min="0"
                  class="w-full text-lg font-mono font-bold text-slate-800 bg-transparent border-b-2 border-slate-300 focus:outline-none focus:border-slate-600" />
                <p class="text-[10px] text-slate-500 mt-1">Security events not involving personal data</p>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-center font-mono text-slate-700">
              Total Incidents: <span class="font-black text-slate-900">{asirMandatoryCount + asirVoluntaryCount + asirOtherCount}</span>
            </div>
          </div>

        <!-- Step 2: AIC Impact Classification -->
        {:else if asirStep === 2}
          <div class="space-y-5">
            <div class="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex gap-2">
              <Info class="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <p>Classify each incident by its effect on the <strong>Availability, Integrity, and Confidentiality</strong> of personal data. Incidents may affect multiple categories — enter the count for each separately.</p>
            </div>

            <div class="space-y-4">
              <div class="flex items-center gap-4 p-4 rounded-xl border border-purple-200 bg-purple-50">
                <div class="flex-1">
                  <p class="text-xs font-bold text-purple-900">Availability Incidents</p>
                  <p class="text-[11px] text-purple-700 mt-0.5">System outages, ransomware locking data, DDoS — personal data was inaccessible.</p>
                </div>
                <input type="number" bind:value={asirAvailabilityCount} min="0"
                  class="w-20 text-center text-sm font-mono font-bold text-purple-900 px-2 py-1.5 rounded-lg border border-purple-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>

              <div class="flex items-center gap-4 p-4 rounded-xl border border-orange-200 bg-orange-50">
                <div class="flex-1">
                  <p class="text-xs font-bold text-orange-900">Integrity Incidents</p>
                  <p class="text-[11px] text-orange-700 mt-0.5">Data was altered, tampered with, or corrupted — accuracy of personal information compromised.</p>
                </div>
                <input type="number" bind:value={asirIntegrityCount} min="0"
                  class="w-20 text-center text-sm font-mono font-bold text-orange-900 px-2 py-1.5 rounded-lg border border-orange-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div class="flex items-center gap-4 p-4 rounded-xl border border-rose-200 bg-rose-50">
                <div class="flex-1">
                  <p class="text-xs font-bold text-rose-900">Confidentiality Incidents</p>
                  <p class="text-[11px] text-rose-700 mt-0.5">Unauthorized disclosure, data leaks, exfiltration — personal data was accessed or acquired without authorization.</p>
                </div>
                <input type="number" bind:value={asirConfidentialityCount} min="0"
                  class="w-20 text-center text-sm font-mono font-bold text-rose-900 px-2 py-1.5 rounded-lg border border-rose-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500" />
              </div>
            </div>
          </div>

        <!-- Step 3: Attack Vectors -->
        {:else if asirStep === 3}
          <div class="space-y-4">
            <div class="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex gap-2">
              <Info class="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <p>Enter how many incidents were caused by each attack vector. Enter <strong>0</strong> for categories with no incidents. The DBNMS requires this breakdown even if all fields are zero.</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Theft (Physical Device / Storage Media)</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Stolen laptops, USB drives, printed records</p>
                </div>
                <input type="number" bind:value={asirTheft} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Unauthorized Access / Intrusion</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Credential compromise, privilege escalation</p>
                </div>
                <input type="number" bind:value={asirUnauthorizedAccess} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Hacking / Malware / Ransomware</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Cyberattacks, malicious code injection</p>
                </div>
                <input type="number" bind:value={asirHackingMalware} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Phishing / Social Engineering</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Email phishing, pretexting, vishing</p>
                </div>
                <input type="number" bind:value={asirPhishing} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Insider Threat / Unauthorized Disclosure</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Employee misuse, deliberate leaks</p>
                </div>
                <input type="number" bind:value={asirInsiderThreat} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Physical Loss / Accidental Damage</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Lost devices, fire, flooding</p>
                </div>
                <input type="number" bind:value={asirPhysicalLoss} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">System Error / Technical Failure</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Misconfigurations, software bugs, accidental exposure</p>
                </div>
                <input type="number" bind:value={asirSystemError} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-800 leading-tight">Other / Unclassified</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">Incidents that do not fit above categories</p>
                </div>
                <input type="number" bind:value={asirOtherVector} min="0"
                  class="w-16 text-center text-sm font-mono font-bold text-slate-900 px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 shrink-0" />
              </div>
            </div>
          </div>

        <!-- Step 4: Review & Export -->
        {:else if asirStep === 4}
          <div class="space-y-5">
            <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex gap-2">
              <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <p>Review your ASIR summary. Provide the certifying officer's name and title, then click <strong>Export ASIR</strong> to generate the CSV for NPC DBNMS submission.</p>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-3 gap-3 text-center text-xs">
              <div class="p-3 rounded-xl border border-rose-200 bg-rose-50">
                <p class="text-[10px] font-bold text-rose-700 uppercase mb-1">Mandatory</p>
                <p class="text-2xl font-black font-mono text-rose-900">{asirMandatoryCount}</p>
              </div>
              <div class="p-3 rounded-xl border border-amber-200 bg-amber-50">
                <p class="text-[10px] font-bold text-amber-700 uppercase mb-1">Voluntary</p>
                <p class="text-2xl font-black font-mono text-amber-900">{asirVoluntaryCount}</p>
              </div>
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <p class="text-[10px] font-bold text-slate-600 uppercase mb-1">Other</p>
                <p class="text-2xl font-black font-mono text-slate-900">{asirOtherCount}</p>
              </div>
            </div>

            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <p class="font-bold text-slate-700 text-[10px] uppercase tracking-wide">AIC Impact & Attack Vectors</p>
              <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-mono">
                <span class="text-slate-500">Availability:</span><span class="font-bold text-slate-800">{asirAvailabilityCount}</span>
                <span class="text-slate-500">Integrity:</span><span class="font-bold text-slate-800">{asirIntegrityCount}</span>
                <span class="text-slate-500">Confidentiality:</span><span class="font-bold text-slate-800">{asirConfidentialityCount}</span>
                <span class="text-slate-500">Theft:</span><span class="font-bold text-slate-800">{asirTheft}</span>
                <span class="text-slate-500">Unauthorized Access:</span><span class="font-bold text-slate-800">{asirUnauthorizedAccess}</span>
                <span class="text-slate-500">Hacking/Malware:</span><span class="font-bold text-slate-800">{asirHackingMalware}</span>
                <span class="text-slate-500">Phishing:</span><span class="font-bold text-slate-800">{asirPhishing}</span>
                <span class="text-slate-500">Insider Threat:</span><span class="font-bold text-slate-800">{asirInsiderThreat}</span>
                <span class="text-slate-500">Physical Loss:</span><span class="font-bold text-slate-800">{asirPhysicalLoss}</span>
                <span class="text-slate-500">System Error:</span><span class="font-bold text-slate-800">{asirSystemError}</span>
                <span class="text-slate-500">Other Vectors:</span><span class="font-bold text-slate-800">{asirOtherVector}</span>
              </div>
            </div>

            <!-- Certifier -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="asir_cert_name" class="block text-xs font-bold text-slate-700 mb-1">Certifying Officer – Full Name</label>
                <input id="asir_cert_name" type="text" bind:value={asirCertifierName}
                  class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="e.g. Maria D. Santos" />
              </div>
              <div>
                <label for="asir_cert_title" class="block text-xs font-bold text-slate-700 mb-1">Designation / Title</label>
                <input id="asir_cert_title" type="text" bind:value={asirCertifierTitle}
                  class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="e.g. Data Protection Officer" />
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Nav -->
      <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <button
          onclick={() => asirStep > 1 ? asirStep-- : (isAsirWizardOpen = false)}
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          {asirStep === 1 ? 'Cancel' : 'Back'}
        </button>

        <span class="text-[11px] font-mono text-slate-400">Step {asirStep} of 4</span>

        {#if asirStep < 4}
          <button
            onclick={() => asirStep++}
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            Next
            <ChevronRight class="h-3.5 w-3.5" />
          </button>
        {:else}
          <div class="flex items-center gap-2">
            <button
              onclick={exportAsirReport}
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Download class="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onclick={exportAsirPdf}
              class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet class="h-3.5 w-3.5" />
              Export PDF Report
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
