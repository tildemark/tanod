<script lang="ts">
  import {
    DATA_SUBJECTS,
    DATA_CATEGORIES,
    LAWFUL_BASIS,
    RECIPIENTS,
    type Process,
    type ProcessFormData
  } from '$lib/types/ropa';
  import type { Department } from '$lib/types/organization';
  import { PRE_FILLED_TEMPLATES, type PreFilledTemplate } from '$lib/data/ropaTemplates';
  import {
    X,
    Check,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Info,
    Shield,
    FolderKanban,
    Sparkles
  } from 'lucide-svelte';

  let {
    departments,
    initialData = null,
    onClose,
    onSave
  }: {
    departments: Department[];
    initialData?: Process | null;
    onClose: () => void;
    onSave: (payload: ProcessFormData) => Promise<void>;
  } = $props();

  // Wizard Step (1: Process & Dept, 2: Subjects & Categories, 3: Lawful Basis, 4: Recipients & Retention)
  let currentStep = $state<number>(1);
  let isSaving = $state(false);
  let validationError = $state<string | null>(null);

  // Form State
  let deptId = $state(initialData?.dept_id || (departments[0]?.id ?? ''));
  let title = $state(initialData?.title || '');
  let description = $state(initialData?.description || '');
  let selectedSubjects = $state<string[]>(initialData?.data_subjects ? [...initialData.data_subjects] : []);
  let selectedCategories = $state<string[]>(initialData?.data_categories ? [...initialData.data_categories] : []);
  let selectedBasis = $state<string[]>(initialData?.lawful_basis ? [...initialData.lawful_basis] : []);
  let selectedRecipients = $state<string[]>(initialData?.recipients ? [...initialData.recipients] : []);
  let retentionPeriod = $state(initialData?.retention_period || '5 years following separation / conclusion of transaction');
  let status = $state<'DRAFT' | 'REVIEW' | 'APPROVED'>(initialData?.status || 'DRAFT');

  // Selected template identifier
  let selectedTemplateId = $state<string>('');

  function applyTemplate(templateId: string) {
    if (!templateId) return;
    const tpl = PRE_FILLED_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;

    title = tpl.data.title;
    description = tpl.data.description || '';
    selectedSubjects = [...tpl.data.data_subjects];
    selectedCategories = [...tpl.data.data_categories];
    selectedBasis = [...tpl.data.lawful_basis];
    selectedRecipients = [...tpl.data.recipients];
    retentionPeriod = tpl.data.retention_period;
    status = tpl.data.status;

    // Try to auto-match department if possible
    const matchedDept = departments.find((d) => 
      tpl.suggestedDepartment.toLowerCase().includes(d.name.toLowerCase()) ||
      d.name.toLowerCase().includes(tpl.suggestedDepartment.toLowerCase().split('/')[0].trim())
    );
    if (matchedDept) {
      deptId = matchedDept.id;
    }
  }

  // Custom Item inputs
  let customSubject = $state('');
  let customCategory = $state('');
  let customRecipient = $state('');

  function toggleItem(item: string, array: string[]): string[] {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    } else {
      return [...array, item];
    }
  }

  function addCustomSubject() {
    if (customSubject.trim() && !selectedSubjects.includes(customSubject.trim())) {
      selectedSubjects = [...selectedSubjects, customSubject.trim()];
      customSubject = '';
    }
  }

  function addCustomCategory() {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      selectedCategories = [...selectedCategories, customCategory.trim()];
      customCategory = '';
    }
  }

  function addCustomRecipient() {
    if (customRecipient.trim() && !selectedRecipients.includes(customRecipient.trim())) {
      selectedRecipients = [...selectedRecipients, customRecipient.trim()];
      customRecipient = '';
    }
  }

  function validateStep(step: number): boolean {
    validationError = null;
    if (step === 1) {
      if (!deptId) {
        validationError = 'Please select an accountable department.';
        return false;
      }
      if (!title.trim() || title.trim().length < 3) {
        validationError = 'Process Title must be at least 3 characters.';
        return false;
      }
    } else if (step === 2) {
      if (selectedSubjects.length === 0) {
        validationError = 'Please select at least one Data Subject category.';
        return false;
      }
      if (selectedCategories.length === 0) {
        validationError = 'Please select at least one Personal Data Category.';
        return false;
      }
    } else if (step === 3) {
      if (selectedBasis.length === 0) {
        validationError = 'Please specify at least one Lawful Basis under Sec. 12 or Sec. 13.';
        return false;
      }
    } else if (step === 4) {
      if (selectedRecipients.length === 0) {
        validationError = 'Please select at least one Recipient or Transfer category.';
        return false;
      }
      if (!retentionPeriod.trim()) {
        validationError = 'Please enter a retention schedule and disposal rule.';
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      currentStep = Math.min(4, currentStep + 1);
    }
  }

  function prevStep() {
    validationError = null;
    currentStep = Math.max(1, currentStep - 1);
  }

  async function handleFinalSubmit() {
    if (!validateStep(4)) return;
    isSaving = true;

    try {
      await onSave({
        dept_id: deptId,
        title: title.trim(),
        description: description.trim() || undefined,
        data_subjects: selectedSubjects,
        data_categories: selectedCategories,
        lawful_basis: selectedBasis,
        recipients: selectedRecipients,
        retention_period: retentionPeriod.trim(),
        status
      });
    } catch (e: any) {
      validationError = e?.toString() || 'Failed to save ROPA record.';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
    
    <!-- Modal Header -->
    <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FolderKanban class="h-4 w-4 text-slate-700" />
          {initialData ? 'Edit Record of Processing Activity (ROPA)' : 'New Record of Processing Activity (ROPA)'}
        </h3>
        <p class="text-[11px] text-slate-500">
          Philippine Data Privacy Act of 2012 (RA 10173, Sec. 16; IRR Sec. 21)
        </p>
      </div>

      <button
        onclick={onClose}
        class="h-8 w-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- 4-Step Breadcrumb Progress Bar -->
    <div class="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
      <button
        type="button"
        onclick={() => (validateStep(currentStep) ? (currentStep = 1) : null)}
        class="flex items-center gap-1.5 {currentStep === 1 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 1 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">1</span>
        <span>Process & Department</span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400" />

      <button
        type="button"
        onclick={() => (validateStep(currentStep) ? (currentStep = 2) : null)}
        class="flex items-center gap-1.5 {currentStep === 2 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 2 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">2</span>
        <span>Subjects & Data</span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400" />

      <button
        type="button"
        onclick={() => (validateStep(currentStep) ? (currentStep = 3) : null)}
        class="flex items-center gap-1.5 {currentStep === 3 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 3 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">3</span>
        <span>Lawful Basis</span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400" />

      <button
        type="button"
        onclick={() => (validateStep(currentStep) ? (currentStep = 4) : null)}
        class="flex items-center gap-1.5 {currentStep === 4 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 4 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">4</span>
        <span>Transfers & Retention</span>
      </button>
    </div>

    <!-- Error Banner -->
    {#if validationError}
      <div class="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
        <AlertCircle class="h-4 w-4 shrink-0 text-rose-600" />
        <span>{validationError}</span>
      </div>
    {/if}

    <!-- Wizard Form Body -->
    <div class="p-6 overflow-y-auto flex-1 space-y-6">
      
      <!-- STEP 1: Process Title & Department -->
      {#if currentStep === 1}
        <div class="space-y-4">
          <!-- Pre-filled Template Quick Pick -->
          {#if !initialData}
            <div class="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles class="h-3.5 w-3.5 text-amber-600" />
                  <span>Quick-Fill from Standard Business Template</span>
                </div>
                <span class="text-[10px] font-mono bg-amber-100/90 text-amber-800 px-2 py-0.5 rounded font-semibold">
                  Saves Manual Typing
                </span>
              </div>
              <p class="text-[11px] text-amber-800/90 leading-relaxed">
                Choose a pre-filled standard enterprise process (e.g. Payroll, Recruitment, CCTV, Vendor Due Diligence) to automatically populate all 5 pillars according to Philippine NPC compliance norms.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <select
                  bind:value={selectedTemplateId}
                  onchange={() => applyTemplate(selectedTemplateId)}
                  class="flex-1 text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">-- Select a Standard Business Processing Activity --</option>
                  {#each PRE_FILLED_TEMPLATES as tpl}
                    <option value={tpl.id}>[{tpl.category}] {tpl.name}</option>
                  {/each}
                </select>
                {#if selectedTemplateId}
                  <button
                    type="button"
                    onclick={() => applyTemplate(selectedTemplateId)}
                    class="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    Re-Apply
                  </button>
                {/if}
              </div>
            </div>
          {/if}

          <div>
            <label for="step1_dept" class="block text-xs font-semibold text-slate-700 mb-1">Accountable Department Division *</label>
            <select
              id="step1_dept"
              bind:value={deptId}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            >
              {#each departments as d}
                <option value={d.id}>{d.name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="step1_title" class="block text-xs font-semibold text-slate-700 mb-1">Processing Activity Title *</label>
            <input
              id="step1_title"
              type="text"
              bind:value={title}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Employee Payroll & Mandatory Statutory Contributions"
            />
            <p class="text-[10px] text-slate-500 mt-1">
              Descriptive operational name identifying the purpose of personal data processing.
            </p>
          </div>

          <div>
            <label for="step1_desc" class="block text-xs font-semibold text-slate-700 mb-1">Operational Description & Context</label>
            <textarea
              id="step1_desc"
              bind:value={description}
              rows={4}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="Detail how data is collected, software systems utilized (e.g., HRIS, SAP, cloud platforms), and specific internal business units involved."
            ></textarea>
          </div>

          <div>
            <label for="step1_status" class="block text-xs font-semibold text-slate-700 mb-1">ROPA Governance Lifecycle Status</label>
            <select
              id="step1_status"
              bind:value={status}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-semibold"
            >
              <option value="DRAFT">DRAFT (Under Intake / Preliminary Encoding)</option>
              <option value="REVIEW">REVIEW (Under Legal / DPO Review)</option>
              <option value="APPROVED">APPROVED (Formal Registry Entry)</option>
            </select>
          </div>
        </div>

      <!-- STEP 2: Data Subjects & Data Categories -->
      {:else if currentStep === 2}
        <div class="space-y-6">
          <!-- Pillar 1: Data Subjects -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-900">
                Pillar 1: Categories of Data Subjects * ({selectedSubjects.length} selected)
              </label>
              <span class="text-[10px] text-slate-500 font-mono">DPA Sec. 3(c)</span>
            </div>
            
            <div class="flex flex-wrap gap-1.5 mb-2">
              {#each DATA_SUBJECTS as subject}
                {@const isSelected = selectedSubjects.includes(subject)}
                <button
                  type="button"
                  onclick={() => (selectedSubjects = toggleItem(subject, selectedSubjects))}
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer {isSelected ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                >
                  {subject}
                </button>
              {/each}
            </div>

            <!-- Custom Subject Input -->
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={customSubject}
                placeholder="Or type custom subject category..."
                class="flex-1 text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubject(); } }}
              />
              <button
                type="button"
                onclick={addCustomSubject}
                class="px-3 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Pillar 2: Data Categories -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-900">
                Pillar 2: Categories of Personal Data Processed * ({selectedCategories.length} selected)
              </label>
              <span class="text-[10px] text-slate-500 font-mono">DPA Sec. 3(g) & 3(l)</span>
            </div>

            <div class="flex flex-wrap gap-1.5 mb-2">
              {#each DATA_CATEGORIES as category}
                {@const isSelected = selectedCategories.includes(category)}
                {@const isSensitive = category.includes('Biometric') || category.includes('Health') || category.includes('Government') || category.includes('Financial')}
                <button
                  type="button"
                  onclick={() => (selectedCategories = toggleItem(category, selectedCategories))}
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 {
                    isSelected 
                      ? (isSensitive ? 'bg-amber-700 text-white shadow-2xs' : 'bg-slate-900 text-white shadow-2xs')
                      : (isSensitive ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                  }"
                >
                  {#if isSensitive}
                    <Shield class="h-3 w-3 shrink-0" />
                  {/if}
                  <span>{category}</span>
                </button>
              {/each}
            </div>

            <!-- Custom Category Input -->
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={customCategory}
                placeholder="Or type custom data category..."
                class="flex-1 text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
              />
              <button
                type="button"
                onclick={addCustomCategory}
                class="px-3 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        </div>

      <!-- STEP 3: Lawful Basis under Sec. 12 & 13 -->
      {:else if currentStep === 3}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-slate-900">
                Pillar 3: Lawful Basis for Processing * ({selectedBasis.length} selected)
              </h4>
              <p class="text-[11px] text-slate-500">
                Statutory grounds mandated under RA 10173 Section 12 (General Personal Information) and Section 13 (Sensitive Personal Information).
              </p>
            </div>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">RA 10173 Sec. 12/13</span>
          </div>

          <div class="space-y-2">
            {#each LAWFUL_BASIS as basis}
              {@const isSelected = selectedBasis.includes(basis)}
              <div
                role="checkbox"
                tabindex="0"
                aria-checked={isSelected}
                onclick={() => (selectedBasis = toggleItem(basis, selectedBasis))}
                onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); selectedBasis = toggleItem(basis, selectedBasis); } }}
                class="p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between {
                  isSelected ? 'bg-amber-50/60 border-amber-500 text-amber-950 font-semibold shadow-2xs' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }"
              >
                <div class="flex items-center gap-2.5">
                  <div class="h-4 w-4 rounded border flex items-center justify-center {isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'}">
                    {#if isSelected}
                      <Check class="h-3 w-3" />
                    {/if}
                  </div>
                  <span>{basis}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

      <!-- STEP 4: Recipients & Retention Schedules -->
      {:else if currentStep === 4}
        <div class="space-y-6">
          <!-- Pillar 4: Recipients & Transfers -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-900">
                Pillar 4: Recipients & Third-Party Processors (PIPs) * ({selectedRecipients.length} selected)
              </label>
              <span class="text-[10px] text-slate-500 font-mono">DPA Sec. 14 / IRR Sec. 21</span>
            </div>

            <div class="flex flex-wrap gap-1.5 mb-2">
              {#each RECIPIENTS as recipient}
                {@const isSelected = selectedRecipients.includes(recipient)}
                <button
                  type="button"
                  onclick={() => (selectedRecipients = toggleItem(recipient, selectedRecipients))}
                  class="px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer {isSelected ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                >
                  {recipient}
                </button>
              {/each}
            </div>

            <!-- Custom Recipient Input -->
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={customRecipient}
                placeholder="Or specify custom recipient / government agency..."
                class="flex-1 text-xs px-3 py-1.5 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRecipient(); } }}
              />
              <button
                type="button"
                onclick={addCustomRecipient}
                class="px-3 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          <!-- Pillar 5: Retention & Disposal Schedule -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="step4_retention" class="text-xs font-bold text-slate-900">
                Pillar 5: Retention Period & Disposal Protocol *
              </label>
              <span class="text-[10px] text-slate-500 font-mono">DPA Sec. 11(e)</span>
            </div>

            <input
              id="step4_retention"
              type="text"
              bind:value={retentionPeriod}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. 5 Years after separation (Labor Code) followed by certified digital shredding"
            />
            <p class="text-[10px] text-slate-500 mt-1">
              Specify the legal justification for retention (e.g. BIR tax records 10 years, medical charts 15 years) and disposal method (secure deletion/shredding).
            </p>
          </div>
        </div>
      {/if}

    </div>

    <!-- Wizard Footer / Nav Buttons -->
    <div class="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
      <div>
        {#if currentStep > 1}
          <button
            type="button"
            onclick={prevStep}
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <ChevronLeft class="h-4 w-4" />
            <span>Previous Step</span>
          </button>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>

        {#if currentStep < 4}
          <button
            type="button"
            onclick={nextStep}
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-2xs"
          >
            <span>Next Step</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        {:else}
          <button
            type="button"
            disabled={isSaving}
            onclick={handleFinalSubmit}
            class="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Check class="h-4 w-4" />
            <span>{isSaving ? 'Saving ROPA...' : (initialData ? 'Update ROPA Entry' : 'Record in Official ROPA')}</span>
          </button>
        {/if}
      </div>
    </div>

  </div>
</div>
