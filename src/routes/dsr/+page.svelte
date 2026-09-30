<script lang="ts">
	import { onMount } from 'svelte';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import {
		listDsrRequests,
		createDsrRequest,
		updateDsrStatus,
		deleteDsrRequest
	} from '$lib/api/enforcement';
	import { getOrganization } from '$lib/api/admin';
	import type { DsrRequest, CreateDsrPayload } from '$lib/types/enforcement';

	type DsrStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'ACTIONED' | 'REJECTED';
	type DsrType = 'Access' | 'Erasure' | 'Rectification' | 'Portability' | 'Objection';

	const COLUMNS: { id: DsrStatus; label: string; bg: string; border: string; badge: string }[] = [
		{ id: 'RECEIVED', label: '1. Received', bg: 'bg-slate-900/40', border: 'border-slate-800', badge: 'bg-slate-800 text-slate-300' },
		{ id: 'UNDER_REVIEW', label: '2. Under Review', bg: 'bg-amber-950/20', border: 'border-amber-900/40', badge: 'bg-amber-900/60 text-amber-300' },
		{ id: 'ACTIONED', label: '3. Actioned / Granted', bg: 'bg-emerald-950/20', border: 'border-emerald-900/40', badge: 'bg-emerald-900/60 text-emerald-300' },
		{ id: 'REJECTED', label: '4. Rejected / Denied', bg: 'bg-rose-950/20', border: 'border-rose-900/40', badge: 'bg-rose-900/60 text-rose-300' }
	];

	const DSR_TYPES: { value: DsrType; label: string; desc: string }[] = [
		{ value: 'Access', label: 'Right to Access (Sec. 16c)', desc: 'Obtain copy of personal data and processing details' },
		{ value: 'Rectification', label: 'Right to Rectification (Sec. 16d)', desc: 'Dispute and correct inaccurate or outdated data' },
		{ value: 'Erasure', label: 'Right to Erasure / Blocking (Sec. 16e)', desc: 'Suspend, withdraw, or order blocking/removal' },
		{ value: 'Portability', label: 'Right to Data Portability (Sec. 18)', desc: 'Obtain data in structured, commonly used electronic format' },
		{ value: 'Objection', label: 'Right to Object (Sec. 16b)', desc: 'Object to processing for marketing, profiling, or research' }
	];

	let itemsByColumn: Record<DsrStatus, DsrRequest[]> = {
		RECEIVED: [],
		UNDER_REVIEW: [],
		ACTIONED: [],
		REJECTED: []
	};

	let orgId = '';
	let loading = true;
	let showModal = false;
	let selectedRequest: DsrRequest | null = null;
	let now = Date.now();

	// Modal form
	let requestType: DsrType = 'Access';
	let requesterName = '';
	let requesterEmail = '';
	let notes = '';

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
			itemsByColumn = {
				RECEIVED: all.filter((r) => r.status === 'RECEIVED'),
				UNDER_REVIEW: all.filter((r) => r.status === 'UNDER_REVIEW'),
				ACTIONED: all.filter((r) => r.status === 'ACTIONED'),
				REJECTED: all.filter((r) => r.status === 'REJECTED')
			};
		} catch (err) {
			console.error('Failed to load DSR requests:', err);
		}
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
			notes: notes.trim() || undefined
		};

		try {
			const created = await createDsrRequest(payload);
			itemsByColumn.RECEIVED = [created, ...itemsByColumn.RECEIVED];
			showModal = false;
			resetForm();
		} catch (err) {
			console.error('Failed to create DSR request:', err);
			alert('Failed to record DSR: ' + err);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this DSR log entry?')) return;
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
			case 'Access': return 'bg-cyan-950 text-cyan-400 border border-cyan-800/40';
			case 'Rectification': return 'bg-indigo-950 text-indigo-400 border border-indigo-800/40';
			case 'Erasure': return 'bg-rose-950 text-rose-400 border border-rose-800/40';
			case 'Portability': return 'bg-purple-950 text-purple-400 border border-purple-800/40';
			case 'Objection': return 'bg-amber-950 text-amber-400 border border-amber-800/40';
			default: return 'bg-slate-850 text-slate-300 border border-slate-700';
		}
	}
