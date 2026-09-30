<script lang="ts">
  import {
    THRESHOLD_QUESTIONS,
    DATA_FLOW_STAGES,
    PRIVACY_PRINCIPLES,
    IMPACT_LEVELS,
    PROBABILITY_LEVELS,
    type PiaAssessment,
    type SavePiaPayload
  } from '$lib/types/pia';
  import type { Process } from '$lib/types/ropa';
  import {
    X,
    Check,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Shield,
    CheckCircle2,
    Save,
    FileText,
    Activity,
    Info,
    Scale
  } from 'lucide-svelte';

  let {
    process,
    existingAssessment = null,
    onClose,
    onSave
  }: {
    process: Process;
    existingAssessment?: PiaAssessment | null;
    onClose: () => void;
    onSave: (payload: SavePiaPayload) => Promise<void>;
  } = $props();

  let currentStep = $state<number>(1);
  let isSaving = $state(false);
  let statusError = $state<string | null>(null);

  // Form State
  let thresholdAnswers = $state<Record<string, boolean>>(
    existingAssessment?.threshold_answers
      ? Object.fromEntries(
          Object.entries(existingAssessment.threshold_answers).map(([k, v]) => [k, Boolean(v)])
        )
      : {
          large_scale: false,
          sensitive_data: process.data_categories.some(c => c.includes('Biometric') || c.includes('Health') || c.includes('Government') || c.includes('Financial')),
          systematic_monitoring: false,
          vulnerable_subjects: process.data_subjects.some(s => s.includes('Minors') || s.includes('Patients')),
          cross_border: false,
        }
  );

  let dataFlowDetails = $state<Record<string, string>>(
    (existingAssessment?.data_flow_details as Record<string, string>) || {
      collection: 'Personal data is ingested via official corporate systems and encrypted intake portals.',
      storage: 'Maintained inside restricted database partitions with AES-256 encryption at rest.',
      usage: 'Restricted strictly to authorized personnel fulfilling declared business roles.',
      disclosure: process.recipients.join(', ') || 'No unauthorized third-party disclosure.',
      disposal: process.retention_period || 'Secure digital sanitization upon expiration.',
    }
  );

  let principlesChecklist = $state<Record<string, boolean>>(
    existingAssessment?.privacy_principles_checklist || {
      transparency_notice: true,
      purpose_limitation: true,
      data_minimization: true,
      accuracy_quality: true,
      security_measures: true,
      dsr_empowerment: true,
    }
  );

  let impactScore = $state<number>(existingAssessment?.impact_score || 2);
  let probabilityScore = $state<number>(existingAssessment?.probability_score || 2);
  let mitigationSolutions = $state<string>(
    existingAssessment?.mitigation_solutions ||
    'Mandatory Multi-Factor Authentication (MFA), role-based access control (RBAC), end-to-end TLS encryption, and routine periodic access audits.'
  );

  // Computed Risk Matrix Rating
  let calculatedRating = $derived(impactScore * probabilityScore);
  let calculatedLevel = $derived(
    calculatedRating === 1
      ? 'NEGLIGIBLE'
      : calculatedRating <= 4
      ? 'LOW'
      : calculatedRating <= 9
      ? 'MEDIUM'
      : 'HIGH'
  );

  let thresholdTriggerCount = $derived(
    Object.values(thresholdAnswers).filter(Boolean).length
  );

  async function handleFinalSave() {
    isSaving = true;
    statusError = null;

    try {
      await onSave({
        process_id: process.id,
        threshold_answers: thresholdAnswers,
        data_flow_details: dataFlowDetails,
        privacy_principles_checklist: principlesChecklist,
        impact_score: impactScore,
        probability_score: probabilityScore,
        mitigation_solutions: mitigationSolutions.trim() || undefined,
      });
    } catch (e: any) {
      statusError = e?.toString() || 'Failed to record Privacy Impact Assessment.';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
    
    <!-- Modal Header -->
    <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
      <div>
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Scale class="h-4 w-4 text-amber-600" />
          Official Privacy Impact Assessment (PIA) Engine
        </h3>
        <p class="text-[11px] text-slate-500 font-mono">
          Process: <strong class="text-slate-900">{process.title}</strong> • Division: {process.department_name || 'Organization-wide'}
        </p>
      </div>

      <button
        onclick={onClose}
        class="h-8 w-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Step Progress Indicator -->
    <div class="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
      <button
        type="button"
        onclick={() => (currentStep = 1)}
        class="flex items-center gap-1.5 {currentStep === 1 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 1 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">1</span>
        <span>Threshold Analysis</span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400" />

      <button
        type="button"
        onclick={() => (currentStep = 2)}
        class="flex items-center gap-1.5 {currentStep === 2 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 2 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">2</span>
        <span>Data Flow Lifecycle</span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400" />

      <button
        type="button"
        onclick={() => (currentStep = 3)}
        class="flex items-center gap-1.5 {currentStep === 3 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 3 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">3</span>
        <span>Privacy Principles</span>
      </button>

      <ChevronRight class="h-3.5 w-3.5 text-slate-400" />

      <button
        type="button"
        onclick={() => (currentStep = 4)}
        class="flex items-center gap-1.5 {currentStep === 4 ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <span class="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono {currentStep === 4 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-800'}">4</span>
        <span>NPC 4×4 Risk Matrix</span>
      </button>
    </div>

    <!-- Error Alert -->
    {#if statusError}
      <div class="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
        <AlertCircle class="h-4 w-4 shrink-0 text-rose-600" />
        <span>{statusError}</span>
      </div>
    {/if}

    <!-- Modal Body -->
    <div class="p-6 overflow-y-auto flex-1 space-y-6">
      
      <!-- STEP 1: Threshold Diagnostic Analysis -->
      {#if currentStep === 1}
        <div class="space-y-4">
          <div class="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-amber-950 text-xs flex items-start justify-between gap-4">
            <div>
              <p class="font-bold flex items-center gap-1.5 text-sm">
                <Info class="h-4 w-4 text-amber-700" />
                Statutory Mandatory PIA Determination
              </p>
              <p class="mt-1 text-amber-900">
                Under NPC Advisory No. 2017-03, a formal Privacy Impact Assessment is mandatory if your processing triggers high risks to the rights and freedoms of data subjects.
              </p>
            </div>
            <div class="text-right shrink-0">
              <span class="inline-block px-3 py-1 rounded-full font-mono font-bold text-xs {thresholdTriggerCount > 0 ? 'bg-amber-200 text-amber-950' : 'bg-emerald-100 text-emerald-800'}">
                {thresholdTriggerCount} High-Risk Trigger(s)
              </span>
            </div>
          </div>

          <div class="space-y-3">
            {#each THRESHOLD_QUESTIONS as q}
              {@const isChecked = Boolean(thresholdAnswers[q.id])}
              <div
                role="checkbox"
                tabindex="0"
                aria-checked={isChecked}
                onclick={() => (thresholdAnswers[q.id] = !thresholdAnswers[q.id])}
                onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); thresholdAnswers[q.id] = !thresholdAnswers[q.id]; } }}
                class="p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 {
                  isChecked ? 'bg-amber-50/70 border-amber-500 text-amber-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }"
              >
                <div class="flex items-start gap-3">
                  <div class="h-4 w-4 mt-0.5 rounded border flex items-center justify-center {isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'}">
                    {#if isChecked}
                      <Check class="h-3 w-3" />
                    {/if}
                  </div>
                  <div>
                    <p class="text-xs font-semibold">{q.question}</p>
                    <p class="text-[10px] text-slate-500 font-mono mt-0.5">{q.reference}</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

      <!-- STEP 2: Personal Data Flow Life Cycle -->
      {:else if currentStep === 2}
        <div class="space-y-4">
          <div class="border-b border-slate-200 pb-2">
            <h4 class="text-xs font-bold text-slate-900">Personal Data Life Cycle Mapping</h4>
            <p class="text-[11px] text-slate-500">Document the 5 touchpoints of data flow under official NPC audit guidelines.</p>
          </div>

          <div class="space-y-4">
            {#each DATA_FLOW_STAGES as stage}
              <div>
                <label for={`flow_${stage.id}`} class="block text-xs font-bold text-slate-800 mb-0.5">
                  {stage.label}
                </label>
                <p class="text-[10px] text-slate-500 mb-1.5">{stage.description}</p>
                <textarea
                  id={`flow_${stage.id}`}
                  bind:value={dataFlowDetails[stage.id]}
                  rows={2}
                  class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
                ></textarea>
              </div>
            {/each}
          </div>
        </div>

      <!-- STEP 3: Core Privacy Principles Checklist -->
      {:else if currentStep === 3}
        <div class="space-y-4">
          <div class="border-b border-slate-200 pb-2">
            <h4 class="text-xs font-bold text-slate-900">General Privacy Principles Verification</h4>
            <p class="text-[11px] text-slate-500">Compliance checklist against the statutory principles of RA 10173 Chapter III.</p>
          </div>

          <div class="space-y-3">
            {#each PRIVACY_PRINCIPLES as p}
              {@const isChecked = Boolean(principlesChecklist[p.id])}
              <div
                role="checkbox"
                tabindex="0"
                aria-checked={isChecked}
                onclick={() => (principlesChecklist[p.id] = !principlesChecklist[p.id])}
                onkeydown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); principlesChecklist[p.id] = !principlesChecklist[p.id]; } }}
                class="p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 {
                  isChecked ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }"
              >
                <div class="flex items-start gap-3">
                  <div class="h-4 w-4 mt-0.5 rounded border flex items-center justify-center {isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}">
                    {#if isChecked}
                      <Check class="h-3 w-3" />
                    {/if}
                  </div>
                  <div>
                    <span class="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 mb-1">
                      {p.principle}
                    </span>
                    <p class="text-xs font-medium">{p.requirement}</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

      <!-- STEP 4: Official NPC 4x4 Risk Matrix & Mitigation Tracker -->
      {:else if currentStep === 4}
        <div class="space-y-6">
          
          <!-- Mathematical Risk Display Banner -->
          <div class="p-6 rounded-2xl border flex items-center justify-between {
            calculatedLevel === 'HIGH'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : calculatedLevel === 'MEDIUM'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }">
            <div class="space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider font-mono">
                Official NPC 4×4 Risk Matrix Result
              </span>
              <h3 class="text-xl font-bold flex items-center gap-2">
                <Shield class="h-5 w-5" />
                Score: {impactScore} (Impact) × {probabilityScore} (Probability) = <span class="font-mono text-2xl">{calculatedRating}</span>
              </h3>
              <p class="text-xs opacity-80">
                Formula: Impact (1–4) × Probability (1–4) = Risk Rating (1–16)
              </p>
            </div>

            <div class="text-right">
              <span class="inline-block px-4 py-2 rounded-xl font-mono font-black text-sm uppercase tracking-wider shadow-xs {
                calculatedLevel === 'HIGH'
                  ? 'bg-rose-600 text-white'
                  : calculatedLevel === 'MEDIUM'
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }">
                {calculatedLevel} RISK
              </span>
            </div>
          </div>

          <!-- Selectors: Impact & Probability -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Impact (1-4) -->
            <div class="space-y-2">
              <label for="impact_score_select" class="block text-xs font-bold text-slate-900">
                Impact to Rights & Freedoms (1 to 4)
              </label>
              <div class="space-y-1.5">
                {#each IMPACT_LEVELS as imp}
                  <button
                    type="button"
                    onclick={() => (impactScore = imp.score)}
                    class="w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer {
                      impactScore === imp.score
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    }"
                  >
                    <div class="font-bold">{imp.label}</div>
                    <div class="text-[11px] opacity-80 mt-0.5">{imp.description}</div>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Probability (1-4) -->
            <div class="space-y-2">
              <label for="prob_score_select" class="block text-xs font-bold text-slate-900">
                Probability of Occurrence (1 to 4)
              </label>
              <div class="space-y-1.5">
                {#each PROBABILITY_LEVELS as prob}
                  <button
                    type="button"
                    onclick={() => (probabilityScore = prob.score)}
                    class="w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer {
                      probabilityScore === prob.score
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    }"
                  >
                    <div class="font-bold">{prob.label}</div>
                    <div class="text-[11px] opacity-80 mt-0.5">{prob.description}</div>
                  </button>
                {/each}
              </div>
            </div>
          </div>

          <!-- Mitigation Solutions Tracker -->
          <div class="space-y-1">
            <label for="pia_mitigations" class="block text-xs font-bold text-slate-900">
              Recommended Risk Mitigations & Corrective Controls
            </label>
            <p class="text-[10px] text-slate-500 mb-1">
              Required technical, physical, or organizational countermeasures to bring risk to an acceptable residual level.
            </p>
            <textarea
              id="pia_mitigations"
              bind:value={mitigationSolutions}
              rows={3}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Mandatory MFA, TLS 1.3 in transit, role-based access, automated annual audit logs."
            ></textarea>
          </div>

        </div>
      {/if}

    </div>

    <!-- Modal Footer Navigation -->
    <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
      <div>
        {#if currentStep > 1}
          <button
            type="button"
            onclick={() => (currentStep -= 1)}
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
            onclick={() => (currentStep += 1)}
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-2xs"
          >
            <span>Next Step</span>
            <ChevronRight class="h-4 w-4" />
          </button>
        {:else}
          <button
            type="button"
            disabled={isSaving}
            onclick={handleFinalSave}
            class="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            <Check class="h-4 w-4" />
            <span>{isSaving ? 'Saving Assessment...' : 'Record PIA Assessment'}</span>
          </button>
        {/if}
      </div>
    </div>

  </div>
</div>
