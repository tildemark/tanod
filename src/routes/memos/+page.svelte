<script lang="ts">
	import { onMount } from 'svelte';
	import { listDpoMemos, createDpoMemo, updateDpoMemo, deleteDpoMemo } from '$lib/api/enforcement';
	import { getOrganization, listDepartments } from '$lib/api/admin';
	import type { DpoMemo, CreateMemoPayload, UpdateMemoPayload, PolicyStatus, PolicyCategory } from '$lib/types/enforcement';
	import type { Organization, Department } from '$lib/types/organization';

	type PillarType = 'Organizational' | 'Physical' | 'Technical' | 'Incident';

	const PILLARS: { value: PillarType; label: string; badge: string; desc: string }[] = [
		{ value: 'Organizational', label: 'Organizational Security', badge: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Policies, DPO appointment, training, confidentiality' },
		{ value: 'Physical', label: 'Physical Security', badge: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Access control, server rooms, paper records disposal' },
		{ value: 'Technical', label: 'Technical Security', badge: 'bg-purple-50 text-purple-700 border-purple-200', desc: 'Encryption, access logs, firewalls, MFA, backups' },
		{ value: 'Incident', label: 'Breach & Incident Protocol', badge: 'bg-rose-50 text-rose-700 border-rose-200', desc: '72-hour notifications, escalation, forensic readiness' }
	];

	const POLICY_CATEGORIES: { value: PolicyCategory; label: string; icon: string; desc: string }[] = [
		{ value: 'PRIVACY_MANUAL', label: 'Data Privacy Manual', icon: '📘', desc: 'Comprehensive institutional Data Privacy Manual mandated by NPC Advisory 2017-01' },
		{ value: 'POLICY', label: 'Institutional Policy', icon: '📜', desc: 'Formal organizational governance policies (Access Control, Clean Desk, Retention)' },
		{ value: 'DIRECTIVE_MEMO', label: 'DPO Directive / Memo', icon: '📢', desc: 'Serialized circulars to departments enforcing compliance standards' },
		{ value: 'PRIVACY_NOTICE', label: 'Privacy Notice / Statement', icon: '👁️', desc: 'Customer, employee, or web portal privacy notices and consent disclosures' },
		{ value: 'SOP', label: 'Standard Operating Procedure (SOP)', icon: '⚙️', desc: 'Step-by-step operational workflows for handling personal data' }
	];

	const STATUS_DEFINITIONS: { value: PolicyStatus; label: string; badge: string }[] = [
		{ value: 'DRAFT', label: 'Draft', badge: 'bg-slate-100 text-slate-700 border-slate-300' },
		{ value: 'PROPOSED', label: 'Proposed / Review', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
		{ value: 'APPROVED', label: 'Approved & In Force', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
		{ value: 'ARCHIVED', label: 'Archived / Superseded', badge: 'bg-rose-50 text-rose-700 border-rose-200' }
	];

	let memos: DpoMemo[] = [];
	let org: Organization | null = null;
	let departments: Department[] = [];
	let loading = true;
	let showModal = false;
	let editingMemo: DpoMemo | null = null;
	let previewMemo: DpoMemo | null = null;

	// Filters
	let selectedCategoryFilter: string = 'ALL';
	let selectedStatusFilter: string = 'ALL';
	let selectedPillarFilter: string = 'ALL';
	let searchQuery = '';

	// Form fields
	let title = '';
	let category: PolicyCategory = 'POLICY';
	let pillar: PillarType = 'Organizational';
	let status: PolicyStatus = 'APPROVED';
	let version = '1.0';
	let targetDeptId = '';
	let effectiveDate = new Date().toISOString().split('T')[0];
	let reviewDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
	let approvedBy = '';
	let content = '';

	onMount(async () => {
		try {
			const loadedOrg = await getOrganization();
			org = loadedOrg;
			approvedBy = loadedOrg.dpo_name || 'Data Protection Officer';
			const [loadedMemos, loadedDepts] = await Promise.all([
				listDpoMemos(loadedOrg.id),
				listDepartments(loadedOrg.id)
			]);
			memos = loadedMemos;
			departments = loadedDepts;
		} catch (err) {
			console.error('Failed to load memos or org:', err);
		} finally {
			loading = false;
		}
	});

	function resetForm() {
		editingMemo = null;
		title = '';
		category = 'POLICY';
		pillar = 'Organizational';
		status = 'APPROVED';
		version = '1.0';
		targetDeptId = '';
		effectiveDate = new Date().toISOString().split('T')[0];
		reviewDate = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
		approvedBy = org?.dpo_name || 'Data Protection Officer';
		content = '';
	}

	function openCreateModal(defaultCategory?: PolicyCategory) {
		resetForm();
		if (defaultCategory) category = defaultCategory;
		showModal = true;
	}

	function openEditModal(memo: DpoMemo) {
		editingMemo = memo;
		title = memo.title;
		category = memo.policy_category;
		pillar = memo.pillar;
		status = memo.status;
		version = memo.version || '1.0';
		targetDeptId = memo.target_dept_id || '';
		effectiveDate = memo.effective_date || new Date(memo.issued_date).toISOString().split('T')[0];
		reviewDate = memo.review_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
		approvedBy = memo.approved_by || org?.dpo_name || 'Data Protection Officer';
		content = memo.content;
		showModal = true;
	}

	async function handleSave() {
		if (!title.trim() || !content.trim() || !org) return;

		try {
			if (editingMemo) {
				const payload: UpdateMemoPayload = {
					id: editingMemo.id,
					title: title.trim(),
					pillar,
					target_dept_id: targetDeptId || undefined,
					content: content.trim(),
					status,
					policy_category: category,
					version: version.trim() || '1.0',
					effective_date: effectiveDate || undefined,
					review_date: reviewDate || undefined,
					approved_by: approvedBy.trim() || undefined
				};
				const updated = await updateDpoMemo(payload);
				memos = memos.map(m => m.id === updated.id ? updated : m);
				if (previewMemo?.id === updated.id) previewMemo = updated;
			} else {
				const currentYear = new Date().getFullYear();
				const prefix = category === 'PRIVACY_MANUAL' ? 'DPA-MANUAL' :
					category === 'PRIVACY_NOTICE' ? 'DPA-NOTICE' :
					category === 'SOP' ? 'DPA-SOP' : 'DPO-MEMO';
				const countNext = memos.length + 1;
				const memoNumber = `${prefix}-${currentYear}-${String(countNext).padStart(3, '0')}`;

				const payload: CreateMemoPayload = {
					org_id: org.id,
					memo_number: memoNumber,
					title: title.trim(),
					pillar,
					target_dept_id: targetDeptId || undefined,
					content: content.trim(),
					status,
					policy_category: category,
					version: version.trim() || '1.0',
					effective_date: effectiveDate || undefined,
					review_date: reviewDate || undefined,
					approved_by: approvedBy.trim() || undefined
				};
				const created = await createDpoMemo(payload);
				memos = [created, ...memos];
				previewMemo = created;
			}
			showModal = false;
			resetForm();
		} catch (err) {
			alert('Failed to save policy/directive: ' + err);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to permanently delete this document from the institutional registry?')) return;
		try {
			await deleteDpoMemo(id);
			memos = memos.filter((m) => m.id !== id);
			if (previewMemo?.id === id) previewMemo = null;
		} catch (err) {
			alert('Failed to delete document: ' + err);
		}
	}

	function printMemo() {
		window.print();
	}

	// Preset Template Loader for Data Privacy Manual & Standard Policies
	function loadTemplate(templateType: 'MANUAL' | 'PASSWORD' | 'RETENTION' | 'NOTICE' | 'BREACH') {
		if (templateType === 'MANUAL') {
			title = 'Institutional Data Privacy Manual (NPC Advisory 2017-01)';
			category = 'PRIVACY_MANUAL';
			pillar = 'Organizational';
			status = 'APPROVED';
			version = '1.0';
			content = `DATA PRIVACY MANUAL
Pursuant to Republic Act No. 10173 and National Privacy Commission Advisory No. 2017-01

1. PURPOSE & SCOPE
This Manual establishes the data protection and privacy policies of ${org?.name || 'the Organization'}. It governs the collection, processing, storage, access, and secure disposal of personal data across all operating units.

2. GOVERNANCE & DATA PROTECTION OFFICER (DPO)
The appointed DPO is designated with independent reporting authority to the Head of Agency / Governing Board.
DPO Name: ${org?.dpo_name || 'Designated DPO'}
Official Email: ${org?.dpo_email || 'dpo@organization.ph'}

3. STATUTORY DATA PRIVACY PRINCIPLES
All personal data processing shall adhere to Transparency, Legitimate Purpose, and Proportionality.

4. ORGANIZATIONAL SECURITY MEASURES
- Mandatory privacy orientation for all new personnel and annual refresher training.
- Strict Non-Disclosure Agreements (NDAs) signed prior to granting access to sensitive databases.

5. PHYSICAL SECURITY MEASURES
- Restricted access to server racks and physical filing cabinets containing personal records.
- Enforced clean-desk policy and secure on-site document shredding protocol.

6. TECHNICAL SECURITY MEASURES
- Mandatory AES-256 encryption for data at rest and TLS 1.3 for data in transit.
- Multi-factor authentication (MFA) on corporate portals and automatic 10-minute inactivity lockout.

7. DATA SUBJECT RIGHTS COMPLIANCE
Procedures for facilitating Right to Information, Access, Rectification, Erasure, and Data Portability within the 30-working-day SLA.

8. BREACH MANAGEMENT PROTOCOL
Mandatory 72-hour notification to the National Privacy Commission upon discovery of qualifying personal data breaches under NPC Circular 16-03.

Adopted and promulgated by the Office of the Data Protection Officer.`;
		} else if (templateType === 'PASSWORD') {
			title = 'Workstation Security, Password Complexity & Session Lockout Policy';
			category = 'POLICY';
			pillar = 'Technical';
			status = 'APPROVED';
			version = '1.1';
			content = `TECHNICAL DIRECTIVE: WORKSTATION SECURITY & ACCESS CONTROL

1. MINIMUM PASSWORD STANDARDS
All user accounts with access to personal data must use passwords with a minimum length of 12 characters, including uppercase, lowercase, numbers, and special symbols.

2. MULTI-FACTOR AUTHENTICATION
MFA is strictly required for all administrative accounts, email services, and remote VPN access.

3. AUTOMATIC LOCKOUT
Workstations processing personal information must automatically lock the screen after 10 minutes of inactivity.`;
		} else if (templateType === 'NOTICE') {
			title = 'Comprehensive Privacy Notice & Data Subject Consent Statement';
			category = 'PRIVACY_NOTICE';
			pillar = 'Organizational';
			status = 'APPROVED';
			version = '1.0';
			content = `PRIVACY NOTICE (RA 10173 COMPLIANCE)

${org?.name || 'Our Company'} respects your right to privacy and is committed to protecting your personal data in accordance with the Data Privacy Act of 2012.

1. PERSONAL DATA COLLECTED
We collect your name, contact details, transaction history, and identification numbers solely for legitimate operational and regulatory purposes.

2. PURPOSE OF PROCESSING
Your data is used to provide requested services, verify identity, and comply with Philippine laws.

3. DATA RETENTION & SECURITY
Your information is stored in encrypted systems and retained only for the duration prescribed by statutory regulations.

4. INQUIRIES & DPO CONTACT
To exercise your rights (Access, Correction, Erasure), contact our Data Protection Officer at: ${org?.dpo_email || 'dpo@organization.ph'}.`;
		}
	}

	$: filteredMemos = memos.filter((m) => {
		const matchCategory = selectedCategoryFilter === 'ALL' || m.policy_category === selectedCategoryFilter;
		const matchStatus = selectedStatusFilter === 'ALL' || m.status === selectedStatusFilter;
		const matchPillar = selectedPillarFilter === 'ALL' || m.pillar === selectedPillarFilter;
		const matchSearch = !searchQuery.trim() || 
			m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			m.memo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
			m.content.toLowerCase().includes(searchQuery.toLowerCase());
		return matchCategory && matchStatus && matchPillar && matchSearch;
	});

	// Metrics
	$: totalCount = memos.length;
	$: approvedCount = memos.filter(m => m.status === 'APPROVED').length;
	$: draftProposedCount = memos.filter(m => m.status === 'DRAFT' || m.status === 'PROPOSED').length;
	$: hasPrivacyManual = memos.some(m => m.policy_category === 'PRIVACY_MANUAL' && m.status === 'APPROVED');
</script>

<svelte:head>
	<title>Policies, Privacy Manual & Directives — TANOD</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
					RA 10173 Sec. 21 · NPC Advisory 2017-01
				</span>
				<span class="text-xs text-slate-500 font-mono">Institutional Accountability System</span>
			</div>
			<h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">Policies, Privacy Manual & Directives</h1>
			<p class="text-sm text-slate-600 mt-1 max-w-3xl">
				Draft, review, approve, and serialize your mandatory **Data Privacy Manual**, governance policies, internal DPO memos, and public privacy notices with audit-ready print formatting.
			</p>
		</div>

		<div class="flex items-center gap-2.5 flex-wrap">
			<button
				type="button"
				on:click={() => openCreateModal('PRIVACY_MANUAL')}
				class="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-blue-900 rounded-lg text-xs font-semibold border border-blue-300 transition-all cursor-pointer shadow-2xs"
			>
				<span>📘</span>
				<span>{hasPrivacyManual ? 'Update Privacy Manual' : '+ Draft Privacy Manual'}</span>
			</button>

			<button
				type="button"
				on:click={() => openCreateModal('POLICY')}
				class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all cursor-pointer"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				<span>New Policy / Directive</span>
			</button>
		</div>
	</div>

	<!-- Status Highlight Banner for Data Privacy Manual (Mandatory NPC requirement) -->
	<div class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs {
		hasPrivacyManual ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-amber-50/80 border-amber-300 text-amber-950'
	}">
		<div class="flex items-start sm:items-center gap-3">
			<div class="text-2xl p-2 rounded-lg {hasPrivacyManual ? 'bg-emerald-100' : 'bg-amber-100'}">
				{hasPrivacyManual ? '🛡️' : '⚠️'}
			</div>
			<div>
				<div class="flex items-center gap-2">
					<span class="font-bold text-sm">NPC Advisory 2017-01: Data Privacy Manual</span>
					<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border {
						hasPrivacyManual ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
					}">
						{hasPrivacyManual ? '✓ Approved & Recorded' : '○ Action Required'}
					</span>
				</div>
				<p class="text-xs text-slate-600 mt-0.5">
					{hasPrivacyManual
						? 'Your organization has promulgated an approved Data Privacy Manual defining technical, organizational, and physical controls.'
						: 'NPC Circular mandates every PIC/PIP to promulgate a written Data Privacy Manual. Click below to initialize the standard Philippine template.'}
				</p>
			</div>
		</div>

		<div class="shrink-0 flex items-center gap-2">
			{#if !hasPrivacyManual}
				<button
					type="button"
					on:click={() => { openCreateModal('PRIVACY_MANUAL'); loadTemplate('MANUAL'); }}
					class="px-3.5 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
				>
					Generate from NPC Template
				</button>
			{/if}
		</div>
	</div>

	<!-- KPI Metrics -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
		<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
			<span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Documents</span>
			<p class="text-2xl font-black font-mono text-slate-900 mt-1">{totalCount}</p>
			<p class="text-[11px] text-slate-400 mt-0.5">Manuals, policies & memos</p>
		</div>

		<div class="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
			<span class="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Approved & In Force</span>
			<p class="text-2xl font-black font-mono text-emerald-700 mt-1">{approvedCount}</p>
			<p class="text-[11px] text-slate-400 mt-0.5">Promulgated directives</p>
		</div>

		<div class="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
			<span class="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Draft & Proposed</span>
			<p class="text-2xl font-black font-mono text-amber-700 mt-1">{draftProposedCount}</p>
			<p class="text-[11px] text-amber-800 mt-0.5">Under DPO review</p>
		</div>

		<div class="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
			<span class="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Privacy Manual</span>
			<p class="text-sm font-bold {hasPrivacyManual ? 'text-emerald-700' : 'text-amber-700'} mt-2 flex items-center gap-1.5">
				<span>{hasPrivacyManual ? '✓ In Place' : '⚠️ Missing'}</span>
			</p>
			<p class="text-[11px] text-slate-400 mt-1">NPC Advisory 2017-01</p>
		</div>
	</div>

	<!-- Filter & Search Bar -->
	<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
			<div class="relative flex-1 max-w-md">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search policies, serial numbers, keywords..."
					class="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
				/>
				<svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>

			<div class="flex items-center gap-2 flex-wrap text-xs">
				<span class="font-semibold text-slate-500">Category:</span>
				<select
					bind:value={selectedCategoryFilter}
					class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="ALL">All Categories</option>
					{#each POLICY_CATEGORIES as cat}
						<option value={cat.value}>{cat.label}</option>
					{/each}
				</select>

				<span class="font-semibold text-slate-500 ml-2">Status:</span>
				<select
					bind:value={selectedStatusFilter}
					class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="ALL">All Statuses</option>
					{#each STATUS_DEFINITIONS as st}
						<option value={st.value}>{st.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Pillar Pills -->
		<div class="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
			<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Security Pillar:</span>
			<button
				type="button"
				on:click={() => selectedPillarFilter = 'ALL'}
				class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedPillarFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}"
			>
				All Pillars ({memos.length})
			</button>
			{#each PILLARS as pil}
				<button
					type="button"
					on:click={() => selectedPillarFilter = pil.value}
					class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedPillarFilter === pil.value ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}"
				>
					{pil.label} ({memos.filter(m => m.pillar === pil.value).length})
				</button>
			{/each}
		</div>
	</div>

	<!-- Documents / Memos List -->
	{#if loading}
		<div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
			<div class="animate-spin w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full mx-auto mb-3"></div>
			Loading Policy & Manual Registry...
		</div>
	{:else if filteredMemos.length === 0}
		<div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
			<div class="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</div>
			<div>
				<p class="font-bold text-slate-800 text-sm">No Policies or Directives Found</p>
				<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
					Start building your institutional accountability baseline by drafting your Data Privacy Manual or issuing workstation directives.
				</p>
			</div>
			<div class="flex items-center justify-center gap-2 pt-2">
				<button
					type="button"
					on:click={() => { openCreateModal('PRIVACY_MANUAL'); loadTemplate('MANUAL'); }}
					class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold"
				>
					Generate Data Privacy Manual
				</button>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-3">
			{#each filteredMemos as memo (memo.id)}
				{@const pil = PILLARS.find(p => p.value === memo.pillar)}
				{@const cat = POLICY_CATEGORIES.find(c => c.value === memo.policy_category)}
				{@const stat = STATUS_DEFINITIONS.find(s => s.value === memo.status)}
				<div class="bg-white border {memo.policy_category === 'PRIVACY_MANUAL' ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'} hover:border-slate-300 rounded-xl p-4.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
					<div class="space-y-1.5 flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<!-- Serial number -->
							<span class="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
								{memo.memo_number}
							</span>

							<!-- Status badge -->
							<span class="text-[10px] font-bold px-2 py-0.5 rounded border {stat?.badge || 'bg-slate-100 text-slate-700'}">
								{stat?.label || memo.status}
							</span>

							<!-- Category badge -->
							<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
								<span>{cat?.icon || '📜'}</span>
								<span>{cat?.label || memo.policy_category}</span>
							</span>

							<!-- Version -->
							<span class="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
								v{memo.version || '1.0'}
							</span>

							{#if pil}
								<span class="text-[10px] font-medium px-2 py-0.5 rounded {pil.badge} border">
									{pil.label}
								</span>
							{/if}
						</div>

						<!-- Title -->
						<button
							type="button"
							class="text-left font-bold text-slate-900 text-base hover:text-blue-600 transition-colors block cursor-pointer"
							on:click={() => previewMemo = memo}
						>
							{memo.title}
						</button>

						<!-- Metadata & dates -->
						<div class="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
							<span>Scope: <strong class="text-slate-800">{memo.target_dept_name || 'Organization-Wide'}</strong></span>
							<span>•</span>
							<span>Effective: <strong class="text-slate-800">{memo.effective_date || new Date(memo.issued_date).toLocaleDateString()}</strong></span>
							{#if memo.review_date}
								<span>•</span>
								<span class="text-amber-800">Next Review: {memo.review_date}</span>
							{/if}
							{#if memo.approved_by}
								<span>•</span>
								<span>Sign-off: <strong class="text-slate-800">{memo.approved_by}</strong></span>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-2 shrink-0">
						<button
							type="button"
							on:click={() => previewMemo = memo}
							class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
						>
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							View & Print
						</button>

						<button
							type="button"
							on:click={() => openEditModal(memo)}
							class="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
							title="Edit Document & Status"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>

						<button
							type="button"
							on:click={() => handleDelete(memo.id)}
							class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
							aria-label="Delete document"
							title="Delete Document"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal: Create / Edit Policy or Privacy Manual -->
{#if showModal}
	<div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
			<div class="flex items-center justify-between border-b border-slate-100 pb-3">
				<div>
					<h3 class="text-lg font-bold text-slate-900">
						{editingMemo ? 'Update Policy / Directive' : 'Draft Policy, Privacy Manual, or Directive'}
					</h3>
					<p class="text-xs text-slate-500">Document accountability and enforce Philippine DPA organizational measures.</p>
				</div>
				<button type="button" aria-label="Close dialog" on:click={() => showModal = false} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Quick Template Buttons -->
			{#if !editingMemo}
				<div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
					<span class="text-[11px] font-bold text-slate-600">Quick Templates:</span>
					<div class="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							on:click={() => loadTemplate('MANUAL')}
							class="text-[10.5px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200 hover:bg-blue-200"
						>
							📘 Data Privacy Manual
						</button>
						<button
							type="button"
							on:click={() => loadTemplate('PASSWORD')}
							class="text-[10.5px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold border border-purple-200 hover:bg-purple-200"
						>
							🔒 Password & Lockout Policy
						</button>
						<button
							type="button"
							on:click={() => loadTemplate('NOTICE')}
							class="text-[10.5px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 hover:bg-emerald-200"
						>
							👁️ Public Privacy Notice
						</button>
					</div>
				</div>
			{/if}

			<form on:submit|preventDefault={handleSave} class="space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<!-- Classification Category -->
					<div>
						<label for="policy-cat" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Category *</label>
						<select
							id="policy-cat"
							bind:value={category}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
						>
							{#each POLICY_CATEGORIES as c}
								<option value={c.value}>{c.icon} {c.label}</option>
							{/each}
						</select>
					</div>

					<!-- Workflow Status -->
					<div>
						<label for="policy-status" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Workflow Status *</label>
						<select
							id="policy-status"
							bind:value={status}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
						>
							{#each STATUS_DEFINITIONS as s}
								<option value={s.value}>{s.label}</option>
							{/each}
						</select>
					</div>

					<!-- Version -->
					<div>
						<label for="policy-ver" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Version Number</label>
						<input
							id="policy-ver"
							type="text"
							bind:value={version}
							placeholder="e.g. 1.0"
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
						/>
					</div>
				</div>

				<div>
					<label for="memo-title" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Title *</label>
					<input
						id="memo-title"
						type="text"
						bind:value={title}
						placeholder="e.g. Institutional Data Privacy Manual / Clean Desk & Physical File Security Policy"
						required
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="memo-pillar" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Security Pillar</label>
						<select
							id="memo-pillar"
							bind:value={pillar}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
						>
							{#each PILLARS as p}
								<option value={p.value}>{p.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="memo-dept" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Target Department / Scope</label>
						<select
							id="memo-dept"
							bind:value={targetDeptId}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
						>
							<option value="">All Personnel & Processing Units (Organization-Wide)</option>
							{#each departments as d}
								<option value={d.id}>{d.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label for="policy-eff-date" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Effective Date</label>
						<input
							id="policy-eff-date"
							type="date"
							bind:value={effectiveDate}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
						/>
					</div>

					<div>
						<label for="policy-rev-date" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Annual Review Date</label>
						<input
							id="policy-rev-date"
							type="date"
							bind:value={reviewDate}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
						/>
					</div>

					<div>
						<label for="policy-approver" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Approved By / Sign-off</label>
						<input
							id="policy-approver"
							type="text"
							bind:value={approvedBy}
							placeholder="e.g. Juan dela Cruz (DPO)"
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
						/>
					</div>
				</div>

				<div>
					<label for="memo-body" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Document Content & Sections *</label>
					<textarea
						id="memo-body"
						bind:value={content}
						rows="12"
						placeholder="Draft complete articles, policy sections, scope, sanctions, and operational rules..."
						required
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono leading-relaxed"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
						type="button"
						on:click={() => showModal = false}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
					>
						{editingMemo ? 'Update Document' : 'Save & Promulgate Document'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Printable Preview Modal & Print View -->
{#if previewMemo}
	{@const memo = previewMemo}
	{@const pil = PILLARS.find(p => p.value === memo.pillar)}
	{@const cat = POLICY_CATEGORIES.find(c => c.value === memo.policy_category)}
	{@const stat = STATUS_DEFINITIONS.find(s => s.value === memo.status)}

	<!-- Screen Modal Overlay -->
	<div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:static print:bg-white overflow-y-auto">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-8 shadow-2xl space-y-6 my-6 print:border-none print:shadow-none print:p-0 print:text-black print:bg-white print:max-h-none">
			<!-- Screen Action Bar -->
			<div class="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
				<div class="flex items-center gap-2">
					<span class="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
						{memo.memo_number}
					</span>
					<span class="text-[10px] font-bold px-2 py-0.5 rounded border {stat?.badge}">
						{stat?.label || memo.status}
					</span>
					<span class="text-xs text-slate-500">v{memo.version || '1.0'}</span>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						on:click={printMemo}
						class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
						</svg>
						Print Official Document
					</button>
					<button type="button" aria-label="Close preview" on:click={() => previewMemo = null} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Official Letterhead Layout (Screen & Print) -->
			<div class="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-inner border border-slate-200 print:shadow-none print:border-none print:p-0">
				<!-- Header -->
				<div class="border-b-2 border-slate-900 pb-4 text-center">
					<div class="text-xs uppercase font-extrabold tracking-widest text-slate-600">Office of the Data Protection Officer</div>
					<h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight mt-0.5">
						{org?.name || 'INSTITUTIONAL DATA PROTECTION OFFICE'}
					</h2>
					{#if org?.npc_registration_number}
						<div class="text-[11px] font-mono text-slate-600 mt-0.5">
							NPC Registration No.: {org.npc_registration_number}
						</div>
					{/if}
				</div>

				<!-- Serial Number & Date -->
				<div class="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-700 py-3 border-b border-slate-200">
					<div>
						{cat?.label.toUpperCase() || 'DOCUMENT'}: <strong class="text-slate-950 font-mono text-sm">{memo.memo_number}</strong>
					</div>
					<div>EFFECTIVE: {memo.effective_date || new Date(memo.issued_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
				</div>

				<!-- Memo Header Table -->
				<div class="grid grid-cols-4 gap-2 text-xs py-4 border-b border-slate-200">
					<div class="font-bold uppercase text-slate-500">SCOPE:</div>
					<div class="col-span-3 font-semibold text-slate-900">{memo.target_dept_name || 'All Operating Units (Organization-Wide)'}</div>

					<div class="font-bold uppercase text-slate-500">CATEGORY:</div>
					<div class="col-span-3 font-semibold text-slate-900">{cat?.label} (v{memo.version || '1.0'})</div>

					<div class="font-bold uppercase text-slate-500">TITLE:</div>
					<div class="col-span-3 font-black text-slate-950 uppercase">{memo.title}</div>

					<div class="font-bold uppercase text-slate-500">STATUS:</div>
					<div class="col-span-3 font-bold text-slate-800">{stat?.label || memo.status}</div>
				</div>

				<!-- Content Body -->
				<div class="py-6 text-sm text-slate-800 leading-relaxed space-y-4 whitespace-pre-wrap font-serif">
					{memo.content}
				</div>

				<!-- Statutory Footnote & Signoff -->
				<div class="pt-8 border-t border-slate-300 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
					<div class="text-[10px] text-slate-500 max-w-xs space-y-0.5">
						<p class="font-semibold text-slate-700">LEGAL COMPLIANCE REFERENCE:</p>
						<p>Republic Act No. 10173 (Data Privacy Act of 2012)</p>
						<p>NPC Advisory 2017-01 & NPC Circular 16-01</p>
						{#if memo.review_date}
							<p class="font-semibold text-slate-600 mt-1">Scheduled Review: {memo.review_date}</p>
						{/if}
						<p class="font-mono text-[9px] text-slate-400 mt-1">Generated via TANOD Local Governance Suite</p>
					</div>

					<div class="text-center min-w-[220px]">
						<div class="h-12 flex items-end justify-center">
							<span class="font-serif italic text-slate-400 text-xs">[Digitally Certified by DPO]</span>
						</div>
						<div class="border-t border-slate-900 pt-1 font-bold text-xs uppercase text-slate-900">
							{memo.approved_by || org?.dpo_name || 'Data Protection Officer'}
						</div>
						<div class="text-[10px] text-slate-600">
							Data Protection Officer / Head of Privacy
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
