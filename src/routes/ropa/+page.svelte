<script lang="ts">
  import { onMount } from 'svelte';
  import { listProcesses, createProcess, updateProcess, deleteProcess } from '$lib/api/ropa';
  import { getOrganization, listDepartments } from '$lib/api/admin';
  import type { Process, ProcessFormData } from '$lib/types/ropa';
  import type { Department } from '$lib/types/organization';
  import RopaWizard from '$lib/components/ropa/RopaWizard.svelte';
  import { downloadRopaExcelTemplate, parseRopaExcelFile } from '$lib/services/excelService';
  import { PRE_FILLED_TEMPLATES } from '$lib/data/ropaTemplates';
  import {
    FolderLock,
    Plus,
    Search,
    Filter,
    Edit3,
    Trash2,
    Shield,
    Download,
    Upload,
    FileSpreadsheet,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Building2,
    Calendar,
    Check,
    X
  } from 'lucide-svelte';

  let processes = $state<Process[]>([]);
  let departments = $state<Department[]>([]);
  let isLoading = $state(true);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  let searchQuery = $state('');
  let selectedDepartmentFilter = $state('ALL');
  let selectedStatusFilter = $state('ALL');
  let selectedRiskFilter = $state('ALL');

  // Wizard Modal
  let isWizardOpen = $state(false);
  let editingProcess = $state<Process | null>(null);

  // Delete Confirmation Modal
  let deletingProcess = $state<Process | null>(null);

  // Excel Ingestion Modal & Processing State
  let isExcelModalOpen = $state(false);
  let isIngesting = $state(false);
  let excelFile = $state<File | null>(null);
  let parsedBatch = $state<ProcessFormData[]>([]);
  let parseErrors = $state<string[]>([]);

  // Pre-filled Templates Quick Add Modal
  let isTemplatesModalOpen = $state(false);
  let templateDepartmentMap = $state<Record<string, string>>({});
  let selectedTemplateIds = $state<string[]>([]);

  async function loadData() {
    try {
      isLoading = true;
      const org = await getOrganization();
      const [fetchedProcesses, fetchedDepts] = await Promise.all([
        listProcesses(org.id),
        listDepartments(org.id)
      ]);
      processes = fetchedProcesses;
      departments = fetchedDepts;
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to load ROPA records.' };
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  // Filtered entries
  let filteredProcesses = $derived(
    processes.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.data_categories.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.data_subjects.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = selectedDepartmentFilter === 'ALL' || p.dept_id === selectedDepartmentFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;
      const matchesRisk = selectedRiskFilter === 'ALL' || p.risk_level === selectedRiskFilter;

      return matchesSearch && matchesDept && matchesStatus && matchesRisk;
    })
  );

  function openCreateWizard() {
    editingProcess = null;
    isWizardOpen = true;
  }

  function openEditWizard(proc: Process) {
    editingProcess = proc;
    isWizardOpen = true;
  }

  async function handleSaveWizard(payload: ProcessFormData) {
    try {
      if (editingProcess) {
        await updateProcess(editingProcess.id, payload);
        statusMessage = { type: 'success', text: `ROPA record "${payload.title}" updated successfully.` };
      } else {
        await createProcess(payload);
        statusMessage = { type: 'success', text: `New ROPA entry "${payload.title}" recorded in registry.` };
      }
      isWizardOpen = false;
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to save ROPA entry.' };
    }
  }

  async function confirmDelete() {
    if (!deletingProcess) return;
    try {
      await deleteProcess(deletingProcess.id);
      statusMessage = { type: 'success', text: `ROPA record "${deletingProcess.title}" removed.` };
      deletingProcess = null;
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to delete process.' };
    }
  }

  function exportCsv() {
    if (processes.length === 0) return;
    const headers = [
      'ID',
      'Title',
      'Department',
      'Data Subjects',
      'Data Categories',
      'Lawful Basis',
      'Recipients',
      'Retention Period',
      'Status',
      'Risk Rating'
    ];

    const rows = processes.map((p) => [
      `"${p.id}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      `"${(p.department_name || '').replace(/"/g, '""')}"`,
      `"${p.data_subjects.join('; ')}"`,
      `"${p.data_categories.join('; ')}"`,
      `"${p.lawful_basis.join('; ')}"`,
      `"${p.recipients.join('; ')}"`,
      `"${p.retention_period.replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.risk_level || 'LOW'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tanod-ropa-registry-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleExcelFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    excelFile = target.files[0];
    parseErrors = [];
    parsedBatch = [];

    try {
      const res = await parseRopaExcelFile(excelFile, departments);
      parsedBatch = res.validProcesses;
      parseErrors = res.errors;
    } catch (e: any) {
      parseErrors = [e?.toString() || 'Failed to read Excel file format.'];
    }
  }

  async function commitExcelBatch() {
    if (parsedBatch.length === 0) return;
    try {
      isIngesting = true;
      let successCount = 0;
      for (const p of parsedBatch) {
        await createProcess(p);
        successCount++;
      }
      statusMessage = {
        type: 'success',
        text: `Successfully ingested ${successCount} processing activities from Excel into ROPA registry.`
      };
      isExcelModalOpen = false;
      excelFile = null;
      parsedBatch = [];
      parseErrors = [];
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed during batch Excel ingestion.' };
    } finally {
      isIngesting = false;
    }
  }

  function openTemplatesModal() {
    selectedTemplateIds = [];
    // Initialize department defaults for templates
    const map: Record<string, string> = {};
    for (const tpl of PRE_FILLED_TEMPLATES) {
      const match = departments.find((d) =>
        tpl.suggestedDepartment.toLowerCase().includes(d.name.toLowerCase()) ||
        d.name.toLowerCase().includes(tpl.suggestedDepartment.toLowerCase().split('/')[0].trim())
      );
      map[tpl.id] = match ? match.id : departments[0]?.id ?? '';
    }
    templateDepartmentMap = map;
    isTemplatesModalOpen = true;
  }

  function toggleTemplateSelection(id: string) {
    if (selectedTemplateIds.includes(id)) {
      selectedTemplateIds = selectedTemplateIds.filter((t) => t !== id);
    } else {
      selectedTemplateIds = [...selectedTemplateIds, id];
    }
  }

  async function commitSelectedTemplates() {
    if (selectedTemplateIds.length === 0) return;
    try {
      isIngesting = true;
      let count = 0;
      for (const tplId of selectedTemplateIds) {
        const tpl = PRE_FILLED_TEMPLATES.find((t) => t.id === tplId);
        if (!tpl) continue;
        const targetDeptId = (templateDepartmentMap[tplId] || departments[0]?.id) ?? '';
        await createProcess({
          ...tpl.data,
          dept_id: targetDeptId
        });
        count++;
      }
      statusMessage = {
        type: 'success',
        text: `Added ${count} pre-filled standard processing activities to ROPA registry.`
      };
      isTemplatesModalOpen = false;
      selectedTemplateIds = [];
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to add standard templates.' };
    } finally {
      isIngesting = false;
    }
  }
</script>

<div class="max-w-7xl mx-auto space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between border-b border-slate-200 pb-5">
    <div>
      <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <FolderLock class="h-6 w-6 text-slate-700" />
        Records of Processing Activities (ROPA) Registry
      </h2>
      <p class="text-xs text-slate-500 mt-1">
        Mandatory statutory inventory under RA 10173 Section 16 and NPC IRR Section 21 documenting the 5 Pillars of processing.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <!-- Download Excel Template -->
      <button
        onclick={downloadRopaExcelTemplate}
        title="Download official Excel template with sample rows and statutory NPC reference sheets"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
      >
        <FileSpreadsheet class="h-3.5 w-3.5 text-emerald-600" />
        <span>Excel Template</span>
      </button>

      <!-- Ingest Excel -->
      <button
        onclick={() => (isExcelModalOpen = true)}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
      >
        <Upload class="h-3.5 w-3.5 text-blue-600" />
        <span>Import Excel</span>
      </button>

      <!-- Standard Pre-filled Library -->
      <button
        onclick={openTemplatesModal}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition-all cursor-pointer shadow-2xs"
      >
        <Sparkles class="h-3.5 w-3.5 text-amber-600" />
        <span>Standard Templates</span>
      </button>

      <!-- Export CSV -->
      <button
        onclick={exportCsv}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
      >
        <Download class="h-3.5 w-3.5" />
        <span>Export CSV</span>
      </button>

      <!-- Add Processing Activity (Wizard) -->
      <button
        onclick={openCreateWizard}
        class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs"
      >
        <Plus class="h-4 w-4" />
        <span>Add Activity</span>
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

  <!-- Search & Filter Controls -->
  <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
    <!-- Search Bar -->
    <div class="relative flex-1 min-w-[280px]">
      <Search class="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Filter by title, category, data subject, or keywords..."
        class="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
      />
    </div>

    <!-- Dropdowns -->
    <div class="flex items-center gap-2">
      <!-- Department Filter -->
      <select
        bind:value={selectedDepartmentFilter}
        class="text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-medium"
      >
        <option value="ALL">All Departments</option>
        {#each departments as d}
          <option value={d.id}>{d.name}</option>
        {/each}
      </select>

      <!-- Status Filter -->
      <select
        bind:value={selectedStatusFilter}
        class="text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-medium"
      >
        <option value="ALL">All Statuses</option>
        <option value="DRAFT">Draft</option>
        <option value="REVIEW">Review</option>
        <option value="APPROVED">Approved</option>
      </select>

      <!-- Risk Filter -->
      <select
        bind:value={selectedRiskFilter}
        class="text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-medium"
      >
        <option value="ALL">All Risk Ratings</option>
        <option value="LOW">Low Risk</option>
        <option value="MEDIUM">Medium Risk</option>
        <option value="HIGH">High Risk</option>
      </select>
    </div>
  </div>

  <!-- ROPA Table Registry -->
  <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
          <tr>
            <th class="px-5 py-3.5">Activity & Division</th>
            <th class="px-5 py-3.5">Subjects & Data Categories</th>
            <th class="px-5 py-3.5">Lawful Grounds (Sec. 12/13)</th>
            <th class="px-5 py-3.5">Retention Period</th>
            <th class="px-5 py-3.5 text-center">Status</th>
            <th class="px-5 py-3.5 text-center">Risk Rating</th>
            <th class="px-5 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#each filteredProcesses as proc}
            <tr class="hover:bg-slate-50/70 transition-colors">
              <!-- Activity & Division -->
              <td class="px-5 py-4 max-w-xs space-y-1">
                <span class="font-bold text-slate-900 block truncate">{proc.title}</span>
                <span class="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Building2 class="h-3 w-3" />
                  {proc.department_name || 'Organization-wide'}
                </span>
                {#if proc.description}
                  <p class="text-[11px] text-slate-400 line-clamp-1">{proc.description}</p>
                {/if}
              </td>

              <!-- Subjects & Categories -->
              <td class="px-5 py-4 max-w-sm space-y-1.5">
                <div class="flex flex-wrap gap-1">
                  {#each proc.data_subjects.slice(0, 2) as s}
                    <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {s}
                    </span>
                  {/each}
                  {#if proc.data_subjects.length > 2}
                    <span class="text-[10px] text-slate-400 font-mono">+{proc.data_subjects.length - 2}</span>
                  {/if}
                </div>
                <div class="flex flex-wrap gap-1">
                  {#each proc.data_categories.slice(0, 2) as c}
                    <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      {c}
                    </span>
                  {/each}
                  {#if proc.data_categories.length > 2}
                    <span class="text-[10px] text-slate-400 font-mono">+{proc.data_categories.length - 2}</span>
                  {/if}
                </div>
              </td>

              <!-- Lawful Basis -->
              <td class="px-5 py-4 max-w-xs">
                <div class="space-y-0.5">
                  {#each proc.lawful_basis.slice(0, 2) as b}
                    <span class="block text-[11px] text-slate-700 font-mono truncate">• {b}</span>
                  {/each}
                  {#if proc.lawful_basis.length > 2}
                    <span class="text-[10px] text-slate-400 font-mono">+{proc.lawful_basis.length - 2} more grounds</span>
                  {/if}
                </div>
              </td>

              <!-- Retention -->
              <td class="px-5 py-4 text-[11px] text-slate-600 max-w-[180px] truncate">
                {proc.retention_period}
              </td>

              <!-- Status -->
              <td class="px-5 py-4 text-center">
                <span class="inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border {
                  proc.status === 'APPROVED' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : proc.status === 'REVIEW' 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }">
                  {proc.status}
                </span>
              </td>

              <!-- Risk Rating -->
              <td class="px-5 py-4 text-center">
                <span class="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border {
                  proc.risk_level === 'HIGH'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : proc.risk_level === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }">
                  <Shield class="h-3 w-3" />
                  {proc.risk_level || 'LOW'}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-5 py-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    onclick={() => openEditWizard(proc)}
                    class="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Edit Processing Record"
                  >
                    <Edit3 class="h-4 w-4" />
                  </button>
                  <button
                    onclick={() => (deletingProcess = proc)}
                    class="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="px-6 py-12 text-center text-xs text-slate-400">
                {#if isLoading}
                  Loading official ROPA entries from local database...
                {:else if searchQuery.trim() || selectedDepartmentFilter !== 'ALL' || selectedStatusFilter !== 'ALL'}
                  No processing activities match the specified filter criteria.
                {:else}
                  No records of processing activities found. Click "Add Processing Activity" to document your organization's first processing workflow.
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Table Footer Summary -->
    <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
      <span>Showing <strong>{filteredProcesses.length}</strong> of <strong>{processes.length}</strong> registered processes</span>
      <span class="font-mono text-[10px]">RA 10173 Compliance Registry</span>
    </div>
  </div>
</div>

<!-- 4-Step Guided ROPA Wizard Modal -->
{#if isWizardOpen}
  <RopaWizard
    {departments}
    initialData={editingProcess}
    onClose={() => (isWizardOpen = false)}
    onSave={handleSaveWizard}
  />
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingProcess}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2 text-rose-800">
        <AlertCircle class="h-4 w-4" />
        <h3 class="text-sm font-bold">Remove ROPA Activity Record</h3>
      </div>

      <div class="p-6 space-y-2">
        <p class="text-xs text-slate-600">
          Are you sure you want to remove <strong class="text-slate-900 font-semibold">{deletingProcess.title}</strong> from the official ROPA registry?
        </p>
        <p class="text-[11px] text-slate-500">
          This operation permanently deletes the processing record and its compliance mapping.
        </p>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
        <button
          onclick={() => (deletingProcess = null)}
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

<!-- Excel Ingestion / Import Modal -->
{#if isExcelModalOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-emerald-100 text-emerald-700">
            <FileSpreadsheet class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Ingest ROPA Activities from Excel</h3>
            <p class="text-[11px] text-slate-500">Import bulk personal data processing inventories from .xlsx or .xls</p>
          </div>
        </div>
        <button
          onclick={() => (isExcelModalOpen = false)}
          class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-5 overflow-y-auto flex-1">
        <!-- Step 1: Download Template Helper -->
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div class="space-y-0.5">
            <div class="text-xs font-bold text-slate-800">Need the official formatting structure?</div>
            <div class="text-[11px] text-slate-500">
              Download the pre-structured Excel template with a sample payroll row and statutory RA 10173 reference sheets.
            </div>
          </div>
          <button
            onclick={downloadRopaExcelTemplate}
            class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Download class="h-3.5 w-3.5 text-emerald-600" />
            <span>Get Template (.xlsx)</span>
          </button>
        </div>

        <!-- Step 2: Upload File Drag & Drop Zone -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2">Upload Completed Excel File</label>
          <div class="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onchange={handleExcelFileSelected}
              class="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload class="h-8 w-8 text-slate-400 mb-2" />
            <div class="text-xs font-semibold text-slate-700">
              {excelFile ? excelFile.name : 'Click to select or drag and drop your spreadsheet here'}
            </div>
            <div class="text-[10px] text-slate-500 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV</div>
          </div>
        </div>

        <!-- Parse Warnings & Errors -->
        {#if parseErrors.length > 0}
          <div class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <AlertCircle class="h-4 w-4 text-rose-600" />
              <span>Formatting Notices ({parseErrors.length})</span>
            </div>
            <ul class="list-disc pl-5 text-[11px] space-y-0.5 max-h-32 overflow-y-auto">
              {#each parseErrors as err}
                <li>{err}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Parsed Preview -->
        {#if parsedBatch.length > 0}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-800">
                Ready to Ingest: <span class="text-emerald-700">{parsedBatch.length} Processing Activities</span>
              </span>
              <span class="text-[11px] text-slate-500 font-mono">Validated</span>
            </div>

            <div class="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
              {#each parsedBatch as item, idx}
                <div class="p-3 text-xs flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-900 truncate">{item.title}</div>
                    <div class="text-[11px] text-slate-500 truncate">
                      {item.data_subjects.length} Subjects • {item.data_categories.length} Categories • Status: {item.status}
                    </div>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold shrink-0">
                    Row {idx + 1}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          onclick={() => {
            isExcelModalOpen = false;
            excelFile = null;
            parsedBatch = [];
            parseErrors = [];
          }}
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>

        <button
          onclick={commitExcelBatch}
          disabled={parsedBatch.length === 0 || isIngesting}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {#if isIngesting}
            <span>Ingesting Activities...</span>
          {:else}
            <Check class="h-4 w-4" />
            <span>Confirm & Ingest ({parsedBatch.length})</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Standard Pre-filled Templates Modal -->
{#if isTemplatesModalOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-amber-100 text-amber-800">
            <Sparkles class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Standard Philippine Business Processing Activities</h3>
            <p class="text-[11px] text-slate-600">
              Select universal enterprise activities (Payroll, CCTV, Recruitment, etc.) to immediately add to your ROPA
            </p>
          </div>
        </div>
        <button
          onclick={() => (isTemplatesModalOpen = false)}
          class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1">
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Select one or more templates. You can customize them or assign specific departments before adding.
          </span>
          <span class="text-xs font-semibold text-amber-800 font-mono">
            {selectedTemplateIds.length} Selected
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {#each PRE_FILLED_TEMPLATES as tpl}
            <div
              class="p-4 rounded-xl border transition-all text-left flex flex-col justify-between {selectedTemplateIds.includes(tpl.id) ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20' : 'border-slate-200 bg-white hover:border-slate-300'}"
            >
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onclick={() => toggleTemplateSelection(tpl.id)}
                      class="w-4 h-4 rounded border flex items-center justify-center {selectedTemplateIds.includes(tpl.id) ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'}"
                    >
                      {#if selectedTemplateIds.includes(tpl.id)}
                        <Check class="w-3 h-3 stroke-[3]" />
                      {/if}
                    </button>
                    <span class="text-xs font-bold text-slate-900">{tpl.name}</span>
                  </div>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                    {tpl.category}
                  </span>
                </div>

                <p class="text-[11px] text-slate-500 leading-relaxed">
                  {tpl.description}
                </p>

                <div class="text-[10px] text-slate-500 space-y-0.5 pt-1">
                  <div><strong>Subjects:</strong> {tpl.data.data_subjects.join(', ')}</div>
                  <div><strong>Categories:</strong> {tpl.data.data_categories.length} statutory items</div>
                  <div><strong>Retention:</strong> {tpl.data.retention_period}</div>
                </div>
              </div>

              <!-- Department Assigner -->
              <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <label class="text-[10px] font-semibold text-slate-600">Assign To:</label>
                <select
                  bind:value={templateDepartmentMap[tpl.id]}
                  class="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-800 flex-1 max-w-[190px]"
                >
                  {#each departments as d}
                    <option value={d.id}>{d.name}</option>
                  {/each}
                </select>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          onclick={() => {
            isTemplatesModalOpen = false;
            selectedTemplateIds = [];
          }}
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>

        <button
          onclick={commitSelectedTemplates}
          disabled={selectedTemplateIds.length === 0 || isIngesting}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          {#if isIngesting}
            <span>Adding to Registry...</span>
          {:else}
            <Sparkles class="h-4 w-4" />
            <span>Add Selected Templates ({selectedTemplateIds.length})</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

