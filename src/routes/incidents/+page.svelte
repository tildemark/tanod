<script lang="ts">
  import { onMount } from 'svelte';
  import { listIncidents, createIncident, updateIncident, deleteIncident } from '$lib/api/enforcement';
  import { getOrganization } from '$lib/api/admin';
  import type { Incident, CreateIncidentPayload, UpdateIncidentPayload } from '$lib/types/enforcement';
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
    CheckCircle2
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
      const org = await getOrganization();
      orgId = org.id;
      incidents = await listIncidents(org.id);
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

  function exportAsirCsv() {
    if (incidents.length === 0) return;
    const headers = [
      'Incident ID',
      'Event Title',
      'Occurrence Date',
      'Discovered Date',
      'Severity',
      'Impacted Individuals',
      'Systems Affected',
      'Notifiable Breach (NPC Cir. 16-03)',
      'NPC Notified',
      'Notification Date',
      'Resolution Status'
    ];

    const rows = incidents.map((i) => [
      `"${i.id}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.incident_date}"`,
      `"${i.discovered_date}"`,
      `"${i.severity}"`,
      `"${i.impacted_individuals || 0}"`,
      `"${(i.systems_affected || '').replace(/"/g, '""')}"`,
      `"${i.is_notifiable_breach ? 'YES' : 'NO'}"`,
      `"${i.npc_notified ? 'YES' : 'NO'}"`,
      `"${i.npc_notification_date || 'N/A'}"`,
      `"${i.status}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tanod-asir-report-${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="max-w-7xl mx-auto space-y-6">
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
        onclick={exportAsirCsv}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
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
