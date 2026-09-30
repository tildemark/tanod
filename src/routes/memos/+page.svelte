<script lang="ts">
	import { onMount } from 'svelte';
	import { listDpoMemos, createDpoMemo, deleteDpoMemo } from '$lib/api/enforcement';
	import { getOrganization, listDepartments } from '$lib/api/admin';
	import type { DpoMemo, CreateMemoPayload } from '$lib/types/enforcement';
	import type { Organization, Department } from '$lib/types/organization';

	type PillarType = 'Organizational' | 'Physical' | 'Technical' | 'Incident';

	const PILLARS: { value: PillarType; label: string; badge: string; desc: string }[] = [
		{ value: 'Organizational', label: 'Organizational Security', badge: 'bg-blue-950 text-blue-300 border-blue-800/40', desc: 'Policies, DPO appointment, training, confidentiality' },
		{ value: 'Physical', label: 'Physical Security', badge: 'bg-amber-950 text-amber-300 border-amber-800/40', desc: 'Access control, server rooms, paper records disposal' },
		{ value: 'Technical', label: 'Technical Security', badge: 'bg-purple-950 text-purple-300 border-purple-800/40', desc: 'Encryption, access logs, firewalls, MFA, backups' },
		{ value: 'Incident', label: 'Breach & Incident Protocol', badge: 'bg-rose-950 text-rose-300 border-rose-800/40', desc: '72-hour notifications, escalation, forensic readiness' }
	];

	let memos: DpoMemo[] = [];
	let org: Organization | null = null;
	let departments: Department[] = [];
	let loading = true;
	let showCreateModal = false;
	let previewMemo: DpoMemo | null = null;
	let selectedPillarFilter: string = 'ALL';

	// Form
	let title = '';
	let pillar: PillarType = 'Organizational';
	let targetDeptId = '';
	let content = '';

	onMount(async () => {
		try {
			const loadedOrg = await getOrganization();
			org = loadedOrg;
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

	async function handleCreate() {
		if (!title.trim() || !content.trim() || !org) return;

		const currentYear = new Date().getFullYear();
		const countNext = memos.length + 1;
		const memoNumber = `DPO-MEMO-${currentYear}-${String(countNext).padStart(3, '0')}`;

		const payload: CreateMemoPayload = {
			org_id: org.id,
			memo_number: memoNumber,
			title: title.trim(),
			pillar,
			target_dept_id: targetDeptId || undefined,
			content: content.trim()
		};

		try {
			const created = await createDpoMemo(payload);
			memos = [created, ...memos];
			showCreateModal = false;
			previewMemo = created;
			resetForm();
		} catch (err) {
			alert('Failed to issue directive: ' + err);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to permanently delete this DPO memo from the institutional registry?')) return;
		try {
			await deleteDpoMemo(id);
			memos = memos.filter((m) => m.id !== id);
			if (previewMemo?.id === id) previewMemo = null;
		} catch (err) {
			alert('Failed to delete directive: ' + err);
		}
	}

	function resetForm() {
		title = '';
		pillar = 'Organizational';
		targetDeptId = '';
		content = '';
	}

	function printMemo() {
		window.print();
	}

	$: filteredMemos = selectedPillarFilter === 'ALL'
		? memos
		: memos.filter((m) => m.pillar === selectedPillarFilter);
</script>

<svelte:head>
	<title>Institutional DPO Memos & Directives — TANOD</title>
</svelte:head>

<!-- Standard App View (Hidden on print) -->
<div class="space-y-6 print:hidden">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/40">
					NPC Circular 16-03 & RA 10173 Sec. 21
				</span>
				<span class="text-xs text-slate-500">Institutional Governance & Accountability</span>
			</div>
			<h1 class="text-2xl font-bold text-white tracking-tight mt-1">DPO Memos & Directives</h1>
			<p class="text-sm text-slate-400 mt-1 max-w-2xl">
				Serialized institutional directives establishing accountability, mandatory privacy protocols, and technical security instructions across the organization.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				on:click={() => { resetForm(); showCreateModal = true; }}
				class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Issue Serialized DPO Directive
			</button>
		</div>
	</div>

	<!-- Filter pills -->
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			on:click={() => selectedPillarFilter = 'ALL'}
			class="px-3 py-1 rounded-full text-xs font-medium border transition-colors {selectedPillarFilter === 'ALL' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}"
		>
			All Directives ({memos.length})
		</button>
		{#each PILLARS as pil}
			<button
				type="button"
				on:click={() => selectedPillarFilter = pil.value}
				class="px-3 py-1 rounded-full text-xs font-medium border transition-colors {selectedPillarFilter === pil.value ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}"
			>
				{pil.label} ({memos.filter(m => m.pillar === pil.value).length})
			</button>
		{/each}
	</div>

	<!-- Memos List -->
	{#if loading}
		<div class="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
			<div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
			Loading Institutional Memo Registry...
		</div>
	{:else if filteredMemos.length === 0}
		<div class="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
			<div class="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</div>
			<p class="font-medium text-slate-300">No Directives Found</p>
			<p class="text-xs text-slate-500 mt-1">Issue institutional privacy policies, directives, or physical security guidelines to record accountability.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-3">
			{#each filteredMemos as memo (memo.id)}
				{@const pil = PILLARS.find(p => p.value === memo.pillar)}
				<div class="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div class="space-y-1.5 flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
								{memo.memo_number}
							</span>
							{#if pil}
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded {pil.badge} border">
									{pil.label}
								</span>
							{/if}
							<span class="text-xs text-slate-500 font-mono">
								Issued: {new Date(memo.issued_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
							</span>
						</div>

						<button
							type="button"
							class="text-left font-semibold text-white text-base hover:text-blue-400 transition-colors block cursor-pointer"
							on:click={() => previewMemo = memo}
						>
							{memo.title}
						</button>

						<div class="text-xs text-slate-400 flex items-center gap-2">
							<span>Target: <strong class="text-slate-200">{memo.target_dept_name || 'All Processing Units'}</strong></span>
							<span>•</span>
							<span>Sign-off: <strong class="text-slate-200">Data Protection Officer</strong></span>
						</div>
					</div>

					<div class="flex items-center gap-2 shrink-0">
						<button
							type="button"
							on:click={() => previewMemo = memo}
							class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
						>
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							View & Print
						</button>

						<button
							type="button"
							on:click={() => handleDelete(memo.id)}
							class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
							aria-label="Delete memo"
							title="Delete Directive"
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

<!-- Modal: Create Serialized Memo -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-800 pb-3">
				<div>
					<h3 class="text-lg font-bold text-white">Draft Institutional Privacy Directive</h3>
					<p class="text-xs text-slate-400">Generates sequential serialized identifier (e.g. DPO-MEMO-2026-001).</p>
				</div>
				<button type="button" aria-label="Close dialog" on:click={() => showCreateModal = false} class="text-slate-400 hover:text-white p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={handleCreate} class="space-y-4">
				<div>
					<label for="memo-title" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subject / Directive Title *</label>
					<input
						id="memo-title"
						type="text"
						bind:value={title}
						placeholder="Mandatory 90-Day Password Rotation and Workstation Lockout Policy"
						required
						class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
					/>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label for="memo-pillar" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Security Pillar / Category</label>
						<select
							id="memo-pillar"
							bind:value={pillar}
							class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
						>
							{#each PILLARS as p}
								<option value={p.value}>{p.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="memo-dept" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Target Department</label>
						<select
							id="memo-dept"
							bind:value={targetDeptId}
							class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
						>
							<option value="">All Personnel & Processing Units</option>
							{#each departments as d}
								<option value={d.id}>{d.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="memo-body" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Directive Body & Statutory Instructions *</label>
					<textarea
						id="memo-body"
						bind:value={content}
						rows="8"
						placeholder="Pursuant to Republic Act No. 10173 and NPC Circular 16-03, all personnel handling personal information are hereby directed to strictly enforce..."
						required
						class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
					<button
						type="button"
						on:click={() => showCreateModal = false}
						class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-900/30"
					>
						Issue & Seal Directive
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

	<!-- Screen Modal Overlay -->
	<div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-white">
		<div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl space-y-6 print:border-none print:shadow-none print:p-0 print:text-black print:bg-white print:max-h-none">
			<!-- Screen Action Bar -->
			<div class="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
				<div class="flex items-center gap-2">
					<span class="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
						{memo.memo_number}
					</span>
					<span class="text-xs text-slate-400">Institutional Letterhead Preview</span>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						on:click={printMemo}
						class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
						</svg>
						Print Official Memo
					</button>
					<button type="button" aria-label="Close preview" on:click={() => previewMemo = null} class="text-slate-400 hover:text-white p-1 rounded-lg">
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
					<div>MEMORANDUM CIRCULAR NO. <strong class="text-slate-950 font-mono text-sm">{memo.memo_number}</strong></div>
					<div>{new Date(memo.issued_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
				</div>

				<!-- Memo Header Table -->
				<div class="grid grid-cols-4 gap-2 text-xs py-4 border-b border-slate-200">
					<div class="font-bold uppercase text-slate-500">FOR:</div>
					<div class="col-span-3 font-semibold text-slate-900">{memo.target_dept_name || 'All Processing Units'}</div>

					<div class="font-bold uppercase text-slate-500">FROM:</div>
					<div class="col-span-3 font-semibold text-slate-900">The Data Protection Officer</div>

					<div class="font-bold uppercase text-slate-500">SUBJECT:</div>
					<div class="col-span-3 font-black text-slate-950 uppercase">{memo.title}</div>

					<div class="font-bold uppercase text-slate-500">PILLAR:</div>
					<div class="col-span-3 font-medium text-slate-700">{pil?.label}</div>
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
						<p>NPC Circular 16-01, 16-03, and 2022-04</p>
						<p class="font-mono text-[9px] text-slate-400 mt-1">Generated via TANOD Local Governance Suite</p>
					</div>

					<div class="text-center min-w-[200px]">
						<div class="h-12 flex items-end justify-center">
							<span class="font-serif italic text-slate-400 text-xs">[Digitally Certified by DPO]</span>
						</div>
						<div class="border-t border-slate-900 pt-1 font-bold text-xs uppercase text-slate-900">
							Data Protection Officer
						</div>
						<div class="text-[10px] text-slate-600">
							Head of Privacy & Compliance
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
