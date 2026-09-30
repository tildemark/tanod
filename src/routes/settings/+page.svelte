<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getOrganization,
    updateOrganization,
    saveOrgLogo,
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
  } from '$lib/api/admin';
  import type { Organization, Department } from '$lib/types/organization';
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
    FolderKanban,
    Save
  } from 'lucide-svelte';

  // State
  let activeTab = $state<'organization' | 'departments'>('organization');
  let org = $state<Organization | null>(null);
  let departments = $state<Department[]>([]);
  let isLoading = $state(true);
  let isSavingOrg = $state(false);
  let statusMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields (14 statutory fields)
  let name = $state('');
  let slug = $state('');
  let logoPath = $state('');
  let address = $state('');
  let city = $state('');
  let country = $state('');
  let phone = $state('');
  let email = $state('');
  let website = $state('');
  let dpoName = $state('');
  let dpoEmail = $state('');
  let industry = $state('');
  let description = $state('');
  let employeeCount = $state<number | ''>('');
  let npcNotificationEmail = $state('');
  let breachNotificationHours = $state<number>(72);

  // Department modal state
  let isDeptModalOpen = $state(false);
  let editingDept = $state<Department | null>(null);
  let deptName = $state('');
  let deptDescription = $state('');
  let deptError = $state<string | null>(null);

  // Delete modal state
  let deletingDept = $state<Department | null>(null);
  let deleteError = $state<string | null>(null);

  async function loadData() {
    try {
      isLoading = true;
      const [fetchedOrg, fetchedDepts] = await Promise.all([
        getOrganization(),
        listDepartments('') // IPC handles finding current org
      ]);

      org = fetchedOrg;
      departments = fetchedDepts;

      // Populate form
      name = fetchedOrg.name || '';
      slug = fetchedOrg.slug || '';
      logoPath = fetchedOrg.logo_path || '';
      address = fetchedOrg.address || '';
      city = fetchedOrg.city || '';
      country = fetchedOrg.country || 'Philippines';
      phone = fetchedOrg.phone || '';
      email = fetchedOrg.email || '';
      website = fetchedOrg.website || '';
      dpoName = fetchedOrg.dpo_name || '';
      dpoEmail = fetchedOrg.dpo_email || '';
      industry = fetchedOrg.industry || '';
      description = fetchedOrg.description || '';
      employeeCount = fetchedOrg.employee_count ?? '';
      npcNotificationEmail = fetchedOrg.npc_notification_email || 'privacy.complaints@privacy.gov.ph';
      breachNotificationHours = fetchedOrg.breach_notification_hours ?? 72;
    } catch (err: any) {
      statusMessage = { type: 'error', text: err?.toString() || 'Failed to load settings.' };
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
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
        address: address || null,
        city: city || null,
        country: country || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        dpo_name: dpoName || null,
        dpo_email: dpoEmail || null,
        industry: industry || null,
        description: description || null,
        employee_count: employeeCount === '' ? null : Number(employeeCount),
        npc_notification_email: npcNotificationEmail || null,
        breach_notification_hours: Number(breachNotificationHours)
      });

      org = updated;
      statusMessage = { type: 'success', text: 'Entity governance profile updated successfully.' };
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

