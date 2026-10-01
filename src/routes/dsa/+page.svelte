<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrganization } from '$lib/api/admin';
  import { listStatutoryDocuments, openStatutoryDocument } from '$lib/api/vault';
  import {
    listDataSharingAgreements,
    createDataSharingAgreement,
    updateDataSharingAgreement,
    deleteDataSharingAgreement
  } from '$lib/api/dsa';
  import type { Organization } from '$lib/types/organization';
  import type { StatutoryDocument } from '$lib/types/vault';
  import type { DataSharingAgreement, AgreementType, DsaStatus, CreateDsaPayload, UpdateDsaPayload } from '$lib/types/dsa';
  import {
    Users, Plus, Search, Calendar, FileText, CheckCircle2,
    AlertCircle, Clock, Trash2, Edit3, ArrowUpRight, ShieldCheck,
    Check, X, ExternalLink, Filter, FolderLock
  } from 'lucide-svelte';

  let org = $state<Organization | null>(null);
  let agreements = $state<DataSharingAgreement[]>([]);
  let vaultDocuments = $state<StatutoryDocument[]>([]);
  let isLoading = $state(true);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & search
  let searchQuery = $state('');
  let typeFilter = $state<string>('ALL');
  let statusFilter = $state<string>('ALL');

  // Modal state
  let isModalOpen = $state(false);
  let editingDsa = $state<DataSharingAgreement | null>(null);
  let isSaving = $state(false);

  // Form state
  let formCounterparty = $state('');
  let formAgreementType = $state<AgreementType>('OUTSOURCING_PIP');
  let formDescription = $state('');
  let formDataCategories = $state('Employee Records, Identification Details');
  let formDataSubjects = $state('Employees, Customers');
  let formPurpose = $state('');
  let formLawfulBasis = $state('Contractual Obligation (DPA Sec. 12(b))');
  let formEffectiveDate = $state(new Date().toISOString().split('T')[0]);
  let formExpirationDate = $state(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  let formAutoRenew = $state(false);
  let formStatus = $state<DsaStatus>('ACTIVE');
  let formPipCertified = $state(true);
  let formSecurityMeasures = $state('Confidentiality Clause, Encrypted Transit, Right to Audit (Sec. 14)');
  let formVaultDocId = $state<string>('');

  const AGREEMENT_TYPES: { value: AgreementType; label: string; desc: string; badge: string }[] = [
    {
      value: 'OUTSOURCING_PIP',
      label: 'Data Outsourcing (PIP / Sub-contracting)',
      desc: 'Subcontracting personal data processing to third-party processor (DPA Sec. 14 & IRR Sec. 21)',
      badge: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      value: 'DATA_SHARING',
      label: 'Data Sharing Agreement (Co-PIC / PIC-to-PIC)',
      desc: 'Joint processing or sharing between Personal Information Controllers (NPC Circular 16-02 / 2020-03)',
      badge: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    {
      value: 'CROSS_BORDER',
      label: 'Cross-Border Data Transfer',
      desc: 'Transborder flow of personal data subject to adequacy or contractual safeguards (IRR Sec. 21(c))',
      badge: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      value: 'INTER_AGENCY',
      label: 'Inter-Agency Data Sharing (Govt)',
      desc: 'Public sector data sharing governed under NPC Circular 16-02 Rule 3',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  ];

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      const fetchedOrg = await getOrganization();
      org = fetchedOrg;

      const [dsaList, vaultList] = await Promise.all([
        listDataSharingAgreements(fetchedOrg.id).catch(() => []),
        listStatutoryDocuments(fetchedOrg.id).catch(() => [])
      ]);
      agreements = dsaList;
      vaultDocuments = vaultList;
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to load DSA records.' };
    } finally {
      isLoading = false;
    }
  }

  function resetForm() {
    editingDsa = null;
    formCounterparty = '';
    formAgreementType = 'OUTSOURCING_PIP';
    formDescription = '';
    formDataCategories = 'Employee Records, Contact Information';
    formDataSubjects = 'Employees, Service Users';
    formPurpose = '';
    formLawfulBasis = 'Contractual Obligation (DPA Sec. 12(b))';
    formEffectiveDate = new Date().toISOString().split('T')[0];
    formExpirationDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
    formAutoRenew = false;
    formStatus = 'ACTIVE';
    formPipCertified = true;
    formSecurityMeasures = 'Confidentiality Agreement, Access Control, Security Audit Rights';
    formVaultDocId = '';
  }

  function openCreateModal() {
    resetForm();
    isModalOpen = true;
  }

  function openEditModal(dsa: DataSharingAgreement) {
    editingDsa = dsa;
    formCounterparty = dsa.counterparty_name;
    formAgreementType = dsa.agreement_type;
    formDescription = dsa.description || '';
    formDataCategories = dsa.data_categories;
    formDataSubjects = dsa.data_subjects || '';
    formPurpose = dsa.purpose;
    formLawfulBasis = dsa.lawful_basis || '';
    formEffectiveDate = dsa.effective_date;
    formExpirationDate = dsa.expiration_date;
    formAutoRenew = dsa.auto_renew;
    formStatus = dsa.status;
    formPipCertified = dsa.pip_compliance_certified;
    formSecurityMeasures = dsa.security_measures || '';
    formVaultDocId = dsa.vault_document_id || '';
    isModalOpen = true;
  }

  async function handleSave() {
    if (!org || !formCounterparty.trim() || !formPurpose.trim()) {
      alert('Please fill in Partner/Vendor Name and Processing Purpose.');
      return;
    }

    isSaving = true;
    statusMessage = null;

    try {
      if (editingDsa) {
        const payload: UpdateDsaPayload = {
          counterparty_name: formCounterparty.trim(),
          agreement_type: formAgreementType,
          description: formDescription.trim() || undefined,
          data_categories: formDataCategories.trim(),
          data_subjects: formDataSubjects.trim() || undefined,
          purpose: formPurpose.trim(),
          lawful_basis: formLawfulBasis.trim() || undefined,
          effective_date: formEffectiveDate,
          expiration_date: formExpirationDate,
          auto_renew: formAutoRenew,
          status: formStatus,
          pip_compliance_certified: formPipCertified,
          security_measures: formSecurityMeasures.trim() || undefined,
          vault_document_id: formVaultDocId || undefined
        };
        await updateDataSharingAgreement(editingDsa.id, payload);
        statusMessage = { type: 'success', text: `Agreement with "${payload.counterparty_name}" updated successfully.` };
      } else {
        const payload: CreateDsaPayload = {
          org_id: org.id,
          counterparty_name: formCounterparty.trim(),
          agreement_type: formAgreementType,
          description: formDescription.trim() || undefined,
          data_categories: formDataCategories.trim(),
          data_subjects: formDataSubjects.trim() || undefined,
          purpose: formPurpose.trim(),
          lawful_basis: formLawfulBasis.trim() || undefined,
          effective_date: formEffectiveDate,
          expiration_date: formExpirationDate,
          auto_renew: formAutoRenew,
          pip_compliance_certified: formPipCertified,
          security_measures: formSecurityMeasures.trim() || undefined,
          vault_document_id: formVaultDocId || undefined
        };
        await createDataSharingAgreement(payload);
        statusMessage = { type: 'success', text: `New Data Sharing / Outsourcing Agreement registered.` };
      }
      isModalOpen = false;
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to save agreement.' };
    } finally {
      isSaving = false;
    }
  }

  async function handleDelete(id: string, counterparty: string) {
    if (!confirm(`Are you sure you want to delete the agreement with "${counterparty}"?`)) return;
    try {
      await deleteDataSharingAgreement(id);
      statusMessage = { type: 'success', text: `Agreement record removed.` };
      await loadData();
    } catch (e: any) {
      statusMessage = { type: 'error', text: e?.toString() || 'Failed to delete agreement.' };
    }
  }

  async function handleOpenVaultDoc(filePath: string) {
    try {
      await openStatutoryDocument(filePath);
    } catch (e: any) {
      alert('Failed to open document: ' + e);
    }
  }

  function getDaysUntil(dateStr: string): number {
    const target = new Date(dateStr);
    const now = new Date();
    target.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  let filteredAgreements = $derived.by(() => {
    return agreements.filter(dsa => {
      const matchSearch = !searchQuery.trim() || 
        dsa.counterparty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dsa.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dsa.data_categories.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchType = typeFilter === 'ALL' || dsa.agreement_type === typeFilter;
      const matchStatus = statusFilter === 'ALL' || dsa.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  });

  let stats = $derived.by(() => {
    const total = agreements.length;
    const active = agreements.filter(a => a.status === 'ACTIVE').length;
    const expiring = agreements.filter(a => a.status === 'EXPIRING').length;
    const expired = agreements.filter(a => a.status === 'EXPIRED').length;
    const pipCertified = agreements.filter(a => a.pip_compliance_certified).length;
    return { total, active, expiring, expired, pipCertified };
  });

  let dsaVaultDocuments = $derived.by(() => {
    return vaultDocuments.filter(d => d.category === 'DATA_SHARING_AGREEMENT' || d.category === 'OTHER_COMPLIANCE');
  });
</script>

<svelte:head>
  <title>Data Sharing & Vendor Agreements (DSA / PIP) — TANOD</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header Banner -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
    <div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
          RA 10173 Sec. 14 · NPC Circular 16-02 & 2020-03
        </span>
        <span class="text-xs text-slate-500 font-mono">Third-Party Processor Oversight</span>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
        <span>Data Sharing & Outsourcing Agreements</span>
      </h1>
      <p class="text-xs text-slate-600 mt-1 max-w-2xl">
        Monitor third-party Personal Information Processors (PIPs), Data Sharing Agreements (DSAs), transborder data transfers, and automated statutory contract expiration countdowns.
      </p>
    </div>

    <div class="flex items-center gap-3">
      <a
        href="/vault?category=DATA_SHARING_AGREEMENT"
        class="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-2xs"
      >
        <FolderLock class="w-4 h-4 text-emerald-600" />
        <span>Vault DSA Archive</span>
      </a>

      <button
        type="button"
        onclick={openCreateModal}
        class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Register New Agreement</span>
      </button>
    </div>
  </div>

  <!-- Status Alert Messages -->
  {#if statusMessage}
    <div class="p-3.5 rounded-xl border text-xs flex items-center justify-between {
      statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
    }">
      <div class="flex items-center gap-2 font-medium">
        {#if statusMessage.type === 'success'}
          <CheckCircle2 class="h-4 w-4 text-emerald-600" />
        {:else}
          <AlertCircle class="h-4 w-4 text-rose-600" />
        {/if}
        <span>{statusMessage.text}</span>
      </div>
      <button type="button" onclick={() => statusMessage = null} class="text-slate-400 hover:text-slate-600">
        <X class="h-4 w-4" />
      </button>
    </div>
  {/if}

  <!-- KPI Metric Cards -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
      <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Agreements</span>
      <p class="text-2xl font-black font-mono text-slate-900 mt-1">{stats.total}</p>
      <p class="text-[11px] text-slate-400 mt-0.5">Active contracts registry</p>
    </div>

    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
      <span class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Active In Force</span>
      <p class="text-2xl font-black font-mono text-emerald-700 mt-1">{stats.active}</p>
      <p class="text-[11px] text-slate-400 mt-0.5">Compliant & current</p>
    </div>

    <div class="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
      <span class="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Expiring &lt;60 Days</span>
      <p class="text-2xl font-black font-mono text-amber-700 mt-1">{stats.expiring}</p>
      <p class="text-[11px] text-amber-800 mt-0.5">Needs renewal notice</p>
    </div>

    <div class="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
      <span class="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Expired / Deficient</span>
      <p class="text-2xl font-black font-mono text-rose-700 mt-1">{stats.expired}</p>
      <p class="text-[11px] text-rose-800 mt-0.5">Risk of unlawful transfer</p>
    </div>

    <div class="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs col-span-2 md:col-span-1">
      <span class="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">PIP Security Certified</span>
      <p class="text-2xl font-black font-mono text-blue-700 mt-1">{stats.pipCertified}</p>
      <p class="text-[11px] text-blue-800 mt-0.5">Sec. 14 certified vendor</p>
    </div>
  </div>

  <!-- Filter & Search Toolbar -->
  <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div class="relative flex-1 max-w-md">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search partner, vendor, purpose, or data category..."
        class="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-slate-800"
      />
    </div>

    <div class="flex items-center gap-2 flex-wrap text-xs">
      <div class="flex items-center gap-1.5">
        <Filter class="h-3.5 w-3.5 text-slate-400" />
        <span class="font-semibold text-slate-600">Type:</span>
        <select
          bind:value={typeFilter}
          class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">All Types</option>
          <option value="OUTSOURCING_PIP">Data Outsourcing (PIP)</option>
          <option value="DATA_SHARING">Data Sharing (Co-PIC)</option>
          <option value="CROSS_BORDER">Cross-Border Transfer</option>
          <option value="INTER_AGENCY">Inter-Agency (Govt)</option>
        </select>
      </div>

      <div class="flex items-center gap-1.5">
        <span class="font-semibold text-slate-600">Status:</span>
        <select
          bind:value={statusFilter}
          class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRING">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Agreements Table & Empty States -->
  {#if isLoading}
    <div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
      <div class="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
      Loading Data Sharing & Outsourcing Records...
    </div>
  {:else if filteredAgreements.length === 0}
    <div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
      <div class="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
        <Users class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-800">No Data Sharing or Outsourcing Agreements Logged</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Under Philippine DPA Sec. 14, every Personal Information Controller (PIC) outsourcing data processing to a cloud provider, payroll vendor, or partner must execute a formal agreement.
        </p>
      </div>
      <button
        type="button"
        onclick={openCreateModal}
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
      >
        <Plus class="h-3.5 w-3.5" />
        <span>Register First Agreement</span>
      </button>
    </div>
  {:else}
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <th class="py-3 px-4">Partner / Vendor Name</th>
              <th class="py-3 px-4">Agreement Classification</th>
              <th class="py-3 px-4">Data Categories Shared</th>
              <th class="py-3 px-4">Statutory Safeguards</th>
              <th class="py-3 px-4">Expiration / Countdown</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each filteredAgreements as dsa (dsa.id)}
              {@const typeDef = AGREEMENT_TYPES.find(t => t.value === dsa.agreement_type)}
              {@const daysLeft = getDaysUntil(dsa.expiration_date)}
              <tr class="hover:bg-slate-50/70 transition-colors">
                <!-- Partner Name & Purpose -->
                <td class="py-3.5 px-4">
                  <div class="font-bold text-slate-900 text-xs">{dsa.counterparty_name}</div>
                  <div class="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{dsa.purpose}</div>
                  {#if dsa.vault_document_file_path}
                    <button
                      type="button"
                      onclick={() => handleOpenVaultDoc(dsa.vault_document_file_path!)}
                      class="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold hover:underline mt-1"
                    >
                      <FileText class="h-3 w-3" />
                      <span>{dsa.vault_document_title || 'Executed Contract in Vault'}</span>
                    </button>
                  {/if}
                </td>

                <!-- Classification -->
                <td class="py-3.5 px-4">
                  <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border {typeDef?.badge || 'bg-slate-100 text-slate-700'}">
                    {typeDef?.label || dsa.agreement_type}
                  </span>
                  {#if dsa.lawful_basis}
                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">{dsa.lawful_basis}</div>
                  {/if}
                </td>

                <!-- Categories -->
                <td class="py-3.5 px-4 max-w-xs">
                  <div class="text-slate-800 font-medium truncate" title={dsa.data_categories}>
                    {dsa.data_categories}
                  </div>
                  {#if dsa.data_subjects}
                    <div class="text-[10px] text-slate-500 mt-0.5">
                      Subjects: {dsa.data_subjects}
                    </div>
                  {/if}
                </td>

                <!-- Safeguards -->
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    {#if dsa.pip_compliance_certified}
                      <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        <ShieldCheck class="h-3 w-3" /> PIP Certified
                      </span>
                    {/if}
                    {#if dsa.auto_renew}
                      <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        Auto-Renew
                      </span>
                    {/if}
                  </div>
                  {#if dsa.security_measures}
                    <div class="text-[10px] text-slate-500 line-clamp-1 mt-1" title={dsa.security_measures}>
                      🛡️ {dsa.security_measures}
                    </div>
                  {/if}
                </td>

                <!-- Expiration & Countdown -->
                <td class="py-3.5 px-4 font-mono text-[11px]">
                  <div>{dsa.expiration_date}</div>
                  <div class="text-[10px] font-bold mt-0.5 {
                    daysLeft < 0 ? 'text-rose-600' : daysLeft <= 60 ? 'text-amber-600' : 'text-slate-500'
                  }">
                    {#if daysLeft < 0}
                      Expired {Math.abs(daysLeft)}d ago
                    {:else if daysLeft <= 60}
                      ⚠️ {daysLeft} days remaining!
                    {:else}
                      {daysLeft} days remaining
                    {/if}
                  </div>
                </td>

                <!-- Status Badge -->
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border {
                    dsa.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    dsa.status === 'EXPIRING' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    dsa.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    'bg-slate-100 text-slate-700 border-slate-300'
                  }">
                    {dsa.status}
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onclick={() => openEditModal(dsa)}
                      class="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                      title="Edit Agreement Record"
                    >
                      <Edit3 class="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onclick={() => handleDelete(dsa.id, dsa.counterparty_name)}
                      class="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Modal: Create / Edit Data Sharing Agreement -->
{#if isModalOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">
            {editingDsa ? 'Edit Data Sharing / Outsourcing Agreement' : 'Register Third-Party Agreement (DSA / PIP)'}
          </h3>
          <p class="text-xs text-slate-500">Record compliance with Philippine DPA Sec. 14 and NPC Circular 16-02</p>
        </div>
        <button
          type="button"
          onclick={() => isModalOpen = false}
          class="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Counterparty -->
          <div class="sm:col-span-2">
            <label for="dsa_partner" class="block text-xs font-semibold text-slate-700 mb-1">
              Counterparty / Partner / Vendor Name *
            </label>
            <input
              id="dsa_partner"
              type="text"
              bind:value={formCounterparty}
              placeholder="e.g. Amazon Web Services (AWS), PayMongo, Local Logistics Partner"
              required
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-semibold"
            />
          </div>

          <!-- Agreement Type -->
          <div>
            <label for="dsa_type" class="block text-xs font-semibold text-slate-700 mb-1">
              Agreement Classification *
            </label>
            <select
              id="dsa_type"
              bind:value={formAgreementType}
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
            >
              {#each AGREEMENT_TYPES as t}
                <option value={t.value}>{t.label}</option>
              {/each}
            </select>
          </div>

          <!-- Lawful Basis -->
          <div>
            <label for="dsa_lawful" class="block text-xs font-semibold text-slate-700 mb-1">
              Lawful Basis of Sharing / Processing
            </label>
            <select
              id="dsa_lawful"
              bind:value={formLawfulBasis}
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="Contractual Obligation (DPA Sec. 12(b))">Contractual Obligation (Sec. 12(b))</option>
              <option value="Consent of Data Subject (DPA Sec. 12(a))">Consent of Data Subject (Sec. 12(a))</option>
              <option value="Legitimate Interest (DPA Sec. 12(f))">Legitimate Interest (Sec. 12(f))</option>
              <option value="Legal Obligation / Mandate (DPA Sec. 12(c))">Legal Obligation / Mandate (Sec. 12(c))</option>
              <option value="Public Authority / Task (DPA Sec. 12(e))">Public Authority / Function (Sec. 12(e))</option>
            </select>
          </div>

          <!-- Purpose -->
          <div class="sm:col-span-2">
            <label for="dsa_purpose" class="block text-xs font-semibold text-slate-700 mb-1">
              Processing Purpose & Scope of Engagement *
            </label>
            <input
              id="dsa_purpose"
              type="text"
              bind:value={formPurpose}
              placeholder="e.g. Cloud infrastructure hosting of core client databases & backups"
              required
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <!-- Data Categories -->
          <div>
            <label for="dsa_categories" class="block text-xs font-semibold text-slate-700 mb-1">
              Personal Data Categories Shared *
            </label>
            <input
              id="dsa_categories"
              type="text"
              bind:value={formDataCategories}
              placeholder="e.g. Name, Email, TIN, Government ID, Bank Details"
              required
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <!-- Data Subjects -->
          <div>
            <label for="dsa_subjects" class="block text-xs font-semibold text-slate-700 mb-1">
              Data Subjects Covered
            </label>
            <input
              id="dsa_subjects"
              type="text"
              bind:value={formDataSubjects}
              placeholder="e.g. Regular Employees, Customers, Job Applicants"
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <!-- Dates -->
          <div>
            <label for="dsa_effective" class="block text-xs font-semibold text-slate-700 mb-1">
              Effective Date *
            </label>
            <input
              id="dsa_effective"
              type="date"
              bind:value={formEffectiveDate}
              required
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
            />
          </div>

          <div>
            <label for="dsa_expiration" class="block text-xs font-semibold text-slate-700 mb-1">
              Contract Expiration Date *
            </label>
            <input
              id="dsa_expiration"
              type="date"
              bind:value={formExpirationDate}
              required
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
            />
          </div>

          <!-- Link to Document Vault Contract -->
          <div class="sm:col-span-2">
            <label for="dsa_vault_doc" class="block text-xs font-semibold text-slate-700 mb-1">
              Link Executed Contract from Document Vault (Optional)
            </label>
            <select
              id="dsa_vault_doc"
              bind:value={formVaultDocId}
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- No Document Linked (Upload to Vault later) --</option>
              {#each dsaVaultDocuments as vDoc}
                <option value={vDoc.id}>
                  [{vDoc.year}] {vDoc.title} ({vDoc.file_name})
                </option>
              {/each}
            </select>
            <p class="text-[10px] text-slate-500 mt-1">
              You can archive signed PDFs in your <a href="/vault?category=DATA_SHARING_AGREEMENT" class="underline text-purple-700 font-semibold">Document Vault</a> under "Data Sharing Agreement" category.
            </p>
          </div>

          <!-- Security Safeguards -->
          <div class="sm:col-span-2">
            <label for="dsa_security" class="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Security Safeguards (DPA Sec. 14 / IRR Sec. 21)
            </label>
            <input
              id="dsa_security"
              type="text"
              bind:value={formSecurityMeasures}
              placeholder="e.g. Non-Disclosure Agreement, AES-256 at-rest, Right to Audit, Sub-processor consent"
              class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <!-- Checkboxes -->
          <div class="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
            <div class="flex items-center gap-2">
              <input
                id="dsa_pip_cert"
                type="checkbox"
                bind:checked={formPipCertified}
                class="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label for="dsa_pip_cert" class="text-xs font-semibold text-slate-800 cursor-pointer">
                Third-party PIP provides contractual guarantees to implement organizational, physical, and technical measures (DPA Sec. 14)
              </label>
            </div>

            <div class="flex items-center gap-2">
              <input
                id="dsa_auto_renew"
                type="checkbox"
                bind:checked={formAutoRenew}
                class="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <label for="dsa_auto_renew" class="text-xs text-slate-700 cursor-pointer">
                Agreement includes automatic renewal / evergreen clause
              </label>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onclick={() => isModalOpen = false}
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            class="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : editingDsa ? 'Update Agreement' : 'Save Agreement'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
