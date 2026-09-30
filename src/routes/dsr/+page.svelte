<script lang="ts">
	import { onMount } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import {
		listDsrRequests,
		createDsrRequest,
		updateDsrStatus,
		resolveDsrRequest,
		listDsrActionLogs,
		deleteDsrRequest
	} from '$lib/api/enforcement';
	import { getOrganization } from '$lib/api/admin';
	import type { DsrRequest, CreateDsrPayload, ResolveDsrPayload, DsrActionLog } from '$lib/types/enforcement';
	import {
		UserCheck,
		Search,
		Plus,
		LayoutGrid,
		List,
		Clock,
		ShieldCheck,
		FileText,
		CheckCircle2,
		XCircle,
		MapPin,
		History,
		AlertTriangle
	} from 'lucide-svelte';

	type DsrStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'ACTIONED' | 'REJECTED';
	type DsrType = 'Access' | 'Erasure' | 'Rectification' | 'Portability' | 'Objection';

	const COLUMNS: { id: DsrStatus; label: string; bg: string; border: string; badge: string }[] = [
		{ id: 'RECEIVED', label: '1. Received', bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-200 text-slate-800' },
		{ id: 'UNDER_REVIEW', label: '2. Under Review', bg: 'bg-amber-50/50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-900' },
		{ id: 'ACTIONED', label: '3. Actioned / Granted', bg: 'bg-emerald-50/50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-900' },
		{ id: 'REJECTED', label: '4. Rejected / Denied', bg: 'bg-rose-50/50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-900' }
	];

	const DSR_TYPES: { value: DsrType; label: string; desc: string }[] = [
		{ value: 'Access', label: 'Right to Access (Sec. 16c)', desc: 'Obtain copy of personal data, sources, and processing recipients' },
		{ value: 'Rectification', label: 'Right to Rectification (Sec. 16d)', desc: 'Dispute and correct inaccurate, erroneous or outdated data' },
		{ value: 'Erasure', label: 'Right to Erasure / Blocking (Sec. 16e)', desc: 'Suspend, withdraw, or order permanent blocking/removal' },
		{ value: 'Portability', label: 'Right to Data Portability (Sec. 18)', desc: 'Obtain data in structured, commonly used electronic format' },
		{ value: 'Objection', label: 'Right to Object (Sec. 16b)', desc: 'Object to processing for automated profiling, direct marketing, or research' }
	];

	const ACTION_OPTIONS = [
		{ value: 'EXTRACTED_PROVIDED', label: 'Extracted & Provided', desc: 'Securely extracted and delivered verified copy of records to data subject' },
		{ value: 'ERASED', label: 'Permanently Erased', desc: 'Securely deleted records from primary database and associated storage' },
		{ value: 'REDACTED', label: 'Redacted / Anonymized', desc: 'Redacted identifying personal data elements while retaining statutory record' },
		{ value: 'CORRECTED', label: 'Corrected & Updated', desc: 'Rectified inaccurate data fields across systems and notified recipients' },
		{ value: 'DENIED', label: 'Lawfully Denied', desc: 'Request denied pursuant to statutory exemptions under RA 10173 Sec. 19' },
		{ value: 'NOTE_ADDED', label: 'Compliance Audit Note', desc: 'Interim administrative note or clarification added to historical trail' }
	];

	let itemsByColumn: Record<DsrStatus, DsrRequest[]> = {
		RECEIVED: [],
		UNDER_REVIEW: [],
		ACTIONED: [],
		REJECTED: []
	};

	let allRequests: DsrRequest[] = [];
	let orgId = '';
	let loading = true;
	let showModal = false;
	let selectedRequest: DsrRequest | null = null;
	let actionLogs: DsrActionLog[] = [];
	let loadingLogs = false;
	let now = Date.now();

	// View mode: Kanban vs Table
	let viewMode: 'kanban' | 'table' = 'kanban';

	// Filters
	let searchQuery = '';
	let filterType = 'ALL';
	let filterSla = 'ALL'; // 'ALL', 'OVERDUE', 'URGENT'

	// Create Form
	let requestType: DsrType = 'Access';
	let requesterName = '';
	let requesterEmail = '';
	let requestedScope = '';
	let dataLocation = '';
	let notes = '';

	// Resolve / Action Form
	let isResolveModalOpen = false;
	let resolutionStatus: 'ACTIONED' | 'REJECTED' = 'ACTIONED';
	let resolutionAction = 'EXTRACTED_PROVIDED';
	let resolutionDetails = '';
	let resolutionLocation = '';
	let resolutionSummary = '';
	let resolutionPerformer = 'Data Protection Officer';

	onMount(() => {
		(async () => {
			try {
				const org = await getOrganization();
				orgId = org.id;
				await loadRequests();
			} catch (err) {
				console.error('Failed to load initial org/dsr:', err);
			} finally {
				loading = false;
			}
		})();

		const interval = setInterval(() => {
			now = Date.now();
		}, 60000);
		return () => clearInterval(interval);
	});

	async function loadRequests() {
		try {
			const all = await listDsrRequests(orgId);
			allRequests = all;
			distributeItems(all);
		} catch (err) {
			console.error('Failed to load DSR requests:', err);
		}
	}

	function distributeItems(list: DsrRequest[]) {
		// Filter first
		const filtered = list.filter((r) => {
			const matchesSearch =
				searchQuery.trim() === '' ||
				r.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.requester_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(r.requested_scope && r.requested_scope.toLowerCase().includes(searchQuery.toLowerCase())) ||
				(r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
				r.id.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesType = filterType === 'ALL' || r.request_type === filterType;

			const sla = getSlaDetails(r.sla_deadline);
			let matchesSla = true;
			if (filterSla === 'OVERDUE') matchesSla = sla.isOverdue && r.status !== 'ACTIONED' && r.status !== 'REJECTED';
			if (filterSla === 'URGENT') matchesSla = sla.isUrgent && r.status !== 'ACTIONED' && r.status !== 'REJECTED';

			return matchesSearch && matchesType && matchesSla;
		});

		// Sort each lane by statutory urgency (most urgent SLA first)
		const sortByUrgency = (a: DsrRequest, b: DsrRequest) => {
			return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
		};

		itemsByColumn = {
			RECEIVED: filtered.filter((r) => r.status === 'RECEIVED').sort(sortByUrgency),
			UNDER_REVIEW: filtered.filter((r) => r.status === 'UNDER_REVIEW').sort(sortByUrgency),
			ACTIONED: filtered.filter((r) => r.status === 'ACTIONED'),
			REJECTED: filtered.filter((r) => r.status === 'REJECTED')
		};
	}

	$: if (allRequests) {
		distributeItems(allRequests);
	}

	function handleDndConsider(columnId: DsrStatus, e: CustomEvent<{ items: DsrRequest[] }>) {
		itemsByColumn[columnId] = e.detail.items;
	}

	async function handleDndFinalize(columnId: DsrStatus, e: CustomEvent<{ items: DsrRequest[] }>) {
		itemsByColumn[columnId] = e.detail.items;
		for (const item of e.detail.items) {
			if (item.status !== columnId) {
				try {
					await updateDsrStatus(item.id, columnId);
					item.status = columnId;
				} catch (err) {
					console.error('Failed to update DSR status:', err);
					await loadRequests();
					break;
				}
			}
		}
	}

	async function handleCreate() {
		if (!requesterName.trim() || !requesterEmail.trim()) return;

		const payload: CreateDsrPayload = {
			org_id: orgId,
			request_type: requestType,
			requester_name: requesterName.trim(),
			requester_email: requesterEmail.trim(),
			requested_scope: requestedScope.trim() || undefined,
			data_location: dataLocation.trim() || undefined,
			notes: notes.trim() || undefined
		};

		try {
			await createDsrRequest(payload);
			showModal = false;
			resetForm();
			await loadRequests();
		} catch (err) {
			console.error('Failed to create DSR request:', err);
			alert('Failed to record DSR: ' + err);
		}
	}

	async function openDetailModal(req: DsrRequest) {
		selectedRequest = req;
		loadingLogs = true;
		try {
			actionLogs = await listDsrActionLogs(req.id);
		} catch (err) {
			console.error('Failed to load action logs:', err);
			actionLogs = [];
		} finally {
			loadingLogs = false;
		}
	}

	function openResolutionForm(req: DsrRequest, status: 'ACTIONED' | 'REJECTED') {
		selectedRequest = req;
		resolutionStatus = status;
		resolutionAction = status === 'ACTIONED' ? 'EXTRACTED_PROVIDED' : 'DENIED';
		resolutionLocation = req.data_location || '';
		resolutionDetails = '';
		resolutionSummary = '';
		isResolveModalOpen = true;
	}

	async function submitResolution() {
		if (!selectedRequest || !resolutionSummary.trim()) return;

		const payload: ResolveDsrPayload = {
			id: selectedRequest.id,
			status: resolutionStatus,
			action_taken: resolutionAction,
			action_details: resolutionDetails.trim() || resolutionSummary.trim(),
			data_location: resolutionLocation.trim() || undefined,
			resolution_summary: resolutionSummary.trim(),
			performed_by: resolutionPerformer.trim() || 'Data Protection Officer'
		};

		try {
			await resolveDsrRequest(payload);
			isResolveModalOpen = false;
			await loadRequests();
			if (selectedRequest) {
				const updated = allRequests.find((r) => r.id === selectedRequest?.id);
				if (updated) openDetailModal(updated);
			}
		} catch (err) {
			alert('Failed to resolve DSR: ' + err);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to permanently delete this DSR log entry from the institutional registry?')) return;
		try {
			await deleteDsrRequest(id);
			if (selectedRequest?.id === id) selectedRequest = null;
			await loadRequests();
		} catch (err) {
			alert('Failed to delete: ' + err);
		}
	}

	function resetForm() {
		requestType = 'Access';
		requesterName = '';
		requesterEmail = '';
		requestedScope = '';
		dataLocation = '';
		notes = '';
	}

	function getSlaDetails(deadlineStr: string) {
		const deadline = new Date(deadlineStr).getTime();
		const diffMs = deadline - now;
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		return {
			diffDays,
			isOverdue: diffDays < 0,
			isUrgent: diffDays >= 0 && diffDays <= 5
		};
	}

	function getBadgeForType(type: string): string {
		switch (type) {
			case 'Access': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
			case 'Rectification': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
			case 'Erasure': return 'bg-rose-50 text-rose-800 border-rose-200';
			case 'Portability': return 'bg-purple-50 text-purple-800 border-purple-200';
			case 'Objection': return 'bg-amber-50 text-amber-800 border-amber-200';
			default: return 'bg-slate-50 text-slate-800 border-slate-200';
		}
	}
</script>

<svelte:head>
	<title>Data Subject Rights (DSR) Helpdesk & Audit Trail — TANOD</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
					RA 10173 Chapter IV
				</span>
				<span class="text-xs text-slate-500 font-mono">30-Day Statutory SLA & Historical Action Trail</span>
			</div>
			<h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">Data Subject Rights (DSR) Helpdesk</h1>
			<p class="text-sm text-slate-600 mt-1 max-w-3xl">
				Log, investigate, and audit data subject requests (Access, Rectification, Erasure, Portability, Objection). Every extraction, redaction, and resolution is cryptographically chained into the tamper-evident audit trail.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				on:click={() => { resetForm(); showModal = true; }}
				class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all cursor-pointer"
			>
				<Plus class="w-4 h-4" />
				Log New Data Subject Request
			</button>
		</div>
	</div>

	<!-- Search, Filter & Dual View Switcher Bar -->
	<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
		<!-- Search Query -->
		<div class="relative flex-1 min-w-[260px]">
			<Search class="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by data subject, email, requested data, or ID..."
				class="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white"
			/>
		</div>

		<!-- Filters & View Switcher -->
		<div class="flex flex-wrap items-center gap-2">
			<!-- Type Filter -->
			<select
				bind:value={filterType}
				class="text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-medium"
			>
				<option value="ALL">All Rights (5 Types)</option>
				{#each DSR_TYPES as t}
					<option value={t.value}>{t.label}</option>
				{/each}
			</select>

			<!-- SLA Urgency Filter -->
			<select
				bind:value={filterSla}
				class="text-xs px-3 py-2 rounded-md border border-slate-300 bg-white font-medium"
			>
				<option value="ALL">All SLA Timelines</option>
				<option value="OVERDUE">⚠️ Overdue Only (&lt; 0d)</option>
				<option value="URGENT">⏳ Urgent Only (&le; 5d)</option>
			</select>

			<!-- Dual View Switcher -->
			<div class="flex items-center p-0.5 rounded-lg border border-slate-300 bg-slate-100 ml-1">
				<button
					type="button"
					on:click={() => (viewMode = 'kanban')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all {viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}"
				>
					<LayoutGrid class="h-3.5 w-3.5" />
					<span>Kanban</span>
				</button>
				<button
					type="button"
					on:click={() => (viewMode = 'table')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all {viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}"
				>
					<List class="h-3.5 w-3.5" />
					<span>Table Grid</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Main Body: Kanban View vs Table View -->
	{#if loading}
		<div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
			<div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
			Loading DSR Registry & Audit Trail...
		</div>
	{:else if viewMode === 'kanban'}
		<!-- KANBAN BOARD WITH INTERNAL COLUMN SCROLLING -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each COLUMNS as col}
				<div class="flex flex-col rounded-xl border {col.border} {col.bg} p-3 shadow-2xs h-[calc(100vh-270px)] min-h-[500px]">
					<!-- Column Header (Sticky) -->
					<div class="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-2 px-1 shrink-0">
						<div class="flex items-center gap-2">
							<span class="font-bold text-xs uppercase tracking-wider text-slate-900">{col.label}</span>
							<span class="text-xs px-2 py-0.5 rounded-full {col.badge} border font-mono font-bold">
								{itemsByColumn[col.id].length}
							</span>
						</div>
					</div>

					<!-- Drag and Drop Zone with Internal Overflow Scrolling -->
					<div
						use:dndzone={{ items: itemsByColumn[col.id], flipDurationMs: 200, dropTargetStyle: { outline: '2px dashed #10b981', borderRadius: '0.5rem' } }}
						on:consider={(e) => handleDndConsider(col.id, e)}
						on:finalize={(e) => handleDndFinalize(col.id, e)}
						class="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1"
					>
						{#if itemsByColumn[col.id].length === 0}
							<div class="h-full flex items-center justify-center p-6 text-center text-xs text-slate-400 italic font-mono border-2 border-dashed border-slate-200 rounded-lg">
								Drop requests here
							</div>
						{:else}
							{#each itemsByColumn[col.id] as item (item.id)}
								{@const sla = getSlaDetails(item.sla_deadline)}
								<div
									animate:flip={{ duration: 200 }}
									class="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-2xs transition-all cursor-grab active:cursor-grabbing hover:shadow-xs text-left group shrink-0"
									on:click={() => openDetailModal(item)}
									role="button"
									tabindex="0"
									on:keydown={(e) => e.key === 'Enter' && openDetailModal(item)}
								>
									<!-- Badge & SLA -->
									<div class="flex items-center justify-between gap-1 mb-2">
										<span class="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border {getBadgeForType(item.request_type)}">
											{item.request_type}
										</span>

										{#if item.status !== 'ACTIONED' && item.status !== 'REJECTED'}
											{#if sla.isOverdue}
												<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
													OVERDUE ({Math.abs(sla.diffDays)}d)
												</span>
											{:else if sla.isUrgent}
												<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
													{sla.diffDays}d left
												</span>
											{:else}
												<span class="text-[10px] text-slate-500 font-mono">
													{sla.diffDays}d left
												</span>
											{/if}
										{:else}
											<span class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
												✓ {item.status === 'ACTIONED' ? 'Granted' : 'Denied'}
											</span>
										{/if}
									</div>

									<!-- Requester Name & Scope -->
									<div class="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
										{item.requester_name}
									</div>
									<div class="text-[11px] text-slate-500 truncate mb-1">
										{item.requester_email}
									</div>

									{#if item.requested_scope}
										<div class="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 line-clamp-2 my-1.5">
											<strong class="text-slate-800 font-semibold block text-[10px] uppercase">Requested Scope:</strong>
											{item.requested_scope}
										</div>
									{/if}

									<!-- Action Taken Pill if resolved -->
									{#if item.action_taken}
										<div class="text-[10px] font-mono text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 truncate">
											Action: {item.action_taken}
										</div>
									{/if}

									<!-- Footer: ID & Date -->
									<div class="flex items-center justify-between text-[10px] pt-2 border-t border-slate-100 mt-2 text-slate-400 font-mono">
										<span>DSR-{item.id.slice(0, 6)}</span>
										<span>{new Date(item.received_date).toLocaleDateString()}</span>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- TABULAR DATA GRID VIEW -->
		<div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px] font-mono">
						<tr>
							<th class="px-5 py-3.5">Ref ID / Data Subject</th>
							<th class="px-5 py-3.5">Right Invoked</th>
							<th class="px-5 py-3.5">Requested Data / Scope</th>
							<th class="px-5 py-3.5">Storage Location</th>
							<th class="px-5 py-3.5">SLA Countdown</th>
							<th class="px-5 py-3.5">Action Taken & Status</th>
							<th class="px-5 py-3.5 text-right">Review</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each allRequests as r}
							{@const sla = getSlaDetails(r.sla_deadline)}
							<tr class="hover:bg-slate-50/80 transition-colors">
								<td class="px-5 py-4 space-y-0.5">
									<div class="font-bold text-slate-900 text-xs">{r.requester_name}</div>
									<div class="text-[11px] text-slate-500">{r.requester_email}</div>
									<div class="text-[10px] font-mono text-slate-400">DSR-{r.id.slice(0, 8)}</div>
								</td>
								<td class="px-5 py-4">
									<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border {getBadgeForType(r.request_type)}">
										{r.request_type}
									</span>
								</td>
								<td class="px-5 py-4 max-w-xs">
									<p class="text-[11px] text-slate-700 line-clamp-2">
										{r.requested_scope || r.notes || 'General personal information request'}
									</p>
								</td>
								<td class="px-5 py-4 font-mono text-[11px] text-slate-600">
									{r.data_location || 'Not specified'}
								</td>
								<td class="px-5 py-4">
									{#if r.status === 'ACTIONED' || r.status === 'REJECTED'}
										<span class="text-[11px] text-emerald-700 font-semibold">Resolved</span>
									{:else if sla.isOverdue}
										<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 animate-pulse font-mono">
											OVERDUE ({Math.abs(sla.diffDays)}d)
										</span>
									{:else if sla.isUrgent}
										<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
											{sla.diffDays}d remaining
										</span>
									{:else}
										<span class="text-[11px] font-mono text-slate-600">{sla.diffDays}d remaining</span>
									{/if}
								</td>
								<td class="px-5 py-4 space-y-1">
									<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border {r.status === 'ACTIONED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : r.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'}">
										{r.status}
									</span>
									{#if r.action_taken}
										<div class="text-[10px] font-mono text-slate-500">
											{r.action_taken}
										</div>
									{/if}
								</td>
								<td class="px-5 py-4 text-right">
									<button
										type="button"
										on:click={() => openDetailModal(r)}
										class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
									>
										Manage Trail →
									</button>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="7" class="p-12 text-center text-xs text-slate-400">
									No DSR requests match your current filters.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Log DSR Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-100 pb-3">
				<div>
					<h3 class="text-lg font-bold text-slate-900">Log Data Subject Rights (DSR) Request</h3>
					<p class="text-xs text-slate-500">RA 10173 mandates response within thirty (30) calendar days.</p>
				</div>
				<button type="button" aria-label="Close modal" on:click={() => showModal = false} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={handleCreate} class="space-y-4">
				<div>
					<span class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Right Invoked *</span>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{#each DSR_TYPES as t}
							<label class="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all {requestType === t.value ? 'bg-emerald-50 border-emerald-500 text-slate-900 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}">
								<input type="radio" bind:group={requestType} value={t.value} class="mt-0.5 text-emerald-600 focus:ring-emerald-600" />
								<div>
									<div class="text-xs font-bold text-slate-900">{t.label}</div>
									<div class="text-[10px] text-slate-500">{t.desc}</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="dsr-name" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Data Subject Name *</label>
						<input
							id="dsr-name"
							type="text"
							bind:value={requesterName}
							placeholder="Juan Dela Cruz"
							required
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
						/>
					</div>

					<div>
						<label for="dsr-email" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Contact Email *</label>
						<input
							id="dsr-email"
							type="email"
							bind:value={requesterEmail}
							placeholder="juan.delacruz@example.com"
							required
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
						/>
					</div>
				</div>

				<div>
					<label for="dsr-scope" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Requested Data Particulars / Scope</label>
					<input
						id="dsr-scope"
						type="text"
						bind:value={requestedScope}
						placeholder="e.g. 2024-2025 CCTV footage at 2nd Floor Lobby, Payroll slips from Jan-Dec"
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
					/>
				</div>

				<div>
					<label for="dsr-location" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Target Storage Location / System</label>
					<input
						id="dsr-location"
						type="text"
						bind:value={dataLocation}
						placeholder="e.g. HRIS PostgreSQL Database, Physical Archive Cabinet #3, Cloud Storage"
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
					/>
				</div>

				<div>
					<label for="dsr-notes" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Additional Notes</label>
					<textarea
						id="dsr-notes"
						bind:value={notes}
						rows="2"
						placeholder="Additional context or submission details provided by data subject..."
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 placeholder-slate-400"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
						type="button"
						on:click={() => showModal = false}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-xs"
					>
						Record Statutory Request
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Detail Drawer & Historical Action Trail Modal -->
{#if selectedRequest}
	{@const req = selectedRequest}
	{@const sla = getSlaDetails(req.sla_deadline)}
	<div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-100 pb-3">
				<div>
					<div class="flex items-center gap-2">
						<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border {getBadgeForType(req.request_type)}">
							{req.request_type}
						</span>
						<span class="text-xs text-slate-400 font-mono">DSR-{req.id.slice(0, 8)}</span>
						<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border {req.status === 'ACTIONED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : req.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'}">
							{req.status}
						</span>
					</div>
					<h3 class="text-lg font-bold text-slate-900 mt-1">{req.requester_name}</h3>
				</div>
				<button type="button" aria-label="Close details" on:click={() => selectedRequest = null} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Metadata Grid -->
			<div class="space-y-4 text-sm">
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
					<div>
						<div class="text-slate-500 font-medium">Email Address</div>
						<div class="font-semibold text-slate-900 truncate">{req.requester_email}</div>
					</div>
					<div>
						<div class="text-slate-500 font-medium">Received Date</div>
						<div class="font-semibold text-slate-900">{new Date(req.received_date).toLocaleDateString()}</div>
					</div>
					<div>
						<div class="text-slate-500 font-medium">30-Day SLA Deadline</div>
						<div class="font-bold {sla.isOverdue ? 'text-rose-600' : 'text-slate-900'}">
							{new Date(req.sla_deadline).toLocaleDateString()} ({sla.diffDays}d)
						</div>
					</div>
					<div>
						<div class="text-slate-500 font-medium">Resolution Date</div>
						<div class="font-semibold text-slate-900">{req.resolved_date ? new Date(req.resolved_date).toLocaleDateString() : 'Pending'}</div>
					</div>
				</div>

				<!-- What the data subject wanted & where data is stored -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
						<span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">What Was Requested (Scope)</span>
						<p class="text-xs text-slate-800 font-medium leading-relaxed">
							{req.requested_scope || 'General inquiry across institutional personal information records.'}
						</p>
					</div>

					<div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
						<span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Location of Personal Data</span>
						<p class="text-xs text-slate-800 font-mono leading-relaxed">
							{req.data_location || 'Local databases & physical files'}
						</p>
					</div>
				</div>

				<!-- Resolution Summary if granted or denied -->
				{#if req.resolution_summary}
					<div class="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
						<div class="flex items-center gap-2">
							<ShieldCheck class="w-4 h-4 text-emerald-700" />
							<span class="font-bold uppercase tracking-wider text-[11px]">Final Resolution Record:</span>
						</div>
						<p class="leading-relaxed pl-6">{req.resolution_summary}</p>
						{#if req.action_taken}
							<p class="text-[10px] font-mono text-emerald-800 pl-6">
								Statutory Action Executed: <strong>{req.action_taken}</strong>
							</p>
						{/if}
					</div>
				{/if}

				<!-- Historical Action Trail Section -->
				<div class="space-y-2 pt-2 border-t border-slate-100">
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
							<History class="w-3.5 h-3.5 text-amber-600" />
							<span>Historical Action Trail ({actionLogs.length} Events)</span>
						</span>
						<span class="text-[10px] text-slate-400 font-mono">Immutable Compliance Trail</span>
					</div>

					{#if loadingLogs}
						<div class="p-4 text-center text-xs text-slate-400">Loading audit trail...</div>
					{:else if actionLogs.length === 0}
						<div class="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
							No historical actions logged yet. Resolve the request to record what was provided, redacted, or erased.
						</div>
					{:else}
						<div class="space-y-2 max-h-48 overflow-y-auto pr-1">
							{#each actionLogs as log}
								<div class="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
									<div class="flex items-center justify-between">
										<span class="font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
											{log.action_taken}
										</span>
										<span class="text-[10px] font-mono text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
									</div>
									<p class="text-slate-800 font-medium">{log.action_details}</p>
									{#if log.data_location}
										<div class="text-[10px] text-slate-500 font-mono">Target: {log.data_location}</div>
									{/if}
									<div class="text-[9px] text-slate-400">Performed by: {log.performed_by}</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Workflow Stage Transition & Resolution Buttons -->
				<div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-1.5">
						{#each COLUMNS as col}
							<button
								type="button"
								on:click={async () => {
									if (selectedRequest) {
										await updateDsrStatus(selectedRequest.id, col.id);
										selectedRequest.status = col.id;
										await loadRequests();
									}
								}}
								class="px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer {req.status === col.id ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}"
							>
								{col.label}
							</button>
						{/each}
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							on:click={() => openResolutionForm(req, 'ACTIONED')}
							class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
						>
							<CheckCircle2 class="w-3.5 h-3.5" />
							<span>Grant / Execute Action</span>
						</button>
						<button
							type="button"
							on:click={() => openResolutionForm(req, 'REJECTED')}
							class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
						>
							<XCircle class="w-3.5 h-3.5" />
							<span>Deny Request</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between pt-3 border-t border-slate-100">
				<button
					type="button"
					on:click={() => handleDelete(req.id)}
					class="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
				>
					Delete Entry
				</button>
				<button
					type="button"
					on:click={() => selectedRequest = null}
					class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Form: Resolve & Log Specific Action Taken (Redacted, Erased, Provided) -->
{#if isResolveModalOpen && selectedRequest}
	<div class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-100 pb-3">
				<div>
					<h3 class="text-sm font-bold text-slate-900">
						{resolutionStatus === 'ACTIONED' ? 'Log Statutory Action & Resolution' : 'Record Lawful Denial of Request'}
					</h3>
					<p class="text-xs text-slate-500">Record what was given, redacted, erased, or denied for future audit inspection.</p>
				</div>
				<button type="button" aria-label="Close" on:click={() => isResolveModalOpen = false} class="text-slate-400 hover:text-slate-700">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={submitResolution} class="space-y-3.5">
				<div>
					<label for="res-action" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Specific Action Taken *</label>
					<select
						id="res-action"
						bind:value={resolutionAction}
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
					>
						{#each ACTION_OPTIONS as opt}
							<option value={opt.value}>{opt.label} — {opt.desc}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="res-location" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Data Location / System Affected</label>
					<input
						id="res-location"
						type="text"
						bind:value={resolutionLocation}
						placeholder="e.g. Oracle DB Table 'users', Paper Archive Folder A-12"
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
					/>
				</div>

				<div>
					<label for="res-summary" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Executive Summary of Resolution *</label>
					<textarea
						id="res-summary"
						bind:value={resolutionSummary}
						rows="3"
						placeholder="e.g. Extracted complete billing records from Jan 2024 to Dec 2025 in password-protected ZIP. Delivered to juan@example.com following identity verification."
						required
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
					></textarea>
				</div>

				<div>
					<label for="res-details" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Technical Particulars / Redaction Details (Optional)</label>
					<textarea
						id="res-details"
						bind:value={resolutionDetails}
						rows="2"
						placeholder="Third-party identifying information redacted pursuant to Section 12/13 confidentiality..."
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
					<button
						type="button"
						on:click={() => isResolveModalOpen = false}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs"
					>
						Confirm & Append to Audit Trail
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

