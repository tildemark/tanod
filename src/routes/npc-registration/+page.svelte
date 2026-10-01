<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getOrganization,
    updateOrganization,
    listPrivacyOfficers
  } from '$lib/api/admin';
  import { listStatutoryDocuments, openStatutoryDocument } from '$lib/api/vault';
  import type { StatutoryDocument } from '$lib/types/vault';
  import { listProcesses } from '$lib/api/ropa';
  import type { Organization, PrivacyOfficer } from '$lib/types/organization';
  import {
    Award,
    Copy,
    Check,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    ShieldCheck,
    Clock,
    RefreshCw,
    FolderLock,
    Save
  } from 'lucide-svelte';

  let org = $state<Organization | null>(null);
  let privacyOfficers = $state<PrivacyOfficer[]>([]);
  let vaultDocuments = $state<StatutoryDocument[]>([]);
  let ropaProcessCount = $state(0);
  let isLoading = $state(true);
  let isSaving = $state(false);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let copiedField = $state<string | null>(null);

  // Editable NPCRS Credentials
  let npcRegistrationNumber = $state('');
  let registrationDate = $state('');
  let renewalDeadline = $state('');
  let hasNpcSeal = $state(false);
  let asirDueDate = $state('2027-03-31');

  // Manual override checks for non-vault items
  let manualChecks = $state<Record<string, boolean>>({
    ck_fee: false
  });

  const currentYear = new Date().getFullYear();

  async function loadData() {
    try {
      isLoading = true;
      const fetchedOrg = await getOrganization();
      org = fetchedOrg;

      const [officers, docs, processes] = await Promise.all([
        listPrivacyOfficers(fetchedOrg.id).catch(() => []),
        listStatutoryDocuments(fetchedOrg.id).catch(() => []),
        listProcesses(fetchedOrg.id).catch(() => [])
      ]);

      privacyOfficers = officers;
      vaultDocuments = docs;
      ropaProcessCount = processes.length;

      // Populate form fields
      npcRegistrationNumber = fetchedOrg.npc_registration_number || '';
      registrationDate = fetchedOrg.registration_date || '';
      renewalDeadline = fetchedOrg.renewal_deadline || '';
      const sealInVault = docs.some(d => d.category === 'NPC_SEAL_OF_REGISTRATION');
      hasNpcSeal = Boolean(fetchedOrg.has_npc_seal) || sealInVault;
      asirDueDate = fetchedOrg.asir_due_date || '2027-03-31';
    } catch (err: any) {
      statusMessage = { type: 'error', text: err?.toString() || 'Failed to load NPCRS registry data.' };
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  async function handleSaveCredentials() {
    if (!org) return;
    isSaving = true;
    statusMessage = null;

    try {
      const updated = await updateOrganization(org.id, {
        ...org,
        npc_registration_number: npcRegistrationNumber || null,
        registration_date: registrationDate || null,
        renewal_deadline: renewalDeadline || null,
        has_npc_seal: hasNpcSeal,
        asir_due_date: asirDueDate || null
      });

      org = updated;
      statusMessage = { type: 'success', text: 'NPCRS Registration credentials saved successfully.' };
    } catch (err: any) {
      statusMessage = { type: 'error', text: err?.toString() || 'Failed to update NPCRS credentials.' };
    } finally {
      isSaving = false;
    }
  }

  async function copyToClipboard(key: string, val: string | null | undefined) {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      copiedField = key;
      setTimeout(() => {
        if (copiedField === key) copiedField = null;
      }, 2000);
    } catch (e) {
      console.error('Clipboard copy failed', e);
    }
  }

  async function handleOpenFile(filePath: string) {
    try {
      await openStatutoryDocument(filePath);
    } catch (err) {
      alert('Failed to launch document: ' + err);
    }
  }

  // Auto-calculated checklist items linked to Statutory Document Vault & System State
  let checklistItems = $derived(() => {
    // Current year or all vault docs
    const currentYearDocs = vaultDocuments.filter((d) => d.year === currentYear);

    // Document checks
    const secDoc = vaultDocuments.find((d) => d.category === 'SEC_GIS' || d.category === 'OTHER_COMPLIANCE' && d.title.toLowerCase().includes('sec'));
    const gisDoc = currentYearDocs.find((d) => d.category === 'SEC_GIS');
    const bpermitDoc = currentYearDocs.find((d) => d.category === 'OTHER_COMPLIANCE' && d.title.toLowerCase().includes('permit'));
    const secCertDoc = vaultDocuments.find((d) => d.category === 'SECRETARY_CERTIFICATE' || d.category === 'BOARD_RESOLUTION');
    const dpoFormDoc = currentYearDocs.find((d) => d.category === 'NOTARIZED_DPO_FORM');
    const asirDoc = currentYearDocs.find((d) => d.category === 'OTHER_COMPLIANCE' && d.title.toLowerCase().includes('asir'));
    
    // NPC Certificate & Seal checks
    const npcCertDoc = currentYearDocs.find((d) => d.category === 'NPC_REGISTRATION_CERT') ||
      vaultDocuments.find((d) => d.category === 'NPC_REGISTRATION_CERT');
    const npcSealDoc = currentYearDocs.find((d) => d.category === 'NPC_SEAL_OF_REGISTRATION') ||
      vaultDocuments.find((d) => d.category === 'NPC_SEAL_OF_REGISTRATION');

    // DPO email check (role-based)
    const hasRoleDpoEmail = Boolean(
      org?.dpo_email &&
      (org.dpo_email.toLowerCase().startsWith('dpo@') ||
       org.dpo_email.toLowerCase().startsWith('privacy@') ||
       org.dpo_email.toLowerCase().includes('dpo') ||
       org.dpo_email.toLowerCase().includes('compliance'))
    );

    const hasRopa = ropaProcessCount > 0;

    return [
      {
        id: 'ck_sec',
        label: 'SEC / DTI Certificate of Registration',
        hint: 'Certified copy from the Securities and Exchange Commission or DTI',
        autoVerified: Boolean(secDoc),
        doc: secDoc,
        checked: Boolean(secDoc),
        source: 'Document Vault'
      },
      {
        id: 'ck_gis',
        label: `General Information Sheet (${currentYear} GIS)`,
        hint: `Latest annual GIS filed with the SEC verifying corporate officers for ${currentYear}`,
        autoVerified: Boolean(gisDoc),
        doc: gisDoc,
        checked: Boolean(gisDoc),
        source: `Document Vault (${currentYear})`
      },
      {
        id: 'ck_secrep',
        label: "Secretary's Certificate / Board Resolution",
        hint: 'Notarized document authorizing the DPO designation',
        autoVerified: Boolean(secCertDoc),
        doc: secCertDoc,
        checked: Boolean(secCertDoc),
        source: 'Document Vault'
      },
      {
        id: 'ck_dpoform',
        label: `NPCRS Notarized DPO Application Form (${currentYear})`,
        hint: 'Exported from NPCRS portal, signed by DPO + Head of Agency, with notary seal',
        autoVerified: Boolean(dpoFormDoc),
        doc: dpoFormDoc,
        checked: Boolean(dpoFormDoc),
        source: `Document Vault (${currentYear})`
      },
      {
        id: 'ck_bpermit',
        label: `Valid Business Permit (${currentYear})`,
        hint: 'Current LGU Business Permit / Mayor\'s Permit (deposit in Vault under Other Compliance)',
        autoVerified: Boolean(bpermitDoc),
        doc: bpermitDoc,
        checked: Boolean(bpermitDoc),
        source: `Document Vault (${currentYear})`
      },
      {
        id: 'ck_npc_cert',
        label: 'Official NPC Certificate of Registration',
        hint: 'Scanned official Certificate of Registration issued by the National Privacy Commission',
        autoVerified: Boolean(npcCertDoc),
        doc: npcCertDoc,
        checked: Boolean(npcCertDoc),
        source: npcCertDoc ? `Document Vault (${npcCertDoc.year})` : 'Document Vault',
        targetCategory: 'NPC_REGISTRATION_CERT'
      },
      {
        id: 'ck_npc_seal',
        label: 'Official NPC Seal of Registration',
        hint: 'High-res seal graphic/file awarded by NPC for website & physical premises display',
        autoVerified: Boolean(npcSealDoc),
        doc: npcSealDoc,
        checked: Boolean(npcSealDoc),
        source: npcSealDoc ? `Document Vault (${npcSealDoc.year})` : 'Document Vault',
        targetCategory: 'NPC_SEAL_OF_REGISTRATION'
      },
      {
        id: 'ck_dpoemail',
        label: 'Position-Dedicated DPO Email Address',
        hint: `Must be role-based (e.g. ${org?.dpo_email || 'dpo@company.ph'}), not personal mail`,
        autoVerified: hasRoleDpoEmail,
        doc: null,
        checked: hasRoleDpoEmail,
        source: hasRoleDpoEmail ? `Governance Profile (${org?.dpo_email})` : 'Governance Profile'
      },
      {
        id: 'ck_ropa',
        label: 'Updated Internal ROPA Registry',
        hint: 'NPC Circular 2022-04 statutory readiness requirement',
        autoVerified: hasRopa,
        doc: null,
        checked: hasRopa,
        source: `ROPA Registry (${ropaProcessCount} activities)`
      },
      {
        id: 'ck_asir',
        label: 'Annual Security Incident Report (ASIR) Archive',
        hint: 'Proof of previous year ASIR filed via NPC DBNMS portal before March 31',
        autoVerified: Boolean(asirDoc),
        doc: asirDoc,
        checked: Boolean(asirDoc),
        source: `Document Vault (${currentYear})`
      },
      {
        id: 'ck_fee',
        label: 'NPCRS Registration / Renewal Fee Prepared',
        hint: 'Payable via Landbank, DBP, or NPCRS payment gateway upon submission validation',
        autoVerified: false,
        doc: null,
        checked: Boolean(manualChecks.ck_fee),
        source: 'Manual Verification'
      }
    ];
  });

  let readyCount = $derived(checklistItems().filter((c) => c.checked).length);
  let totalCheckCount = $derived(checklistItems().length);
  let isAllReady = $derived(readyCount === totalCheckCount);

  let archivedNpcCertDoc = $derived(
    vaultDocuments.find((d) => d.year === currentYear && d.category === 'NPC_REGISTRATION_CERT') ||
    vaultDocuments.find((d) => d.category === 'NPC_REGISTRATION_CERT')
  );
  let archivedNpcSealDoc = $derived(
    vaultDocuments.find((d) => d.year === currentYear && d.category === 'NPC_SEAL_OF_REGISTRATION') ||
    vaultDocuments.find((d) => d.category === 'NPC_SEAL_OF_REGISTRATION')
  );

  // Renewal countdown
  let renewalDays = $derived(() => {
    if (!org?.renewal_deadline) return null;
    const diff = new Date(org.renewal_deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });
</script>

<svelte:head>
  <title>NPCRS Registry & Portal Helper — TANOD</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header Banner -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
    <div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
          NPC Circular 2022-04
        </span>
        <span class="text-xs text-slate-500 font-mono">Official Regulatory Gateway</span>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">NPCRS Registry & Portal Helper</h1>
      <p class="text-sm text-slate-600 mt-1 max-w-3xl">
        Manage official National Privacy Commission registration credentials, monitor statutory renewal readiness synchronized directly with your Document Vault, and fast-track online submissions.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <a
        href="https://npcregistration.privacy.gov.ph"
        target="_blank"
        rel="noreferrer"
        class="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer"
      >
        <ExternalLink class="w-4 h-4" />
        Open NPCRS Portal
      </a>
      <button
        onclick={loadData}
        class="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-2xs"
        title="Refresh synchronization"
      >
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
      </button>
    </div>
  </div>

  <!-- Status Alert -->
  {#if statusMessage}
    <div class="p-3.5 rounded-lg border text-xs flex items-center gap-2 {statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}">
      {#if statusMessage.type === 'success'}
        <CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-600" />
      {:else}
        <AlertCircle class="h-4 w-4 shrink-0 text-rose-600" />
      {/if}
      <span>{statusMessage.text}</span>
    </div>
  {/if}

  {#if isLoading}
    <div class="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
      <div class="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3"></div>
      Synchronizing NPCRS Registry with Statutory Document Vault...
    </div>
  {:else}
    <!-- SECTION 1: OFFICIAL REGISTRATION CREDENTIALS & SEAL -->
    <form onsubmit={(e) => { e.preventDefault(); handleSaveCredentials(); }} class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-amber-500/20 text-amber-900 border border-amber-500/30">
            <Award class="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">Official NPC Registration Credentials</h3>
            <p class="text-[11px] text-slate-500">Certificate of Registration & statutory DPS registration numbers issued by the NPC.</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs font-mono px-2.5 py-1 rounded-full border font-semibold {hasNpcSeal ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}">
            {hasNpcSeal ? '🛡️ NPC Seal Awarded' : 'Registration In Progress'}
          </span>
          {#if renewalDays() !== null}
            <span class="text-xs font-mono px-2.5 py-1 rounded-full border font-semibold {renewalDays()! < 0 ? 'bg-rose-100 text-rose-800 border-rose-300' : renewalDays()! <= 30 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'}">
              {renewalDays()! < 0 ? `Overdue by ${Math.abs(renewalDays()!)}d` : `${renewalDays()}d to renewal`}
            </span>
          {/if}
        </div>
      </div>

      <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label for="npc_reg" class="block text-xs font-semibold text-slate-700 mb-1">NPC Registration No. / Certificate Code</label>
          <input
            id="npc_reg"
            type="text"
            bind:value={npcRegistrationNumber}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white font-mono"
            placeholder="e.g. PIC-REG-2024-009182"
          />
        </div>

        <div>
          <label for="reg_date" class="block text-xs font-semibold text-slate-700 mb-1">Date of Registration / Issuance</label>
          <input
            id="reg_date"
            type="date"
            bind:value={registrationDate}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
          />
        </div>

        <div>
          <label for="renewal_date" class="block text-xs font-semibold text-slate-700 mb-1">Annual Renewal Deadline *</label>
          <input
            id="renewal_date"
            type="date"
            bind:value={renewalDeadline}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white font-semibold text-amber-950"
          />
        </div>

        <div>
          <label for="asir_date" class="block text-xs font-semibold text-slate-700 mb-1">Annual ASIR Filing Due Date</label>
          <input
            id="asir_date"
            type="date"
            bind:value={asirDueDate}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
          />
          <p class="text-[10px] text-slate-500 mt-1">NPC mandates March 31 submission for Annual Security Incident Reports via DBNMS.</p>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-100 sm:col-span-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <input
                id="npc_seal_checkbox"
                type="checkbox"
                bind:checked={hasNpcSeal}
                class="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label for="npc_seal_checkbox" class="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                Official NPC Seal of Registration awarded & verified
              </label>
            </div>

            <!-- Vault Document Shortcuts for Certificate & Seal -->
            <div class="flex items-center gap-2 flex-wrap">
              {#if archivedNpcCertDoc}
                <button
                  type="button"
                  onclick={() => handleOpenFile(archivedNpcCertDoc.file_path)}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Open Certificate in Windows app"
                >
                  <span>📜 Scanned Cert: {archivedNpcCertDoc.year}</span>
                </button>
              {:else}
                <a
                  href="/vault?category=NPC_REGISTRATION_CERT&year={currentYear}"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                >
                  <span>+ Archive Scanned Cert</span>
                </a>
              {/if}

              {#if archivedNpcSealDoc}
                <button
                  type="button"
                  onclick={() => handleOpenFile(archivedNpcSealDoc.file_path)}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Open Official Seal image/file"
                >
                  <span>🛡️ Official Seal ({archivedNpcSealDoc.year})</span>
                </button>
              {:else}
                <a
                  href="/vault?category=NPC_SEAL_OF_REGISTRATION&year={currentYear}"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                >
                  <span>+ Archive NPC Seal</span>
                </a>
              {/if}
            </div>
          </div>
        </div>

        <div class="flex items-end justify-end sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            <Save class="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save NPCRS Credentials'}</span>
          </button>
        </div>
      </div>
    </form>

    <!-- SECTION 2: VAULT-LINKED RENEWAL CHECKLIST -->
    <div class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>DPO Renewal & Registration Statutory Checklist</span>
            <span class="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              ⚡ Vault Auto-Synchronized
            </span>
          </h2>
          <p class="text-[11px] text-slate-500">
            Automatically queries your <strong>Statutory Document Vault</strong> for required filings under NPC Circular 2022-04.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <a
            href="/vault"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <FolderLock class="h-3.5 w-3.5 text-emerald-600" />
            <span>Deposit Documents in Vault</span>
          </a>
          <span class="text-xs font-mono font-bold px-3 py-1 rounded-full border {
            isAllReady ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
          }">
            {readyCount}/{totalCheckCount} Ready
          </span>
        </div>
      </div>

      <!-- Checklist Items Grid -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {#each checklistItems() as item}
          <div class="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors {item.checked ? 'bg-emerald-50/30' : ''}">
            <div class="flex items-start gap-3">
              {#if item.autoVerified}
                <div class="mt-0.5 h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check class="h-3 w-3 stroke-[3]" />
                </div>
              {:else if item.id === 'ck_fee'}
                <input
                  id={item.id}
                  type="checkbox"
                  bind:checked={manualChecks.ck_fee}
                  class="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600 cursor-pointer"
                />
              {:else}
                <div class="mt-0.5 h-4 w-4 rounded-full border border-slate-300 bg-white shrink-0"></div>
              {/if}

              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold {item.checked ? 'text-emerald-950' : 'text-slate-800'}">{item.label}</span>
                  <span class="text-[10px] font-mono px-2 py-0.2 rounded {item.autoVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                    {item.source}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500">{item.hint}</p>
              </div>
            </div>

            <div class="shrink-0 flex items-center gap-2">
              {#if item.doc}
                {@const d = item.doc}
                <button
                  type="button"
                  onclick={() => handleOpenFile(d.file_path)}
                  class="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-200 transition-colors cursor-pointer"
                >
                  View in Vault
                </button>
              {:else if !item.checked}
                <a
                  href={item.targetCategory ? `/vault?category=${item.targetCategory}&year=${currentYear}` : '/vault'}
                  class="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors"
                >
                  Upload File
                </a>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if isAllReady}
        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
          <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p class="font-bold">All documents & prerequisites satisfied!</p>
            <p class="text-[11px] text-emerald-800 mt-0.5">
              Your organization is in full audit-ready standing. You can proceed to <a href="https://npcregistration.privacy.gov.ph" target="_blank" class="underline font-bold">npcregistration.privacy.gov.ph</a> to complete your filing.
            </p>
          </div>
        </div>
      {:else}
        <div class="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
          <AlertCircle class="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p class="font-bold">{checklistItems().filter((c) => !c.checked).length} item(s) pending completion.</p>
            <p class="text-[11px] text-amber-800 mt-0.5">
              Upload the missing certificates or filings to the Statutory Document Vault to prevent NPC registration deficiency notices (strict 5-day window to cure).
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- SECTION 3: NPCRS COPY-PASTE PORTAL COMPANION -->
    <div class="space-y-3">
      <div>
        <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
          📋 NPCRS Portal Copy-Paste Companion
        </h2>
        <p class="text-[11px] text-slate-500">
          Click any field to copy its exact pre-formatted value for rapid entry into the online NPCRS application forms.
        </p>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        <!-- Head of Organization -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p class="text-xs font-bold text-slate-900">Head of Organization / Agency Name</p>
            <p class="text-[11px] font-mono text-slate-500">{org?.head_name || 'Not configured in Entity Profile'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('head_name', org?.head_name)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            {#if copiedField === 'head_name'}
              <Check class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-emerald-700">Copied</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>Copy</span>
            {/if}
          </button>
        </div>

        <!-- Head Designation -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p class="text-xs font-bold text-slate-900">Head of Organization Title / Designation</p>
            <p class="text-[11px] font-mono text-slate-500">{org?.head_title || 'Not configured in Entity Profile'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('head_title', org?.head_title)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            {#if copiedField === 'head_title'}
              <Check class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-emerald-700">Copied</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>Copy</span>
            {/if}
          </button>
        </div>

        <!-- Official DPO Email -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p class="text-xs font-bold text-slate-900">Official Position-Dedicated DPO Email</p>
            <p class="text-[11px] font-mono text-slate-500">{org?.dpo_email || 'Not configured in Entity Profile'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('dpo_email', org?.dpo_email)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            {#if copiedField === 'dpo_email'}
              <Check class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-emerald-700">Copied</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>Copy</span>
            {/if}
          </button>
        </div>

        <!-- TIN -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p class="text-xs font-bold text-slate-900">Tax Identification Number (TIN)</p>
            <p class="text-[11px] font-mono text-slate-500">{org?.tin_number || 'Not configured in Entity Profile'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('tin', org?.tin_number)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            {#if copiedField === 'tin'}
              <Check class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-emerald-700">Copied</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>Copy</span>
            {/if}
          </button>
        </div>

        <!-- Entity Classification & Sector -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p class="text-xs font-bold text-slate-900">Classification & Sector</p>
            <p class="text-[11px] font-mono text-slate-500">{org?.entity_type} — {org?.sector || 'Private'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('classification', `${org?.entity_type} - ${org?.sector || 'Private'}`)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            {#if copiedField === 'classification'}
              <Check class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-emerald-700">Copied</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>Copy</span>
            {/if}
          </button>
        </div>

        <!-- ROPA Processing Count -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div>
            <p class="text-xs font-bold text-slate-900">Total Documented Processing Activities (ROPA Count)</p>
            <p class="text-[11px] font-mono text-slate-500">{ropaProcessCount} documented systems</p>
          </div>
          <button
            onclick={() => copyToClipboard('ropa_count', String(ropaProcessCount))}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            {#if copiedField === 'ropa_count'}
              <Check class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-emerald-700">Copied</span>
            {:else}
              <Copy class="h-3.5 w-3.5" />
              <span>Copy Count</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
