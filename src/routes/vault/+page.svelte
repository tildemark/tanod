<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listStatutoryDocuments,
		uploadStatutoryDocument,
		openStatutoryDocument,
		openVaultFolder,
		deleteStatutoryDocument
	} from '$lib/api/vault';
	import { getOrganization } from '$lib/api/admin';
	import type { StatutoryDocument, DocumentCategory, UploadDocumentPayload } from '$lib/types/vault';
	import type { Organization } from '$lib/types/organization';

	interface CategoryDef {
		value: DocumentCategory;
		label: string;
		desc: string;
		badge: string;
		requiredAnnual: boolean;
	}

	const CATEGORIES: CategoryDef[] = [
		{
			value: 'NOTARIZED_DPO_FORM',
			label: 'Notarized DPO / COP Form',
			desc: 'Official NPCRS DPO registration application with notary seal & Head of Agency signature',
			badge: 'bg-emerald-950 text-emerald-400 border-emerald-800/40',
			requiredAnnual: true
		},
		{
			value: 'SEC_GIS',
			label: 'SEC General Information Sheet (GIS)',
			desc: 'Latest annual GIS submitted to SEC verifying corporate officers & address',
			badge: 'bg-blue-950 text-blue-400 border-blue-800/40',
			requiredAnnual: true
		},
		{
			value: 'SECRETARY_CERTIFICATE',
			label: "Corporate Secretary's Certificate",
			desc: 'Certified board appointment of designated DPO / COPs',
			badge: 'bg-purple-950 text-purple-400 border-purple-800/40',
			requiredAnnual: true
		},
		{
			value: 'BOARD_RESOLUTION',
			label: 'Board Resolution / Charter',
			desc: 'Resolution adopting the institutional Data Privacy Manual & Policy',
			badge: 'bg-indigo-950 text-indigo-400 border-indigo-800/40',
			requiredAnnual: false
		},
		{
			value: 'NPC_REGISTRATION_CERT',
			label: 'NPC Certificate of Registration',
			desc: 'Official Certificate of Registration issued by the National Privacy Commission',
			badge: 'bg-teal-950 text-teal-400 border-teal-800/40',
			requiredAnnual: true
		},
		{
			value: 'NPC_SEAL_OF_REGISTRATION',
			label: 'NPC Seal of Registration',
			desc: 'High-resolution official NPC compliance seal for website & branch display',
			badge: 'bg-amber-950 text-amber-400 border-amber-800/40',
			requiredAnnual: true
		},
		{
			value: 'DATA_SHARING_AGREEMENT',
			label: 'Data Sharing Agreement (DSA)',
			desc: 'Executed DSAs or Outsourcing Agreements with PIPs/third-party processors',
			badge: 'bg-cyan-950 text-cyan-400 border-cyan-800/40',
			requiredAnnual: false
		},
		{
			value: 'OTHER_COMPLIANCE',
			label: 'Other Statutory Compliance',
			desc: 'Audit reports, proof of privacy training, or regulatory certifications',
			badge: 'bg-slate-850 text-slate-300 border-slate-700',
			requiredAnnual: false
		}
	];

	let org: Organization | null = null;
	let documents: StatutoryDocument[] = [];
	let loading = true;
	let activeYear: number = new Date().getFullYear();
	let availableYears: number[] = [];

	// Upload Modal
	let showUploadModal = false;
	let uploadCategory: DocumentCategory = 'NOTARIZED_DPO_FORM';
	let uploadTitle = '';
	let uploadYear: number = new Date().getFullYear();
	let uploadNotes = '';
	let selectedFile: File | null = null;
	let isUploading = false;

	let selectedFilterCategory: DocumentCategory | 'ALL' = 'ALL';

	onMount(() => {
		(async () => {
			try {
				const loadedOrg = await getOrganization();
				org = loadedOrg;
				await loadDocuments();

				// Check query params if navigated from another page (e.g. ?category=NPC_REGISTRATION_CERT&year=2026)
				if (typeof window !== 'undefined') {
					const params = new URLSearchParams(window.location.search);
					const catParam = params.get('category') as DocumentCategory | null;
					const yearParam = params.get('year');
					if (yearParam) {
						const parsedYear = parseInt(yearParam, 10);
						if (!isNaN(parsedYear)) {
							activeYear = parsedYear;
							uploadYear = parsedYear;
						}
					}
					if (catParam && CATEGORIES.some((c) => c.value === catParam)) {
						openUploadForCategory(catParam, activeYear);
					}
				}
			} catch (err) {
				console.error('Failed to load vault org or documents:', err);
			} finally {
				loading = false;
			}
		})();
	});

	function openUploadForCategory(category: DocumentCategory, year?: number) {
		resetUploadForm();
		uploadCategory = category;
		if (year) {
			uploadYear = year;
			activeYear = year;
		}
		// Pre-populate recommended title
		const catDef = CATEGORIES.find((c) => c.value === category);
		if (catDef) {
			uploadTitle = `${uploadYear} ${catDef.label}`;
		}
		showUploadModal = true;
	}

	async function loadDocuments() {
		if (!org) return;
		try {
			const all = await listStatutoryDocuments(org.id);
			documents = all;

			// Derive available years
			const currentYear = new Date().getFullYear();
			const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
			all.forEach((d) => yearsSet.add(d.year));
			availableYears = Array.from(yearsSet).sort((a, b) => b - a);
		} catch (err) {
			console.error('Failed to list documents:', err);
		}
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
			if (!uploadTitle) {
				// Autofill clean title from filename
				const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
				uploadTitle = nameWithoutExt.replace(/[-_]/g, ' ');
			}
		}
	}

	async function handleUpload() {
		if (!selectedFile || !org || !uploadTitle.trim()) return;

		isUploading = true;
		try {
			// Read file as base64
			const arrayBuffer = await selectedFile.arrayBuffer();
			const bytes = new Uint8Array(arrayBuffer);
			let binary = '';
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			const base64Content = btoa(binary);

			const payload: UploadDocumentPayload = {
				org_id: org.id,
				year: uploadYear,
				category: uploadCategory,
				title: uploadTitle.trim(),
				file_name: selectedFile.name,
				base64_content: base64Content,
				mime_type: selectedFile.type || undefined,
				notes: uploadNotes.trim() || undefined
			};

			const created = await uploadStatutoryDocument(payload);
			documents = [created, ...documents];
			showUploadModal = false;
			resetUploadForm();
		} catch (err) {
			console.error('Failed to upload statutory document:', err);
			alert('Upload failed: ' + err);
		} finally {
			isUploading = false;
		}
	}

	async function handleOpenFile(filePath: string) {
		try {
			await openStatutoryDocument(filePath);
		} catch (err) {
			alert('Failed to launch document: ' + err);
		}
	}

	async function handleOpenVaultFolder() {
		try {
			await openVaultFolder(activeYear);
		} catch (err) {
			alert('Failed to open vault folder: ' + err);
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to permanently delete this statutory document from the vault?')) return;
		try {
			await deleteStatutoryDocument(id);
			documents = documents.filter((d) => d.id !== id);
		} catch (err) {
			alert('Failed to delete document: ' + err);
		}
	}

	function resetUploadForm() {
		uploadCategory = 'NOTARIZED_DPO_FORM';
		uploadTitle = '';
		uploadYear = activeYear;
		uploadNotes = '';
		selectedFile = null;
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	$: yearDocuments = documents.filter((d) => d.year === activeYear);

	// Calculate statutory completeness checklist for active year
	$: statutoryChecklist = CATEGORIES.filter((c) => c.requiredAnnual).map((cat) => {
		const doc = yearDocuments.find((d) => d.category === cat.value);
		return {
			category: cat,
			document: doc,
			isCompliant: Boolean(doc)
		};
	});

	$: complianceRate = statutoryChecklist.length > 0
		? Math.round((statutoryChecklist.filter((c) => c.isCompliant).length / statutoryChecklist.length) * 100)
		: 0;

	$: displayedDocuments = selectedFilterCategory === 'ALL' 
		? yearDocuments 
		: yearDocuments.filter(d => d.category === selectedFilterCategory);
</script>

<svelte:head>
	<title>Statutory Document Vault — TANOD</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
					NPC Circular 2022-04 Compliance Records
				</span>
				<span class="text-xs text-slate-500 font-mono">Local Encrypted Statutory Vault</span>
			</div>
			<h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">Statutory Document Vault</h1>
			<p class="text-sm text-slate-600 mt-1 max-w-2xl">
				Archive your official corporate proofs, SEC GIS, Secretary's Certificates, notarized DPO applications, and NPC Seals organized strictly by compliance year.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="button"
				on:click={handleOpenVaultFolder}
				class="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all cursor-pointer shadow-2xs"
				title="Open Year Folder in Windows Explorer"
			>
				<svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
				Open {activeYear} Folder
			</button>

			<button
				type="button"
				on:click={() => { resetUploadForm(); showUploadModal = true; }}
				class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all cursor-pointer"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				Upload Statutory Document
			</button>
		</div>
	</div>

	<!-- Year Selector Tabs -->
	<div class="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 pb-3">
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Compliance Year:</span>
			{#each availableYears as yr}
				<button
					type="button"
					on:click={() => activeYear = yr}
					class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {activeYear === yr ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'}"
				>
					{yr} Archive
				</button>
			{/each}
		</div>

		<!-- Annual Health Metric -->
		<div class="flex items-center gap-3">
			<span class="text-xs text-slate-600 font-medium">
				{activeYear} Statutory Health:
			</span>
			<div class="flex items-center gap-2">
				<div class="w-24 bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300">
					<div
						class="h-full rounded-full transition-all duration-500 {complianceRate === 100 ? 'bg-emerald-500' : complianceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}"
						style="width: {complianceRate}%"
					></div>
				</div>
				<span class="text-xs font-mono font-bold {complianceRate === 100 ? 'text-emerald-700' : complianceRate >= 60 ? 'text-amber-700' : 'text-rose-700'}">
					{complianceRate}%
				</span>
			</div>
		</div>
	</div>

	<!-- Statutory Annual Requirements Checklist Bar -->
	<div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
		<h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
			<span>NPC Circular 2022-04 Mandatory Filing Checklist for {activeYear}</span>
			<span class="text-[11px] text-slate-500 font-normal">Audit-Ready State</span>
		</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
			{#each statutoryChecklist as item}
				<div class="p-3 rounded-lg border text-xs flex flex-col justify-between {item.isCompliant ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}">
					<div>
						<div class="flex items-center justify-between mb-1.5">
							<span class="font-bold {item.isCompliant ? 'text-emerald-700' : 'text-slate-500'}">{item.isCompliant ? '✓ Archived' : '○ Pending'}</span>
							{#if item.document}
								{@const doc = item.document}
								<button
									type="button"
									on:click={() => handleOpenFile(doc.file_path)}
									class="text-[10px] text-emerald-700 font-semibold hover:underline cursor-pointer"
								>
									View File
								</button>
							{:else}
								<button
									type="button"
									on:click={() => openUploadForCategory(item.category.value, activeYear)}
									class="text-[10px] text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-semibold cursor-pointer transition-colors shadow-2xs"
								>
									+ Upload
								</button>
							{/if}
						</div>
						<div class="font-semibold text-slate-900 truncate" title={item.category.label}>{item.category.label}</div>
						<div class="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.category.desc}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Category Filter Bar -->
	<div class="flex items-center gap-1.5 flex-wrap">
		<span class="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
		<button
			type="button"
			on:click={() => selectedFilterCategory = 'ALL'}
			class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer {selectedFilterCategory === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'}"
		>
			All ({yearDocuments.length})
		</button>
		{#each CATEGORIES as cat}
			{@const count = yearDocuments.filter(d => d.category === cat.value).length}
			<button
				type="button"
				on:click={() => selectedFilterCategory = cat.value}
				class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer {selectedFilterCategory === cat.value ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'}"
			>
				{cat.label} {count > 0 ? `(${count})` : ''}
			</button>
		{/each}
	</div>

	<!-- Documents Grid -->
	{#if loading}
		<div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
			<div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
			Loading Statutory Documents...
		</div>
	{:else if displayedDocuments.length === 0}
		<div class="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-2xs">
			<div class="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
			</div>
			<p class="font-bold text-slate-800">No Documents Found for {activeYear}</p>
			<p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
				{selectedFilterCategory === 'ALL'
					? "Upload your SEC GIS, Secretary's Certificate, notarized NPCRS DPO application, or NPC Certificate of Registration to maintain annual audit compliance."
					: `No archived document under this filter category for ${activeYear}.`}
			</p>
			<button
				type="button"
				on:click={() => { 
					if (selectedFilterCategory !== 'ALL') {
						openUploadForCategory(selectedFilterCategory, activeYear);
					} else {
						resetUploadForm(); 
						showUploadModal = true; 
					}
				}}
				class="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
			>
				Upload {selectedFilterCategory !== 'ALL' ? CATEGORIES.find(c => c.value === selectedFilterCategory)?.label : `${activeYear} File`}
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each displayedDocuments as doc (doc.id)}
				{@const cat = CATEGORIES.find(c => c.value === doc.category)}
				{@const isSeal = doc.category === 'NPC_SEAL_OF_REGISTRATION'}
				{@const isCert = doc.category === 'NPC_REGISTRATION_CERT'}
				<div class="bg-white border {isCert ? 'border-teal-300 ring-1 ring-teal-200' : isSeal ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'} hover:border-slate-300 rounded-xl p-4.5 transition-all flex flex-col justify-between group shadow-2xs">
					<div class="space-y-3">
						<!-- Category badge & year -->
						<div class="flex items-center justify-between gap-2">
							{#if cat}
								<span class="text-[10px] font-semibold px-2 py-0.5 rounded {cat.badge} border flex items-center gap-1">
									{#if isSeal}
										<span>🛡️</span>
									{:else if isCert}
										<span>📜</span>
									{/if}
									<span>{cat.label}</span>
								</span>
							{/if}
							<span class="text-xs text-slate-400 font-mono font-medium">
								{formatBytes(doc.file_size_bytes)}
							</span>
						</div>

						<!-- Document Title -->
						<div>
							<h3 class="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors line-clamp-2">
								{doc.title}
							</h3>
							<div class="text-xs font-mono text-slate-500 mt-1 truncate">
								📁 {doc.file_name}
							</div>
						</div>

						{#if doc.notes}
							<p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 line-clamp-2">
								{doc.notes}
							</p>
						{/if}
					</div>

					<!-- Card Footer Actions -->
					<div class="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
						<span class="text-[10px] text-slate-500 font-mono">
							{new Date(doc.uploaded_at || '').toLocaleDateString()}
						</span>

						<div class="flex items-center gap-2">
							<button
								type="button"
								on:click={() => handleOpenFile(doc.file_path)}
								class="px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-800/50 flex items-center gap-1.5 cursor-pointer"
								title="Open in Windows Desktop App"
							>
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
								Open File
							</button>

							<button
								type="button"
								on:click={() => handleDelete(doc.id)}
								class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
								aria-label="Delete document"
								title="Delete Document"
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Upload Modal -->
{#if showUploadModal}
	<div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-100 pb-3">
				<div>
					<h3 class="text-lg font-bold text-slate-900">Deposit into Statutory Document Vault</h3>
					<p class="text-xs text-slate-500">File is stored locally under %APPDATA%\tanod\vault\{uploadYear}\</p>
				</div>
				<button type="button" aria-label="Close dialog" on:click={() => showUploadModal = false} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={handleUpload} class="space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div class="sm:col-span-2">
						<label for="vault-category" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Category *</label>
						<select
							id="vault-category"
							bind:value={uploadCategory}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="vault-year" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Filing Year *</label>
						<input
							id="vault-year"
							type="number"
							bind:value={uploadYear}
							min="2012"
							max="2035"
							required
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-mono"
						/>
					</div>
				</div>

				<div>
					<label for="vault-title" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Title / Description *</label>
					<input
						id="vault-title"
						type="text"
						bind:value={uploadTitle}
						placeholder="e.g. 2026 Notarized DPO Registration Form & Certificate"
						required
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
					/>
				</div>

				<div>
					<label for="vault-file" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">File Attachment (PDF, JPG, PNG, DOCX) *</label>
					<input
						id="vault-file"
						type="file"
						on:change={handleFileSelect}
						required
						accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
						class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
					/>
					{#if selectedFile}
						<div class="mt-1.5 text-[11px] text-emerald-700 font-mono font-medium">
							Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
						</div>
					{/if}
				</div>

				<div>
					<label for="vault-notes" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Compliance Notes (Optional)</label>
					<textarea
						id="vault-notes"
						bind:value={uploadNotes}
						rows="2"
						placeholder="Notarized on Jan 15, 2026 by Atty. Dela Cruz with Notarial Commission #12345..."
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 placeholder-slate-400"
					></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
						type="button"
						on:click={() => showUploadModal = false}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isUploading}
						class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
					>
						{#if isUploading}
							<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
							Archiving...
						{:else}
							Archive Document
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