</script>

<svelte:head>
	<title>Data Subject Rights (DSR) Kanban — TANOD</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
					RA 10173 Chapter IV
				</span>
				<span class="text-xs text-slate-500">Statutory 30-Day SLA Enforcement</span>
			</div>
			<h1 class="text-2xl font-bold text-white tracking-tight mt-1">Data Subject Rights (DSR) Kanban</h1>
			<p class="text-sm text-slate-400 mt-1 max-w-2xl">
				Monitor and resolve data subject requests (Access, Rectification, Erasure, Portability, Objection) with statutory 30-day timeline tracking.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				on:click={() => { resetForm(); showModal = true; }}
				class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Log New Data Subject Request
			</button>
		</div>
	</div>

	<!-- Kanban Board -->
	{#if loading}
		<div class="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
			<div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
			Loading DSR Registry...
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{#each COLUMNS as col}
				<div class="flex flex-col rounded-xl border {col.border} {col.bg} p-3 min-h-[550px]">
					<!-- Column Header -->
					<div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 px-1">
						<div class="flex items-center gap-2">
							<span class="font-semibold text-sm text-slate-200">{col.label}</span>
							<span class="text-xs px-2 py-0.5 rounded-full {col.badge} font-mono font-medium">
								{itemsByColumn[col.id].length}
							</span>
						</div>
					</div>

					<!-- Drag and Drop Zone -->
					<div
						use:dndzone={{ items: itemsByColumn[col.id], flipDurationMs: 200, dropTargetStyle: { outline: '2px dashed #10b981', borderRadius: '0.5rem' } }}
						on:consider={(e) => handleDndConsider(col.id, e)}
						on:finalize={(e) => handleDndFinalize(col.id, e)}
						class="flex-1 flex flex-col gap-3 min-h-[450px]"
					>
						{#each itemsByColumn[col.id] as item (item.id)}
							{@const sla = getSlaDetails(item.sla_deadline)}
							<div
								animate:flip={{ duration: 200 }}
								class="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg p-3.5 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md text-left group"
								on:click={() => selectedRequest = item}
								role="button"
								tabindex="0"
								on:keydown={(e) => e.key === 'Enter' && (selectedRequest = item)}
							>
								<!-- Top row: Type badge & SLA -->
								<div class="flex items-center justify-between gap-2 mb-2">
									<span class="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded {getBadgeForType(item.request_type)}">
										{item.request_type}
									</span>

									{#if item.status !== 'ACTIONED' && item.status !== 'REJECTED'}
										{#if sla.isOverdue}
											<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
												OVERDUE ({Math.abs(sla.diffDays)}d)
											</span>
										{:else if sla.isUrgent}
											<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
												{sla.diffDays}d left
											</span>
										{:else}
											<span class="text-[10px] text-slate-400 font-mono">
												{sla.diffDays}d left
											</span>
										{/if}
									{:else}
										<span class="text-[10px] text-emerald-400 font-medium">
											Resolved
										</span>
									{/if}
								</div>

								<!-- Data Subject Name -->
								<div class="font-medium text-sm text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
									{item.requester_name}
								</div>
								<div class="text-xs text-slate-400 truncate mb-2">
									{item.requester_email}
								</div>

								{#if item.notes}
									<p class="text-xs text-slate-300 line-clamp-2 mb-3 bg-slate-950/40 p-2 rounded border border-slate-800/60">
										{item.notes}
									</p>
								{/if}

								<!-- Footer: Date & Reference -->
								<div class="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
									<span class="text-slate-500 font-mono text-[10px]">
										DSR-{item.id.slice(0, 6)}
									</span>
									<span class="text-slate-400 font-mono text-[10px]">
										{new Date(item.received_date).toLocaleDateString()}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Log DSR Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-800 pb-3">
				<div>
					<h3 class="text-lg font-bold text-white">Log Data Subject Rights (DSR) Request</h3>
					<p class="text-xs text-slate-400">RA 10173 mandates response within thirty (30) calendar days.</p>
				</div>
				<button type="button" aria-label="Close modal" on:click={() => showModal = false} class="text-slate-400 hover:text-white p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={handleCreate} class="space-y-4">
				<div>
					<span class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Right Invoked</span>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{#each DSR_TYPES as t}
							<label class="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all {requestType === t.value ? 'bg-emerald-950/40 border-emerald-500 text-white' : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'}">
								<input type="radio" bind:group={requestType} value={t.value} class="mt-0.5 text-emerald-500 focus:ring-emerald-500" />
								<div>
									<div class="text-xs font-medium">{t.label}</div>
									<div class="text-[10px] text-slate-400">{t.desc}</div>
								</div>
							</label>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="dsr-name" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Data Subject Name *</label>
						<input
							id="dsr-name"
							type="text"
							bind:value={requesterName}
							placeholder="Juan Dela Cruz"
							required
							class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
						/>
					</div>

					<div>
						<label for="dsr-email" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Contact Email *</label>
						<input
							id="dsr-email"
							type="email"
							bind:value={requesterEmail}
							placeholder="juan.delacruz@example.com"
							required
							class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
						/>
					</div>
				</div>

				<div>
					<label for="dsr-notes" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Request Particulars & Scope</label>
					<textarea
						id="dsr-notes"
						bind:value={notes}
						rows="3"
						placeholder="Specify the specific processing system, database, or records requested for access, rectification, or deletion..."
						class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
					<button
						type="button"
						on:click={() => showModal = false}
						class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-900/30"
					>
						Record Statutory Request
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Detail Drawer / Modal -->
{#if selectedRequest}
	{@const req = selectedRequest}
	{@const sla = getSlaDetails(req.sla_deadline)}
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-800 pb-3">
				<div>
					<div class="flex items-center gap-2">
						<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded {getBadgeForType(req.request_type)}">
							{req.request_type}
						</span>
						<span class="text-xs text-slate-400 font-mono">DSR-{req.id.slice(0, 8)}</span>
					</div>
					<h3 class="text-lg font-bold text-white mt-1">{req.requester_name}</h3>
				</div>
				<button type="button" aria-label="Close details" on:click={() => selectedRequest = null} class="text-slate-400 hover:text-white p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-4 text-sm">
				<div class="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
					<div>
						<div class="text-xs text-slate-400">Email Address</div>
						<div class="font-medium text-slate-200 truncate">{req.requester_email}</div>
					</div>
					<div>
						<div class="text-xs text-slate-400">Current Status</div>
						<div class="font-semibold text-emerald-400">{req.status}</div>
					</div>
					<div>
						<div class="text-xs text-slate-400">Date Received</div>
						<div class="font-medium text-slate-200">{new Date(req.received_date).toLocaleDateString()}</div>
					</div>
					<div>
						<div class="text-xs text-slate-400">30-Day SLA Deadline</div>
						<div class="font-bold {sla.isOverdue ? 'text-rose-400' : 'text-slate-200'}">
							{new Date(req.sla_deadline).toLocaleDateString()} ({sla.diffDays}d)
						</div>
					</div>
				</div>

				{#if req.notes}
					<div>
						<div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Request Details & Scope</div>
						<div class="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
							{req.notes}
						</div>
					</div>
				{/if}

				<!-- Manual Status Progression -->
				<div class="pt-3 border-t border-slate-800">
					<div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Advance Workflow Stage</div>
					<div class="flex flex-wrap gap-2">
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
								class="px-3 py-1.5 rounded text-xs font-medium border transition-all cursor-pointer {req.status === col.id ? 'bg-emerald-600 border-emerald-500 text-white font-semibold' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'}"
							>
								{col.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="flex items-center justify-between pt-3 border-t border-slate-800">
				<button
					type="button"
					on:click={() => handleDelete(req.id)}
					class="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-950/40"
				>
					Delete Entry
				</button>
				<button
					type="button"
					on:click={() => selectedRequest = null}
					class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
