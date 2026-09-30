<script lang="ts">
  import { onMount } from 'svelte';
  import { listPiaAssessments, savePiaAssessment, deletePiaAssessment } from '$lib/api/pia';
  import { listProcesses } from '$lib/api/ropa';
  import { getOrganization } from '$lib/api/admin';
  import type { PiaAssessment, SavePiaPayload } from '$lib/types/pia';
  import type { Process } from '$lib/types/ropa';
  import PiaWizard from '$lib/components/pia/PiaWizard.svelte';
  import {
    ShieldAlert,
    Scale,
    Plus,
    Search,
    Shield,
    Trash2,
    Edit3,
    Printer,
    AlertCircle,
    CheckCircle2,
    Building2,
    Calendar,
    FileText,
    LayoutGrid,
    List,
    X
  } from 'lucide-svelte';

  let assessments = $state<PiaAssessment[]>([]);
  let processes = $state<Process[]>([]);
  let isLoading = $state(true);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Mode: 4x4 Risk Matrix Quadrant vs Detailed List
  let viewMode = $state<'quadrant' | 'list'>('quadrant');

  // Filter state
  let searchQuery = $state('');
  let riskLevelFilter = $state('ALL');

  // Wizard state
  let isWizardOpen = $state(false);
  let selectedProcess = $state<Process | null>(null);
  let editingAssessment = $state<PiaAssessment | null>(null);

  // Process Selector Modal
  let isProcessPickerOpen = $state(false);
  let deletingAssessment = $state<PiaAssessment | null>(null);

  async function loadData() {
    try {
      isLoading = true;
      const org = await getOrganization();
      const [fetchedAssessments, fetchedProcesses] = await Promise.all([
        listPiaAssessments(org.id),
        listProcesses(org.id)
      ]);
      assessments = fetchedAssessments;
      processes = fetchedProcesses;
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to load assessments.' };
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  let filteredAssessments = $derived(
    assessments.filter((a) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        (a.process_title && a.process_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.department_name && a.department_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.mitigation_solutions && a.mitigation_solutions.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRisk = riskLevelFilter === 'ALL' || a.risk_level === riskLevelFilter;
      return matchesSearch && matchesRisk;
    })
  );

  // ROPA processes that do not yet have a PIA assessment
  let pendingProcesses = $derived(
    processes.filter((p) => !assessments.some((a) => a.process_id === p.id))
  );

  function openCreateWizard(proc: Process) {
    selectedProcess = proc;
    editingAssessment = assessments.find((a) => a.process_id === proc.id) || null;
    isProcessPickerOpen = false;
    isWizardOpen = true;
  }

  function openEditWizard(assessment: PiaAssessment) {
    const proc = processes.find((p) => p.id === assessment.process_id) || {
      id: assessment.process_id,
      dept_id: '',
      department_name: assessment.department_name || '',
      title: assessment.process_title || 'Unknown Process',
      data_subjects: [],
      data_categories: [],
      lawful_basis: [],
      recipients: [],
      retention_period: '',
      status: 'APPROVED'
    };
    selectedProcess = proc;
    editingAssessment = assessment;
    isWizardOpen = true;
  }

  async function handleSaveAssessment(payload: SavePiaPayload) {
    try {
      await savePiaAssessment(payload);
      statusMessage = { type: 'success', text: 'Privacy Impact Assessment recorded successfully.' };
      isWizardOpen = false;
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to save PIA assessment.' };
    }
  }

  async function confirmDelete() {
    if (!deletingAssessment) return;
    try {
      await deletePiaAssessment(deletingAssessment.id);
      statusMessage = { type: 'success', text: 'PIA Assessment removed.' };
      deletingAssessment = null;
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to delete assessment.' };
    }
  }

  function handlePrintDossier(a: PiaAssessment) {
    window.print();
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between border-b border-slate-200 pb-5">
    <div>
      <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <Scale class="h-6 w-6 text-slate-700" />
        Privacy Impact Assessment (PIA) Engine
      </h2>
      <p class="text-xs text-slate-500 mt-1">
        Official 4×4 Risk Matrix evaluation adhering strictly to NPC Advisory No. 2017-03 and Circular 16-01 / 16-03 guidelines.
      </p>
    </div>

    <button
      onclick={() => (isProcessPickerOpen = true)}
      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs"
    >
      <Plus class="h-4 w-4" />
      <span>Conduct New Assessment</span>
    </button>
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

  <!-- Pending ROPA Activities Awaiting PIA Assessment Banner -->
  {#if pendingProcesses.length > 0}
    <div class="p-4.5 rounded-xl border border-amber-300 bg-amber-50/80 shadow-2xs space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <ShieldAlert class="h-4.5 w-4.5 text-amber-700 shrink-0" />
          <h3 class="text-xs font-bold text-amber-950 uppercase tracking-wider">
            {pendingProcesses.length} ROPA {pendingProcesses.length === 1 ? 'Activity' : 'Activities'} Awaiting Privacy Impact Assessment
          </h3>
        </div>
        <span class="text-[11px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
          NPC Advisory 2017-03 Compliance
        </span>
      </div>

      <p class="text-xs text-amber-900 leading-relaxed">
        The ROPA Registry documents your statutory processing activities. To place them onto the 4×4 Risk Matrix and calculate mathematical risk ratings (1–16), select an activity below to conduct its PIA:
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
        {#each pendingProcesses as proc}
          <div class="bg-white border border-amber-200/90 rounded-lg p-3 flex flex-col justify-between gap-2 shadow-2xs hover:border-amber-400 transition-all">
            <div>
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                  {proc.status}
                </span>
                <span class="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                  {proc.department_name || 'Organization'}
                </span>
              </div>
              <h4 class="text-xs font-bold text-slate-900 line-clamp-2">
                {proc.title}
              </h4>
            </div>

            <button
              type="button"
              onclick={() => openCreateWizard(proc)}
              class="w-full mt-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Scale class="h-3.5 w-3.5 text-amber-400" />
              <span>Assess in 4×4 Matrix</span>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 4x4 Scoring Summary Reference Strip -->
  <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-4 text-xs font-mono">
      <span class="font-bold text-slate-700">Official NPC 4×4 Scale:</span>
      <span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">1: Negligible</span>
      <span class="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">2–4: Low Risk</span>
      <span class="px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold">6–9: Medium Risk</span>
      <span class="px-2.5 py-1 rounded-md bg-rose-50 text-rose-900 border border-rose-200 font-semibold">10–16: High Risk</span>
    </div>

    <!-- Filter Dropdown & View Mode Switcher -->
    <div class="flex items-center gap-2">
      <!-- View Mode Buttons -->
      <div class="flex items-center p-0.5 rounded-lg border border-slate-300 bg-slate-100">
        <button
          type="button"
          onclick={() => (viewMode = 'quadrant')}
          class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all {viewMode === 'quadrant' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}"
          title="Interactive 4x4 Risk Matrix Quadrant (Gartner-style heat map)"
        >
          <LayoutGrid class="h-3.5 w-3.5" />
          <span>Matrix Quadrant</span>
        </button>
        <button
          type="button"
          onclick={() => (viewMode = 'list')}
          class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all {viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}"
          title="List of assessed processing activities"
        >
          <List class="h-3.5 w-3.5" />
          <span>List View</span>
        </button>
      </div>

      <div class="relative w-56">
        <Search class="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Filter assessments..."
          class="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
        />
      </div>

      <select
        bind:value={riskLevelFilter}
        class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white font-medium"
      >
        <option value="ALL">All Risk Levels</option>
        <option value="HIGH">High Risk (10–16)</option>
        <option value="MEDIUM">Medium Risk (6–9)</option>
        <option value="LOW">Low Risk (2–4)</option>
        <option value="NEGLIGIBLE">Negligible (1)</option>
      </select>
    </div>
  </div>

  <!-- GARTNER-STYLE 4×4 RISK MATRIX QUADRANT (NPC Advisory 17-03) -->
  {#if viewMode === 'quadrant'}
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid class="h-4 w-4 text-emerald-600" />
            <span>NPC 4×4 Risk Diagnostic Quadrant (Gartner-Style Heat Map)</span>
          </h3>
          <p class="text-[11px] text-slate-500 mt-0.5">
            Plotting Impact to Rights & Freedoms (Y-Axis) against Probability of Occurrence (X-Axis) per NPC Advisory 2017-03.
          </p>
        </div>
        <div class="flex items-center gap-3 text-xs font-mono">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span class="text-slate-600 text-[11px]">High (10-16)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
            <span class="text-slate-600 text-[11px]">Med (6-9)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
            <span class="text-slate-600 text-[11px]">Low (2-4)</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-blue-300"></span>
            <span class="text-slate-600 text-[11px]">Negligible (1)</span>
          </div>
        </div>
      </div>

      <!-- The 4x4 Grid Container -->
      <div class="flex gap-4">
        <!-- Y-Axis Label: Impact -->
        <div class="flex flex-col items-center justify-center shrink-0 w-8">
          <span class="-rotate-90 text-xs font-bold uppercase tracking-wider text-slate-600 font-mono whitespace-nowrap">
            Impact to Rights & Freedoms →
          </span>
        </div>

        <div class="flex-1 space-y-3">
          <!-- 4 Rows (Impact 4 down to 1) -->
          <div class="grid grid-cols-4 gap-2.5">
            {#each [4, 3, 2, 1] as imp}
              {#each [1, 2, 3, 4] as prob}
                {@const score = imp * prob}
                {@const cellRisk = score === 1 ? 'NEGLIGIBLE' : score <= 4 ? 'LOW' : score <= 9 ? 'MEDIUM' : 'HIGH'}
                {@const cellAssessments = filteredAssessments.filter(a => a.impact_score === imp && a.probability_score === prob)}
                <div
                  class="rounded-xl border p-2.5 min-h-[110px] flex flex-col justify-between transition-all {
                    cellRisk === 'HIGH'
                      ? 'bg-rose-50/70 border-rose-200/90 hover:bg-rose-100/70'
                      : cellRisk === 'MEDIUM'
                      ? 'bg-amber-50/70 border-amber-200/90 hover:bg-amber-100/70'
                      : cellRisk === 'LOW'
                      ? 'bg-emerald-50/70 border-emerald-200/90 hover:bg-emerald-100/70'
                      : 'bg-blue-50/70 border-blue-200/90 hover:bg-blue-100/70'
                  }"
                >
                  <!-- Cell Header: Coordinates & Score -->
                  <div class="flex items-center justify-between text-[10px] font-mono">
                    <span class="font-bold {
                      cellRisk === 'HIGH' ? 'text-rose-900' : cellRisk === 'MEDIUM' ? 'text-amber-900' : cellRisk === 'LOW' ? 'text-emerald-900' : 'text-blue-900'
                    }">
                      I:{imp} × P:{prob}
                    </span>
                    <span class="px-1.5 py-0.5 rounded font-bold {
                      cellRisk === 'HIGH' ? 'bg-rose-200/80 text-rose-900' : cellRisk === 'MEDIUM' ? 'bg-amber-200/80 text-amber-900' : cellRisk === 'LOW' ? 'bg-emerald-200/80 text-emerald-900' : 'bg-blue-200/80 text-blue-900'
                    }">
                      {score}
                    </span>
                  </div>

                  <!-- Plotted Processes in this Cell -->
                  <div class="space-y-1.5 my-1.5 max-h-24 overflow-y-auto">
                    {#if cellAssessments.length === 0}
                      <span class="text-[10px] text-slate-400 italic font-mono block text-center pt-2">No activities</span>
                    {:else}
                      {#each cellAssessments as item}
                        <button
                          type="button"
                          onclick={() => openEditWizard(item)}
                          class="w-full text-left p-1.5 rounded-lg bg-white/90 hover:bg-white border border-slate-200 shadow-2xs transition-transform hover:-translate-y-0.5 cursor-pointer block group"
                          title="{item.process_title} ({item.department_name}) - Click to review"
                        >
                          <div class="text-[11px] font-bold text-slate-900 truncate group-hover:text-emerald-700">
                            {item.process_title}
                          </div>
                          <div class="text-[9px] text-slate-500 font-mono truncate">
                            {item.department_name || 'Organization'}
                          </div>
                        </button>
                      {/each}
                    {/if}
                  </div>

                  <!-- Bottom count -->
                  <div class="text-[9px] text-slate-500 font-mono text-right">
                    {cellAssessments.length} {cellAssessments.length === 1 ? 'item' : 'items'}
                  </div>
                </div>
              {/each}
            {/each}
          </div>

          <!-- X-Axis Label: Probability -->
          <div class="grid grid-cols-4 gap-2.5 pt-1 text-center font-mono text-xs font-bold text-slate-600">
            <div>P1: Low / Rare</div>
            <div>P2: Moderate / Unlikely</div>
            <div>P3: High / Likely</div>
            <div>P4: Extreme / Almost Certain</div>
          </div>
          <div class="text-center font-mono text-xs font-bold uppercase tracking-wider text-slate-600 pt-0.5">
            Probability of Occurrence (Likelihood) →
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Assessment Registry Cards / Table -->
  <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
    <div class="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
      <span class="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
        Assessed Activities Register ({filteredAssessments.length})
      </span>
      <span class="text-[11px] text-slate-500 font-mono">DPA Sec. 16 Compliant</span>
    </div>
    <div class="divide-y divide-slate-100">
      {#each filteredAssessments as a}
        <div class="p-6 flex items-start justify-between gap-6 hover:bg-slate-50/60 transition-colors">
          <div class="space-y-2 flex-1 min-w-0">
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-slate-900">{a.process_title || 'Untitled Activity'}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <Building2 class="h-3 w-3" />
                {a.department_name || 'Organization-wide'}
              </span>
            </div>

            <!-- Risk Matrix Badge & Rating -->
            <div class="flex items-center gap-3 text-xs">
              <span class="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full border {
                a.risk_level === 'HIGH'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : a.risk_level === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }">
                <Shield class="h-3.5 w-3.5" />
                Rating {a.risk_rating} ({a.impact_score} × {a.probability_score}) • {a.risk_level} RISK
              </span>

              <span class="text-slate-400">•</span>
              <span class="text-slate-500 font-mono text-[11px]">
                Assessed: {a.updated_at ? new Date(a.updated_at).toLocaleDateString() : 'Active'}
              </span>
            </div>

            <!-- Mitigations Summary -->
            {#if a.mitigation_solutions}
              <div class="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                <strong class="font-semibold text-slate-900 block mb-0.5">Approved Mitigations & Controls:</strong>
                <p class="leading-relaxed text-[11px]">{a.mitigation_solutions}</p>
              </div>
            {/if}
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0 pt-1">
            <button
              onclick={() => handlePrintDossier(a)}
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              title="Print Audit Dossier"
            >
              <Printer class="h-3.5 w-3.5" />
              <span>Dossier</span>
            </button>
            <button
              onclick={() => openEditWizard(a)}
              class="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Edit Assessment"
            >
              <Edit3 class="h-4 w-4" />
            </button>
            <button
              onclick={() => (deletingAssessment = a)}
              class="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Remove Assessment"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      {:else}
        <div class="p-12 text-center text-xs text-slate-400 space-y-2">
          {#if isLoading}
            <p>Loading PIA assessments from local database...</p>
          {:else}
            <Scale class="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p class="font-semibold text-slate-600">No Privacy Impact Assessments recorded yet.</p>
            <p class="max-w-md mx-auto">
              Click "Conduct New Assessment" to run the 4-step diagnostic wizard and calculate your first 4×4 risk matrix rating.
            </p>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Process Selector Modal (Choose which ROPA activity to assess) -->
{#if isProcessPickerOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">Select Processing Activity for PIA</h3>
        <button onclick={() => (isProcessPickerOpen = false)} class="text-slate-400 hover:text-slate-700">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="p-6 max-h-96 overflow-y-auto divide-y divide-slate-100">
        {#each processes as p}
          <div
            role="button"
            tabindex="0"
            onclick={() => openCreateWizard(p)}
            onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); openCreateWizard(p); } }}
            class="py-3 px-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
          >
            <div>
              <p class="text-xs font-bold text-slate-900">{p.title}</p>
              <p class="text-[11px] text-slate-500">{p.department_name || 'Organization-wide'}</p>
            </div>
            <span class="text-xs font-semibold text-amber-700 hover:underline">Assess Activity →</span>
          </div>
        {:else}
          <div class="py-8 text-center text-xs text-slate-400">
            No ROPA processes found. Create a process in the ROPA Registry first.
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- PIA Guided Wizard Modal -->
{#if isWizardOpen && selectedProcess}
  <PiaWizard
    process={selectedProcess}
    existingAssessment={editingAssessment}
    onClose={() => (isWizardOpen = false)}
    onSave={handleSaveAssessment}
  />
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingAssessment}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-rose-100 bg-rose-50 flex items-center gap-2 text-rose-800">
        <AlertCircle class="h-4 w-4" />
        <h3 class="text-sm font-bold">Remove PIA Assessment</h3>
      </div>

      <div class="p-6 space-y-2">
        <p class="text-xs text-slate-600">
          Are you sure you want to remove the PIA evaluation for <strong class="text-slate-900 font-semibold">{deletingAssessment.process_title}</strong>?
        </p>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button
          onclick={() => (deletingAssessment = null)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={confirmDelete}
          class="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          Delete Assessment
        </button>
      </div>
    </div>
  </div>
{/if}