<div class="max-w-5xl mx-auto space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between border-b border-slate-200 pb-5">
    <div>
      <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <Building2 class="h-6 w-6 text-slate-700" />
        Organization & Governance Setup
      </h2>
      <p class="text-xs text-slate-500 mt-1">
        Configure statutory entity metadata, designate your Data Protection Officer (DPO), and manage organizational divisions.
      </p>
    </div>

    <!-- Tab Switcher -->
    <div class="inline-flex p-1 bg-slate-200/80 rounded-lg text-xs font-medium">
      <button
        onclick={() => (activeTab = 'organization')}
        class="px-4 py-1.5 rounded-md transition-all {activeTab === 'organization' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        Entity Profile (14 Fields)
      </button>
      <button
        onclick={() => (activeTab = 'departments')}
        class="px-4 py-1.5 rounded-md transition-all {activeTab === 'departments' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}"
      >
        Department Divisions ({departments.length})
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
    <!-- 14-Field Legal Form -->
    <form onsubmit={(e) => { e.preventDefault(); handleSaveOrg(); }} class="space-y-6">
      
      <!-- Section 1: Legal Entity Profile -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Personal Information Controller (PIC) Details</h3>
            <p class="text-[11px] text-slate-500">Official legal entity name registered with the SEC / DTI / NPC.</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">DPA Sec. 16</span>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Organization Legal Name *</label>
            <input
              type="text"
              bind:value={name}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Republic Health System, Inc."
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">System Slug / Identifier *</label>
            <input
              type="text"
              bind:value={slug}
              required
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              placeholder="e.g. republic-health"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Industry Classification</label>
            <input
              type="text"
              bind:value={industry}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Healthcare & Hospital Operations"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Approximate Employee Count</label>
            <input
              type="number"
              bind:value={employeeCount}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. 500"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Entity Description & Scope of Processing</label>
            <textarea
              bind:value={description}
              rows={2}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="Summary of processing operations and institutional role under RA 10173."
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Section 2: Designated DPO Credentials -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Designated Data Protection Officer (DPO)</h3>
            <p class="text-[11px] text-slate-500">Statutory officer responsible for NPC regulatory communications.</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">NPC Adv. 17-01</span>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">DPO Full Name & Title</label>
            <input
              type="text"
              bind:value={dpoName}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="e.g. Atty. Maria Santos, CIPP/E"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Official DPO Contact Email</label>
            <input
              type="email"
              bind:value={dpoEmail}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="dpo@republichealth.ph"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Physical Address & Contact Coordinates -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-sm font-bold text-slate-900">Registered Office & Contact Coordinates</h3>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="md:col-span-3">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Physical Street Address</label>
            <input
              type="text"
              bind:value={address}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="100 Corporate Ave, Bonifacio Global City"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">City / Municipality</label>
            <input
              type="text"
              bind:value={city}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="Taguig"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Country</label>
            <input
              type="text"
              bind:value={country}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="Philippines"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Telephone / Hotline</label>
            <input
              type="tel"
              bind:value={phone}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="+63 2 8123 4567"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">General Inquiries Email</label>
            <input
              type="email"
              bind:value={email}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="privacy@republichealth.ph"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Corporate Website</label>
            <input
              type="url"
              bind:value={website}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
              placeholder="https://republichealth.ph"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Regulatory Incident Notification Parameters -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Regulatory Breach Alert Configuration</h3>
            <p class="text-[11px] text-slate-500">Timelines mandated under NPC Circular 16-03.</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">72-Hour Rule</span>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">NPC Breach Notification Email</label>
            <input
              type="email"
              bind:value={npcNotificationEmail}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              placeholder="privacy.complaints@privacy.gov.ph"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Statutory Clock (Hours)</label>
            <input
              type="number"
              bind:value={breachNotificationHours}
              class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white font-mono"
              readonly
            />
            <p class="text-[10px] text-slate-500 mt-1">Fixed at 72 hours in compliance with NPC Circular 16-03 Section 18.</p>
          </div>
        </div>
      </div>

      <!-- Section 5: Local Entity Logo -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Official Brand Logo</h3>
          <p class="text-[11px] text-slate-500">Stored safely on local hard drive (%APPDATA%\tanod\assets\) for report headers.</p>
        </div>

        <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition-colors border border-slate-200 shadow-xs">
          <Upload class="h-4 w-4" />
          <span>Upload Image File</span>
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
          <span>{isSavingOrg ? 'Saving Changes...' : 'Save Governance Profile'}</span>
        </button>
      </div>
    </form>
  {:else}
    <!-- Department Management Tab -->
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

      <!-- Department Table -->
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
  {/if}
</div>

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
          <label class="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
          <input
            type="text"
            bind:value={deptName}
            required
            class="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
            placeholder="e.g. Information Technology"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Operational Description</label>
          <textarea
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
