<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getOrganization,
    updateOrganization,
    saveOrgLogo,
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    listPrivacyOfficers,
    createPrivacyOfficer,
    updatePrivacyOfficer,
    deletePrivacyOfficer
  } from '$lib/api/admin';
  import type { Organization, Department, PrivacyOfficer } from '$lib/types/organization';
  import {
    Building2,
    Shield,
    Users,
    Mail,
    Phone,
    Globe,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Plus,
    Trash2,
    Edit3,
    Upload,
    Save,
    Calendar,
    Crown,
    Copy,
    Check,
    FileSpreadsheet,
    Award,
    ShieldCheck,
    History
  } from 'lucide-svelte';
  import { listSystemAuditLogs, verifyAuditTrailIntegrity, type SystemAuditLog } from '$lib/api/audit';

  // Tabs
  let activeTab = $state<'organization' | 'governance_team' | 'departments' | 'copypaste' | 'audit_trail'>('organization');

  let org = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let privacyOfficers = $state<PrivacyOfficer[]>([]);
  let auditLogs = $state<SystemAuditLog[]>([]);
  let isIntegrityValid = $state<boolean | null>(null);
  let isLoading = $state(true);
  let isSavingOrg = $state(false);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
  let copiedField = $state<string | null>(null);

  // Form Fields (NPCRS statutory fields)
  let name = $state('');
  let slug = $state('');
  let logoPath = $state('');
  let tinNumber = $state('');
  let entityType = $state<'PIC' | 'PIP' | 'BOTH'>('PIC');
  let sector = $state('Private');
  let address = $state('');
  let city = $state('');
  let country = $state('Philippines');
  let phone = $state('');
  let email = $state('');
  let website = $state('');

  // Head of Organization
  let headName = $state('');
  let headTitle = $state('');
  let headEmail = $state('');
  let headPhone = $state('');

  // Primary DPO
  let dpoName = $state('');
  let dpoEmail = $state('');
  let industry = $state('');
  let description = $state('');
  let employeeCount = $state<number | ''>('');

  // NPCRS Registration & Deadlines
  let npcRegistrationNumber = $state('');
  let registrationDate = $state('');
  let renewalDeadline = $state('');
  let hasNpcSeal = $state(false);
  let asirDueDate = $state('2027-03-31');

  let npcNotificationEmail = $state('privacy.complaints@privacy.gov.ph');
  let breachNotificationHours = $state<number>(72);

  // Department modal state
  let isDeptModalOpen = $state(false);
  let editingDept = $state<Department | null>(null);
  let deptName = $state('');
  let deptDescription = $state('');
  let deptError = $state<string | null>(null);
  let deletingDept = $state<Department | null>(null);
  let deleteError = $state<string | null>(null);

  // Privacy Officer modal state
  let isOfficerModalOpen = $state(false);
  let editingOfficer = $state<PrivacyOfficer | null>(null);
  let officerName = $state('');
  let officerTitle = $state('');
  let officerEmail = $state('');
  let officerPhone = $state('');
  let officerRole = $state<'DPO' | 'COP'>('COP');
  let officerIsPrimaryDpo = $state(false);
  let officerAssigned = $state('');
  let officerError = $state<string | null>(null);
  let deletingOfficer = $state<PrivacyOfficer | null>(null);

  async function loadData() {
    try {
      isLoading = true;
      const fetchedOrg = await getOrganization();
      org = fetchedOrg;

      const [fetchedDepts, fetchedOfficers, fetchedLogs, isValid] = await Promise.all([
        listDepartments(fetchedOrg.id),
        listPrivacyOfficers(fetchedOrg.id),
        listSystemAuditLogs(fetchedOrg.id, 100),
        verifyAuditTrailIntegrity()
      ]);

      departments = fetchedDepts;
      privacyOfficers = fetchedOfficers;
      auditLogs = fetchedLogs;
      isIntegrityValid = isValid;

      // Populate Organization & Head fields
      name = fetchedOrg.name || '';
      slug = fetchedOrg.slug || '';
      logoPath = fetchedOrg.logo_path || '';
      tinNumber = fetchedOrg.tin_number || '';
      entityType = fetchedOrg.entity_type || 'PIC';
      sector = fetchedOrg.sector || 'Private';
      address = fetchedOrg.address || '';
      city = fetchedOrg.city || '';
      country = fetchedOrg.country || 'Philippines';
      phone = fetchedOrg.phone || '';
      email = fetchedOrg.email || '';
      website = fetchedOrg.website || '';

      headName = fetchedOrg.head_name || '';
      headTitle = fetchedOrg.head_title || '';
      headEmail = fetchedOrg.head_email || '';
      headPhone = fetchedOrg.head_phone || '';

      dpoName = fetchedOrg.dpo_name || '';
      dpoEmail = fetchedOrg.dpo_email || '';
      industry = fetchedOrg.industry || '';
      description = fetchedOrg.description || '';
      employeeCount = fetchedOrg.employee_count ?? '';

      npcRegistrationNumber = fetchedOrg.npc_registration_number || '';
      registrationDate = fetchedOrg.registration_date || '';
      renewalDeadline = fetchedOrg.renewal_deadline || '';
      hasNpcSeal = Boolean(fetchedOrg.has_npc_seal);
      asirDueDate = fetchedOrg.asir_due_date || '2027-03-31';

      npcNotificationEmail = fetchedOrg.npc_notification_email || 'privacy.complaints@privacy.gov.ph';
      breachNotificationHours = fetchedOrg.breach_notification_hours ?? 72;
    } catch (err: any) {
      statusMessage = { type: 'error', text: err?.toString() || 'Failed to load settings.' };
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'audit_trail' || tabParam === 'governance_team' || tabParam === 'departments' || tabParam === 'copypaste') {
      activeTab = tabParam;
    }
    loadData();
  });

  async function handleSaveOrg() {
    if (!org) return;
    isSavingOrg = true;
    statusMessage = null;

    try {
      const updated = await updateOrganization(org.id, {
        name,
        slug,
        logo_path: logoPath || null,
        tin_number: tinNumber || null,
        entity_type: entityType,
        sector: sector || null,
        address: address || null,
        city: city || null,
        country: country || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        head_name: headName || null,
        head_title: headTitle || null,
        head_email: headEmail || null,
        head_phone: headPhone || null,
        dpo_name: dpoName || null,
        dpo_email: dpoEmail || null,
        industry: industry || null,
        description: description || null,
        employee_count: employeeCount === '' ? null : Number(employeeCount),
        npc_registration_number: npcRegistrationNumber || null,
        registration_date: registrationDate || null,
        renewal_deadline: renewalDeadline || null,
        has_npc_seal: hasNpcSeal,
        asir_due_date: asirDueDate || null,
        npc_notification_email: npcNotificationEmail || null,
        breach_notification_hours: Number(breachNotificationHours)
      });

      org = updated;
      statusMessage = { type: 'success', text: 'NPCRS compliance profile & statutory credentials saved.' };
    } catch (err: any) {
      statusMessage = { type: 'error', text: err?.toString() || 'Failed to update organization profile.' };
    } finally {
      isSavingOrg = false;
    }
  }

  function handleLogoFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const savedPath = await saveOrgLogo(file.name, base64);
        logoPath = savedPath;
        statusMessage = { type: 'success', text: 'Logo saved to local AppData storage.' };
      } catch (err: any) {
        statusMessage = { type: 'error', text: err?.toString() || 'Failed to save logo.' };
      }
    };
    reader.readAsDataURL(file);
  }

  function copyToClipboard(key: string, val: string) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    copiedField = key;
    setTimeout(() => {
      if (copiedField === key) copiedField = null;
    }, 2000);
  }

  // Officer Modals
  function openCreateOfficerModal() {
    editingOfficer = null;
    officerName = '';
    officerTitle = 'Compliance Officer for Privacy (COP)';
    officerEmail = '';
    officerPhone = '';
    officerRole = 'COP';
    officerIsPrimaryDpo = false;
    officerAssigned = '';
    officerError = null;
    isOfficerModalOpen = true;
  }

  function openEditOfficerModal(officer: PrivacyOfficer) {
    editingOfficer = officer;
    officerName = officer.name;
    officerTitle = officer.title;
    officerEmail = officer.email;
    officerPhone = officer.phone || '';
    officerRole = officer.role;
    officerIsPrimaryDpo = officer.is_primary_dpo;
    officerAssigned = officer.assigned_branch_dept || '';
    officerError = null;
    isOfficerModalOpen = true;
  }

  async function handleSaveOfficer() {
    if (!officerName.trim() || !officerEmail.trim()) {
      officerError = 'Name and official email are required.';
      return;
    }

    try {
      if (editingOfficer) {
        await updatePrivacyOfficer(editingOfficer.id, {
          name: officerName.trim(),
          title: officerTitle.trim(),
          email: officerEmail.trim(),
          phone: officerPhone.trim() || undefined,
          role: officerRole,
          is_primary_dpo: officerIsPrimaryDpo,
          assigned_branch_dept: officerAssigned.trim() || undefined
        });
      } else if (org) {
        await createPrivacyOfficer({
          org_id: org.id,
          name: officerName.trim(),
          title: officerTitle.trim(),
          email: officerEmail.trim(),
          phone: officerPhone.trim() || undefined,
          role: officerRole,
          is_primary_dpo: officerIsPrimaryDpo,
          assigned_branch_dept: officerAssigned.trim() || undefined
        });
      }

      isOfficerModalOpen = false;
      if (org) {
        privacyOfficers = await listPrivacyOfficers(org.id);
        const refetched = await getOrganization();
        org = refetched;
        dpoName = refetched.dpo_name || '';
        dpoEmail = refetched.dpo_email || '';
      }
    } catch (err: any) {
      officerError = err?.toString() || 'Failed to save Privacy Officer.';
    }
  }

  async function confirmDeleteOfficer() {
    if (!deletingOfficer) return;
    try {
      await deletePrivacyOfficer(deletingOfficer.id);
      deletingOfficer = null;
      if (org) {
        privacyOfficers = await listPrivacyOfficers(org.id);
      }
    } catch (err: any) {
      alert(err?.toString() || 'Failed to delete officer.');
    }
  }

  // Department Handlers
  function openCreateDeptModal() {
    editingDept = null;
    deptName = '';
    deptDescription = '';
    deptError = null;
    isDeptModalOpen = true;
  }

  function openEditDeptModal(dept: Department) {
    editingDept = dept;
    deptName = dept.name;
    deptDescription = dept.description || '';
    deptError = null;
    isDeptModalOpen = true;
  }

  async function handleSaveDepartment() {
    if (!deptName.trim()) {
      deptError = 'Department name is required.';
      return;
    }

    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: deptName.trim(),
          description: deptDescription.trim() || undefined
        });
      } else if (org) {
        await createDepartment({
          org_id: org.id,
          name: deptName.trim(),
          description: deptDescription.trim() || undefined
        });
      }

      isDeptModalOpen = false;
      if (org) {
        departments = await listDepartments(org.id);
      }
    } catch (err: any) {
      deptError = err?.toString() || 'Failed to save department.';
    }
  }

  async function confirmDeleteDept() {
    if (!deletingDept) return;
    deleteError = null;

    try {
      await deleteDepartment(deletingDept.id);
      deletingDept = null;
      if (org) {
        departments = await listDepartments(org.id);
      }
    } catch (err: any) {
      deleteError = err?.toString() || 'Failed to delete department.';
    }
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between border-b border-slate-200 pb-5">
    <div>
      <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <Building2 class="h-6 w-6 text-slate-700" />
        Governance & NPCRS Registry Setup
      </h2>
      <p class="text-xs text-slate-500 mt-1">
        Official credentials for the National Privacy Commission Registration System (NPC Circular No. 2022-04), Head of Organization sign-offs, and DPO/COP management.
      </p>
    </div>

    <!-- Tab Switcher -->
    <div class="inline-flex p-1 bg-slate-200/80 rounded-lg text-xs font-medium">
      <button
        onclick={() => (activeTab = 'organization')}
        class="px-3.5 py-1.5 rounded-md transition-all {activeTab === 'organization' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        Entity & NPCRS
      </button>
      <button
        onclick={() => (activeTab = 'governance_team')}
        class="px-3.5 py-1.5 rounded-md transition-all {activeTab === 'governance_team' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        Privacy Officers ({privacyOfficers.length})
      </button>
      <button
        onclick={() => (activeTab = 'departments')}
        class="px-3.5 py-1.5 rounded-md transition-all {activeTab === 'departments' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        Divisions ({departments.length})
      </button>
      <button
        onclick={() => (activeTab = 'copypaste')}
        class="px-3.5 py-1.5 rounded-md transition-all {activeTab === 'copypaste' ? 'bg-amber-100 text-amber-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        📋 NPCRS Portal Helper
      </button>
      <button
        onclick={async () => {
          activeTab = 'audit_trail';
          auditLogs = await listSystemAuditLogs(org?.id || '', 100);
          isIntegrityValid = await verifyAuditTrailIntegrity();
        }}
        class="px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 {activeTab === 'audit_trail' ? 'bg-slate-900 text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <History class="h-3.5 w-3.5 text-amber-400" />
        <span>Audit Trail ({auditLogs.length})</span>
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

  {#if isLoading}
    <div class="p-12 text-center text-sm text-slate-500">
      Loading compliance profile from local database...
    </div>
  {:else if activeTab === 'organization'}
    <!-- Entity Profile & NPCRS Form -->
    <form onsubmit={(e) => { e.preventDefault(); handleSaveOrg(); }} class="space-y-6">
      
      <!-- Section 1: Official NPC Registration Status -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-amber-500/5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Award class="h-5 w-5 text-amber-600" />
            <div>
              <h3 class="text-sm font-bold text-slate-900">National Privacy Commission Registration (NPCRS)</h3>
              <p class="text-[11px] text-slate-500">Official certificate and DPS registration credentials under NPC Circular 2022-04.</p>
            </div>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-semibold">
            {hasNpcSeal ? '🛡️ NPC Seal Issued' : 'Registration Pending'}
          </span>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label for="npc_reg" class="block text-xs font-semibold text-slate-700 mb-1">NPC Registration No. / Code</label>
            <input
              id="npc_reg"
              type="text"
              bind:value={npcRegistrationNumber}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              placeholder="e.g. PIC-REG-2024-009182"
            />
          </div>

          <div>
            <label for="reg_date" class="block text-xs font-semibold text-slate-700 mb-1">Date of Registration / Issuance</label>
            <input
              id="reg_date"
              type="date"
              bind:value={registrationDate}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
          </div>

          <div>
            <label for="renewal_date" class="block text-xs font-semibold text-slate-700 mb-1">Annual Renewal Deadline *</label>
            <input
              id="renewal_date"
              type="date"
              bind:value={renewalDeadline}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-semibold text-amber-900"
            />
          </div>

          <div>
            <label for="asir_date" class="block text-xs font-semibold text-slate-700 mb-1">Annual ASIR Due Date</label>
            <input
              id="asir_date"
              type="date"
              bind:value={asirDueDate}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            />
            <p class="text-[10px] text-slate-500 mt-1">NPC mandates March 31 submission for Annual Security Incident Reports.</p>
          </div>

          <div class="flex items-center gap-3 pt-4">
            <input
              id="npc_seal_checkbox"
              type="checkbox"
              bind:checked={hasNpcSeal}
              class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label for="npc_seal_checkbox" class="text-xs font-semibold text-slate-800 cursor-pointer">
              Official NPC Seal of Registration awarded
            </label>
          </div>
        </div>
      </div>

      <!-- Section 2: Statutory Head of Agency / Head of Organization -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Crown class="h-4 w-4 text-slate-700" />
            <div>
              <h3 class="text-sm font-bold text-slate-900">Head of Agency / Head of Organization</h3>
              <p class="text-[11px] text-slate-500">President, CEO, or Head of Agency legally designating the DPO (NPCRS DPO Form Signatory).</p>
            </div>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">NPC Adv. 17-01</span>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label for="head_name" class="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
            <input
              id="head_name"
              type="text"
              bind:value={headName}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Dr. Fernando Gomez, MD, FPCS"
            />
          </div>

          <div>
            <label for="head_title" class="block text-xs font-semibold text-slate-700 mb-1">Corporate Position / Rank *</label>
            <input
              id="head_title"
              type="text"
              bind:value={headTitle}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. President & Chief Executive Officer"
            />
          </div>

          <div>
            <label for="head_email" class="block text-xs font-semibold text-slate-700 mb-1">Official Executive Email</label>
            <input
              id="head_email"
              type="email"
              bind:value={headEmail}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              placeholder="ceo@republichealth.ph"
            />
          </div>

          <div>
            <label for="head_phone" class="block text-xs font-semibold text-slate-700 mb-1">Direct Executive Phone / Line</label>
            <input
              id="head_phone"
              type="tel"
              bind:value={headPhone}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="+63 2 8123 4500"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Entity Classification & Tax ID -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Entity Details & Statutory Classification</h3>
            <p class="text-[11px] text-slate-500">Registered entity identity filed under Philippine SEC / DTI.</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">DPA Sec. 16</span>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label for="org_name" class="block text-xs font-semibold text-slate-700 mb-1">Organization Legal Name *</label>
            <input
              id="org_name"
              type="text"
              bind:value={name}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Republic Health System, Inc."
            />
          </div>

          <div>
            <label for="org_tin" class="block text-xs font-semibold text-slate-700 mb-1">BIR Tax ID Number (TIN) *</label>
            <input
              id="org_tin"
              type="text"
              bind:value={tinNumber}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              placeholder="000-000-000-000"
            />
          </div>

          <div>
            <label for="entity_type_select" class="block text-xs font-semibold text-slate-700 mb-1">Entity Classification *</label>
            <select
              id="entity_type_select"
              bind:value={entityType}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-semibold"
            >
              <option value="PIC">Personal Information Controller (PIC)</option>
              <option value="PIP">Personal Information Processor (PIP)</option>
              <option value="BOTH">Both PIC and PIP</option>
            </select>
          </div>

          <div>
            <label for="org_sector" class="block text-xs font-semibold text-slate-700 mb-1">Sector (NPC Classification)</label>
            <input
              id="org_sector"
              type="text"
              bind:value={sector}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Private - Healthcare"
            />
          </div>

          <div>
            <label for="org_industry" class="block text-xs font-semibold text-slate-700 mb-1">Industry Classification</label>
            <input
              id="org_industry"
              type="text"
              bind:value={industry}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Healthcare & Hospital Operations"
            />
          </div>

          <div>
            <label for="org_employees" class="block text-xs font-semibold text-slate-700 mb-1">Employee Count</label>
            <input
              id="org_employees"
              type="number"
              bind:value={employeeCount}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="450"
            />
          </div>

          <div class="md:col-span-3">
            <label for="org_address" class="block text-xs font-semibold text-slate-700 mb-1">Registered Business Address</label>
            <input
              id="org_address"
              type="text"
              bind:value={address}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="100 Corporate Ave, Bonifacio Global City, Taguig"
            />
          </div>

          <div>
            <label for="org_city" class="block text-xs font-semibold text-slate-700 mb-1">City / Municipality</label>
            <input
              id="org_city"
              type="text"
              bind:value={city}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="Taguig"
            />
          </div>

          <div>
            <label for="org_phone" class="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              id="org_phone"
              type="tel"
              bind:value={phone}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="+63 2 8123 4567"
            />
          </div>

          <div>
            <label for="org_website" class="block text-xs font-semibold text-slate-700 mb-1">Corporate Website</label>
            <input
              id="org_website"
              type="url"
              bind:value={website}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="https://republichealth.ph"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Brand Logo -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Entity Brand Logo</h3>
          <p class="text-[11px] text-slate-500">Stored on local disk (%APPDATA%\tanod\assets\) for official regulatory PDF exports.</p>
        </div>

        <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors border border-slate-200 shadow-xs">
          <Upload class="h-4 w-4" />
          <span>Select Image File</span>
          <input type="file" accept="image/*" onchange={handleLogoFileChange} class="hidden" />
        </label>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSavingOrg}
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-all shadow-sm disabled:opacity-60 cursor-pointer"
        >
          <Save class="h-4 w-4" />
          <span>{isSavingOrg ? 'Saving Changes...' : 'Save NPCRS Profile'}</span>
        </button>
      </div>
    </form>

  {:else if activeTab === 'governance_team'}
    <!-- Privacy Officers (DPO + COPs) -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            Data Privacy Officers & Compliance Officers (COPs)
            <span class="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              NPC Circular 2022-04
            </span>
          </h3>
          <p class="text-[11px] text-slate-500">
            <strong>Rule:</strong> Exactly one (1) Data Protection Officer reports to the NPC. Multiple Compliance Officers for Privacy (COPs) can be assigned to branches and operating divisions.
          </p>
        </div>

        <button
          onclick={openCreateOfficerModal}
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Designate Officer</span>
        </button>
      </div>

      <div class="divide-y divide-slate-100">
        {#each privacyOfficers as officer}
          <div class="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900">{officer.name}</span>
                {#if officer.is_primary_dpo}
                  <span class="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-500/30">
                    <Crown class="h-3 w-3 text-amber-600" />
                    Sole NPC Reporting DPO
                  </span>
                {:else}
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Compliance Officer for Privacy (COP)
                  </span>
                {/if}
              </div>
              <p class="text-[11px] text-slate-600 font-medium">
                {officer.title} • <span class="font-mono text-slate-500">{officer.email}</span>
                {#if officer.phone} • {officer.phone}{/if}
              </p>
              <p class="text-[11px] text-slate-500">
                Scope: {officer.assigned_branch_dept || 'Entity-wide'}
              </p>
            </div>

            <div class="flex items-center gap-1">
              <button
                onclick={() => openEditOfficerModal(officer)}
                class="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Edit Officer"
              >
                <Edit3 class="h-4 w-4" />
              </button>
              {#if !officer.is_primary_dpo}
                <button
                  onclick={() => (deletingOfficer = officer)}
                  class="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove COP"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

  {:else if activeTab === 'departments'}
    <!-- Department Divisions Tab -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Organizational Department Registry</h3>
          <p class="text-[11px] text-slate-500">Departments maintain separate ROPA process registries and PIA evaluations.</p>
        </div>

        <button
          onclick={openCreateDeptModal}
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all cursor-pointer shadow-xs"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Add Department</span>
        </button>
      </div>

      <div class="divide-y divide-slate-100">
        {#each departments as dept}
          <div class="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-900">{dept.name}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {dept.process_count} ROPA Processes
                </span>
              </div>
              <p class="text-[11px] text-slate-500 max-w-lg">{dept.description || 'No description provided.'}</p>
            </div>

            <div class="flex items-center gap-1">
              <button
                onclick={() => openEditDeptModal(dept)}
                class="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Edit Department"
              >
                <Edit3 class="h-4 w-4" />
              </button>
              <button
                onclick={() => { deletingDept = dept; deleteError = null; }}
                class="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete Department"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        {:else}
          <div class="p-8 text-center text-xs text-slate-400">
            No departments defined yet. Click "Add Department" to register organizational divisions.
          </div>
        {/each}
      </div>
    </div>

  {:else if activeTab === 'copypaste'}
    <!-- NPCRS Portal Copy-Paste Helper -->
    <div class="space-y-6">
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 text-amber-900 text-xs space-y-2">
        <h3 class="font-bold flex items-center gap-2 text-sm text-amber-950">
          📋 NPCRS Portal Copy-Paste Companion
        </h3>
        <p>
          The National Privacy Commission (NPC) uses the online NPCRS portal (<a href="https://npcregistration.privacy.gov.ph" target="_blank" class="underline font-semibold">npcregistration.privacy.gov.ph</a>) without a direct public REST API. Use these pre-formatted one-click copy buttons to swiftly populate each mandatory registration field.
        </p>
      </div>

      <!-- Quick Copy Grid -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        
        <!-- Row: Head of Organization -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-900">Head of Organization / Agency Name</p>
            <p class="text-[11px] font-mono text-slate-500">{headName || 'Not configured'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('head_name', headName)}
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

        <div class="p-4 flex items-center justify-between hover:bg-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-900">Head of Organization Title / Designation</p>
            <p class="text-[11px] font-mono text-slate-500">{headTitle || 'Not configured'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('head_title', headTitle)}
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

        <!-- Row: Official DPO Email -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-900">Official Position-Dedicated DPO Email</p>
            <p class="text-[11px] font-mono text-slate-500">{dpoEmail || 'Not configured'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('dpo_email', dpoEmail)}
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

        <!-- Row: TIN -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-900">Tax Identification Number (TIN)</p>
            <p class="text-[11px] font-mono text-slate-500">{tinNumber || 'Not configured'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('tin', tinNumber)}
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

        <!-- Row: Sector & Entity Classification -->
        <div class="p-4 flex items-center justify-between hover:bg-slate-50">
          <div>
            <p class="text-xs font-bold text-slate-900">Classification & Sector</p>
            <p class="text-[11px] font-mono text-slate-500">{entityType} — {sector || 'Private'}</p>
          </div>
          <button
            onclick={() => copyToClipboard('classification', `${entityType} - ${sector}`)}
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

      </div>
    </div>
  {/if}

  <!-- TAB 5: IMMUTABLE TAMPER-EVIDENT AUDIT TRAIL -->
  {#if activeTab === 'audit_trail'}
    <div class="space-y-4">
      <!-- Cryptographic Proof Status Banner -->
      <div class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs {isIntegrityValid ? 'bg-emerald-50/80 border-emerald-300' : 'bg-rose-50/80 border-rose-300'}">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center {isIntegrityValid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-wider {isIntegrityValid ? 'text-emerald-950' : 'text-rose-950'} font-mono">
              {isIntegrityValid ? 'Cryptographic Hash-Chain Intact & Verified' : 'Cryptographic Integrity Warning!'}
            </h3>
            <p class="text-xs {isIntegrityValid ? 'text-emerald-900' : 'text-rose-900'}">
              {isIntegrityValid ? 'Every compliance action is cryptographically chained with SHA-256 hashes (RA 10173 Sec. 20 accountability).' : 'A hash mismatch was detected in the local audit log sequence.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={async () => {
            auditLogs = await listSystemAuditLogs(org?.id || '', 100);
            isIntegrityValid = await verifyAuditTrailIntegrity();
          }}
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs shrink-0"
        >
          Re-verify Audit Trail
        </button>
      </div>

      <!-- Audit Records Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
            Sequential Immutable Log Registry ({auditLogs.length} Events)
          </span>
          <span class="text-[11px] font-mono text-slate-500">Append-Only SQLite WAL</span>
        </div>

        {#if auditLogs.length === 0}
          <div class="p-12 text-center text-xs text-slate-400">
            No audit events recorded yet. Actions across DSR, ROPA, Incidents, and Vault will automatically appear here.
          </div>
        {:else}
          <div class="overflow-x-auto max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {#each auditLogs as log}
              <div class="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                    <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      {log.entity_type}
                    </span>
                    <span class="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p class="font-bold text-slate-900 truncate">{log.summary}</p>
                  {#if log.details && log.details !== '{}'}
                    <p class="text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200/80 truncate">
                      {log.details}
                    </p>
                  {/if}
                </div>

                <div class="text-right shrink-0 font-mono text-[10px] text-slate-400">
                  <div>Hash: <span class="text-slate-600 font-bold">{log.entry_hash.slice(0, 12)}...</span></div>
                  <div>Prev: <span>{log.prev_hash.slice(0, 12)}...</span></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Privacy Officer Modal -->
{#if isOfficerModalOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 class="text-sm font-bold text-slate-900">
          {editingOfficer ? 'Edit Privacy Officer Details' : 'Designate Privacy Officer'}
        </h3>
      </div>

      <div class="p-6 space-y-4">
        {#if officerError}
          <div class="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {officerError}
          </div>
        {/if}

        <div>
          <label for="modal_off_name" class="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
          <input
            id="modal_off_name"
            type="text"
            bind:value={officerName}
            required
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="e.g. Atty. Maria Santos, CIPP/E"
          />
        </div>

        <div>
          <label for="modal_off_title" class="block text-xs font-semibold text-slate-700 mb-1">Designation / Corporate Title *</label>
          <input
            id="modal_off_title"
            type="text"
            bind:value={officerTitle}
            required
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="Data Protection Officer"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="modal_off_role" class="block text-xs font-semibold text-slate-700 mb-1">Statutory Role *</label>
            <select
              id="modal_off_role"
              bind:value={officerRole}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-medium"
            >
              <option value="DPO">DPO (Data Protection Officer)</option>
              <option value="COP">COP (Compliance Officer for Privacy)</option>
            </select>
          </div>

          <div class="flex items-center gap-2 pt-5">
            <input
              id="modal_off_primary"
              type="checkbox"
              bind:checked={officerIsPrimaryDpo}
              class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <label for="modal_off_primary" class="text-xs font-semibold text-slate-800 cursor-pointer">
              Sole NPC Reporter
            </label>
          </div>
        </div>

        <div>
          <label for="modal_off_email" class="block text-xs font-semibold text-slate-700 mb-1">Official Contact Email *</label>
          <input
            id="modal_off_email"
            type="email"
            bind:value={officerEmail}
            required
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
            placeholder="dpo@republichealth.ph"
          />
        </div>

        <div>
          <label for="modal_off_phone" class="block text-xs font-semibold text-slate-700 mb-1">Phone / Extension</label>
          <input
            id="modal_off_phone"
            type="tel"
            bind:value={officerPhone}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="+63 2 8123 4567"
          />
        </div>

        <div>
          <label for="modal_off_scope" class="block text-xs font-semibold text-slate-700 mb-1">Assigned Branch / Operating Unit</label>
          <input
            id="modal_off_scope"
            type="text"
            bind:value={officerAssigned}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="e.g. IT Department or Visayas Regional Branch"
          />
        </div>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
        <button
          onclick={() => (isOfficerModalOpen = false)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveOfficer}
          class="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          Save Officer
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Department Create/Edit Dialog -->
{#if isDeptModalOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 class="text-sm font-bold text-slate-900">
          {editingDept ? 'Edit Department Division' : 'Add New Department'}
        </h3>
      </div>

      <div class="p-6 space-y-4">
        {#if deptError}
          <div class="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {deptError}
          </div>
        {/if}

        <div>
          <label for="modal_dept_name" class="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
          <input
            id="modal_dept_name"
            type="text"
            bind:value={deptName}
            required
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="e.g. Information Technology"
          />
        </div>

        <div>
          <label for="modal_dept_desc" class="block text-xs font-semibold text-slate-700 mb-1">Operational Description</label>
          <textarea
            id="modal_dept_desc"
            bind:value={deptDescription}
            rows={3}
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="Key functions, systems managed, and data processing duties."
          ></textarea>
        </div>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
        <button
          onclick={() => (isDeptModalOpen = false)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={handleSaveDepartment}
          class="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          {editingDept ? 'Update Department' : 'Create Department'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Safe Delete Department Guard Modal -->
{#if deletingDept}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2 text-rose-800">
        <AlertCircle class="h-4 w-4" />
        <h3 class="text-sm font-bold">Confirm Department Deletion</h3>
      </div>

      <div class="p-6 space-y-3">
        {#if deleteError}
          <div class="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {deleteError}
          </div>
        {/if}

        <p class="text-xs text-slate-600">
          Are you sure you want to remove <strong class="text-slate-900 font-semibold">{deletingDept.name}</strong>?
        </p>
        <p class="text-[11px] text-slate-500">
          Regulatory guardrail: A department cannot be deleted if active ROPA processes are linked to it.
        </p>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
        <button
          onclick={() => (deletingDept = null)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={confirmDeleteDept}
          class="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          Delete Department
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Officer Modal -->
{#if deletingOfficer}
  <div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
      <div class="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2 text-rose-800">
        <AlertCircle class="h-4 w-4" />
        <h3 class="text-sm font-bold">Confirm Officer De-registration</h3>
      </div>

      <div class="p-6 space-y-3">
        <p class="text-xs text-slate-600">
          Are you sure you want to de-register <strong class="text-slate-900 font-semibold">{deletingOfficer.name}</strong> ({deletingOfficer.title})?
        </p>
      </div>

      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
        <button
          onclick={() => (deletingOfficer = null)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={confirmDeleteOfficer}
          class="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          De-register Officer
        </button>
      </div>
    </div>
  </div>
{/if}
