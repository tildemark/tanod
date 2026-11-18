<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		listStatutoryDocuments,
		uploadStatutoryDocument,
		openStatutoryDocument,
		readStatutoryDocument,
		readFileFromDisk,
		openVaultFolder,
		deleteStatutoryDocument
	} from '$lib/api/vault';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import type { UnlistenFn } from '@tauri-apps/api/event';
	import DocumentViewerModal from '$lib/components/vault/DocumentViewerModal.svelte';
	import { AlertTriangle, Sparkles } from 'lucide-svelte';
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
			value: 'SEC_REGISTRATION',
			label: 'SEC / DTI Certificate of Registration',
			desc: 'Official Certificate of Incorporation / DTI Registration establishing the legal juridical entity',
			badge: 'bg-blue-950 text-blue-400 border-blue-800/40',
			requiredAnnual: false
		},
		{
			value: 'NOTARIZED_DPO_FORM',
			label: 'Notarized DPO / COP Form',
			desc: 'Official NPCRS DPO registration application with notary seal & Head of Agency signature',
			badge: 'bg-emerald-950 text-emerald-400 border-emerald-800/40',
			requiredAnnual: true
		},
		{
			value: 'BUSINESS_PERMIT',
			label: "LGU Business Permit / Mayor's Permit",
			desc: 'Current annual Mayor\'s or Business Permit issued by the local government unit',
			badge: 'bg-amber-950 text-amber-400 border-amber-800/40',
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
			value: 'OFFICIAL_RECEIPT',
			label: 'Official Receipt / Payment Proof',
			desc: 'Official receipt (OR) or payment transaction confirmation for NPCRS / LGU reimbursement and financial audit',
			badge: 'bg-emerald-950 text-emerald-300 border-emerald-800/40',
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

	const currentCalendarYear = new Date().getFullYear();

	// Quick pill years: Next Year (planning), Current Year, and Last Year
	$: quickYears = [currentCalendarYear + 1, currentCalendarYear, currentCalendarYear - 1];
	$: isHistoricalActive = !quickYears.includes(activeYear);
	$: historicalYears = availableYears.filter((y) => !quickYears.includes(y));
	let uploadCategory: DocumentCategory = 'NOTARIZED_DPO_FORM';
	let uploadTitle = '';
	let uploadYear: number = new Date().getFullYear();
	let uploadNotes = '';
	let selectedFile: File | null = null;
	let isUploading = false;
	let uploadProgress = 0; // 0 - 100%
	let uploadStatusMessage = '';
	let isCompressing = false;
	let isDraggingFile = false;
	let isReadingDroppedFile = false;
	let droppedFileName = '';
	const NPC_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB NPCRS threshold

	let selectedFilterCategory: DocumentCategory | 'ALL' = 'ALL';

	// Inline PDF / Document Viewer state
	let viewerOpen = false;
	let viewerTitle = '';
	let viewerFilePath = '';
	let viewerDataUri = '';

	let unlistenDragDrop: UnlistenFn | null = null;

	onMount(() => {
		(async () => {
			try {
				const loadedOrg = await getOrganization();
				org = loadedOrg;
				await loadDocuments();

				// Listen to native Tauri OS window drag and drop events
				try {
					const webview = getCurrentWebview();
					unlistenDragDrop = await webview.onDragDropEvent(async (event) => {
						if (event.payload.type === 'over' || event.payload.type === 'enter') {
							if (showUploadModal) {
								isDraggingFile = true;
							}
						} else if (event.payload.type === 'leave') {
							isDraggingFile = false;
						} else if (event.payload.type === 'drop') {
							isDraggingFile = false;
							const paths = event.payload.paths;
							if (paths && paths.length > 0) {
								const droppedPath = paths[0];
								if (!showUploadModal) {
									// If user drops file directly on the vault page, open upload modal
									openUploadForCategory('OTHER_COMPLIANCE', activeYear);
								}
								await loadDroppedFilePath(droppedPath);
							}
						}
					});
				} catch (err) {
					console.warn('Native Tauri drag-drop event listener not available:', err);
				}

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

	onDestroy(() => {
		if (unlistenDragDrop) {
			unlistenDragDrop();
			unlistenDragDrop = null;
		}
	});

	async function loadDroppedFilePath(filePath: string) {
		const extractedName = filePath.split(/[/\\]/).pop() || 'document';
		droppedFileName = extractedName;
		isReadingDroppedFile = true;
		try {
			const loaded = await readFileFromDisk(filePath);
			// Decode base64 into a File object so existing form logic works seamlessly
			const byteCharacters = atob(loaded.base64_content);
			const byteNumbers = new Array(byteCharacters.length);
			for (let i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			const byteArray = new Uint8Array(byteNumbers);
			const blob = new Blob([byteArray], { type: loaded.mime_type });
			const file = new File([blob], loaded.file_name, { type: loaded.mime_type });

			processSelectedFile(file);
		} catch (err) {
			console.error('Failed to load dropped file:', err);
			alert('Failed to process dropped file: ' + err);
		} finally {
			isReadingDroppedFile = false;
		}
	}

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

			// Derive available years:
			// Defaults from 2020 through next year (to allow early planning),
			// plus any years present in uploaded documents.
			const currentYear = new Date().getFullYear();
			const minYear = 2020;
			const maxYear = currentYear + 1;
			const yearsSet = new Set<number>();
			for (let y = minYear; y <= maxYear; y++) {
				yearsSet.add(y);
			}
			all.forEach((d) => yearsSet.add(d.year));
			availableYears = Array.from(yearsSet).sort((a, b) => b - a);
		} catch (err) {
			console.error('Failed to list documents:', err);
		}
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			processSelectedFile(target.files[0]);
		}
	}

	function processSelectedFile(file: File) {
		selectedFile = file;
		if (!uploadTitle) {
			const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
			uploadTitle = nameWithoutExt.replace(/[-_]/g, ' ');
		}
	}

	async function compressSelectedImage() {
		if (!selectedFile || !selectedFile.type.startsWith('image/')) return;
		isCompressing = true;
		try {
			const bitmap = await createImageBitmap(selectedFile);
			const maxDim = 1600;
			let { width, height } = bitmap;
			if (width > maxDim || height > maxDim) {
				if (width > height) {
					height = Math.round((height * maxDim) / width);
					width = maxDim;
				} else {
					width = Math.round((width * maxDim) / height);
					height = maxDim;
				}
			}

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.drawImage(bitmap, 0, 0, width, height);

			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/jpeg', 0.75)
			);
			if (blob && blob.size < selectedFile.size) {
				const compressedFileName = selectedFile.name.replace(/\.[^/.]+$/, '.jpg');
				selectedFile = new File([blob], compressedFileName, { type: 'image/jpeg' });
			}
		} catch (err) {
			console.error('Image compression failed:', err);
		} finally {
			isCompressing = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingFile = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingFile = false;
	}

	function handleFileDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingFile = false;
		if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			processSelectedFile(e.dataTransfer.files[0]);
		}
	}

	async function handleUpload() {
		if (!selectedFile || !org || !uploadTitle.trim()) return;

		isUploading = true;
		uploadProgress = 15;
		uploadStatusMessage = 'Reading local binary buffer...';
		try {
			await new Promise((r) => setTimeout(r, 60));
			// Read file as base64
			const arrayBuffer = await selectedFile.arrayBuffer();
			uploadProgress = 40;
			uploadStatusMessage = 'Encoding sovereign payload...';
			await new Promise((r) => setTimeout(r, 60));

			const bytes = new Uint8Array(arrayBuffer);
			let binary = '';
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			const base64Content = btoa(binary);

			uploadProgress = 70;
			uploadStatusMessage = `Persisting to %APPDATA%\\tanod\\vault\\${uploadYear}...`;

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
			uploadProgress = 100;
			uploadStatusMessage = 'Document archived successfully!';
			await new Promise((r) => setTimeout(r, 120));

			documents = [created, ...documents];
			showUploadModal = false;
			resetUploadForm();
		} catch (err) {
			console.error('Failed to upload statutory document:', err);
			alert('Upload failed: ' + err);
		} finally {
			isUploading = false;
			uploadProgress = 0;
			uploadStatusMessage = '';
		}
	}

	async function handleOpenFile(filePath: string, title?: string) {
		try {
			viewerTitle = title || filePath.split(/[/\\]/).pop() || 'Document';
			viewerFilePath = filePath;
			viewerDataUri = '';
			viewerOpen = true;

			// Read file content locally as base64 data URI
			const dataUri = await readStatutoryDocument(filePath);
			viewerDataUri = dataUri;
		} catch (err) {
			console.error('Failed to view file in internal viewer, falling back to desktop app:', err);
			await openStatutoryDocument(filePath);
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
				onclick={handleOpenVaultFolder}
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
				onclick={() => { resetUploadForm(); showUploadModal = true; }}
				class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-xs transition-all cursor-pointer"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
				</svg>
				Upload Statutory Document
			</button>
		</div>
	</div>

	<!-- Year Selector & Archive Bar -->
	<div class="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 pb-3">
		<div class="flex items-center gap-1.5 flex-wrap">
			<span class="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Compliance Year:</span>
			
			<!-- Quick Selector: Upcoming, Current, Previous -->
			{#each quickYears as yr}
				<button
					type="button"
					onclick={() => activeYear = yr}
					class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 {activeYear === yr ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'}"
				>
					<span>{yr}</span>
					{#if yr === currentCalendarYear}
						<span class="text-[10px] font-medium px-1.5 py-0.2 rounded {activeYear === yr ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}">
							Current
						</span>
					{:else if yr > currentCalendarYear}
						<span class="text-[10px] font-medium px-1.5 py-0.2 rounded {activeYear === yr ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-100 text-amber-800'}">
							Upcoming
						</span>
					{/if}
				</button>
			{/each}

			<div class="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>

			<!-- Compact Archive Dropdown for Past Years (2020 through past, plus any custom years) -->
			<div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
				<svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<label for="archive-year-select" class="text-xs font-semibold text-slate-500">Historical Archive:</label>
				<select
					id="archive-year-select"
					value={isHistoricalActive ? activeYear : ''}
					onchange={(e) => {
						const val = parseInt((e.target as HTMLSelectElement).value, 10);
						if (!isNaN(val)) activeYear = val;
					}}
					class="text-xs font-bold bg-transparent border-0 text-slate-800 focus:outline-none cursor-pointer pr-1 {isHistoricalActive ? 'text-emerald-700 font-extrabold' : ''}"
				>
					<option value="" disabled selected={!isHistoricalActive}>Select Prior Year...</option>
					{#each historicalYears as yr}
						<option value={yr}>{yr} Compliance Archive</option>
					{/each}
				</select>
			</div>
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
									onclick={() => handleOpenFile(doc.file_path, doc.title)}
									class="text-[10px] text-emerald-700 font-semibold hover:underline cursor-pointer"
								>
									View File
								</button>
							{:else}
								<button
									type="button"
									onclick={() => openUploadForCategory(item.category.value, activeYear)}
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
			onclick={() => selectedFilterCategory = 'ALL'}
			class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer {selectedFilterCategory === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'}"
		>
			All ({yearDocuments.length})
		</button>
		{#each CATEGORIES as cat}
			{@const count = yearDocuments.filter(d => d.category === cat.value).length}
			<button
				type="button"
				onclick={() => selectedFilterCategory = cat.value}
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
				onclick={() => { 
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
								onclick={() => handleOpenFile(doc.file_path, doc.title)}
								class="px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-800/50 flex items-center gap-1.5 cursor-pointer"
								title="View document in TANOD PDF viewer"
							>
								<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
								View File
							</button>

							<button
								type="button"
								onclick={() => handleDelete(doc.id)}
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
				<button type="button" aria-label="Close dialog" onclick={() => showUploadModal = false} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleUpload(); }} class="space-y-4">
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
					<label for="vault-file" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
						File Attachment (PDF, JPG, PNG, DOCX) *
					</label>

					<!-- Drag & Drop Zone -->
					<div
						role="region"
						aria-label="File upload drop area"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleFileDrop}
						class="relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center {
							isDraggingFile
								? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
								: selectedFile
								? 'border-emerald-400 bg-emerald-50/30'
								: 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
						}"
					>
						<input
							id="vault-file"
							type="file"
							onchange={handleFileSelect}
							accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
							class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
						/>

						{#if isReadingDroppedFile}
							<div class="flex flex-col items-center gap-2 text-emerald-700 py-2">
								<div class="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full"></div>
								<div class="text-xs font-semibold">Reading dropped file: <span class="font-mono">{droppedFileName}</span>...</div>
								<div class="w-48 bg-emerald-100 rounded-full h-1.5 overflow-hidden">
									<div class="h-full bg-emerald-500 rounded-full animate-pulse w-full"></div>
								</div>
							</div>
						{:else if selectedFile}
							<div class="flex items-center gap-2.5 text-emerald-800">
								<div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div class="text-left min-w-0">
									<p class="text-xs font-bold truncate">{selectedFile.name}</p>
									<p class="text-[10px] text-emerald-600 font-mono">
										{formatBytes(selectedFile.size)}
										{#if selectedFile.size <= NPC_MAX_FILE_BYTES}
											<span class="text-emerald-700 font-semibold ml-1.5">✓ NPCRS Size Compliant (&lt;2 MB)</span>
										{/if}
										• Click or drop file to replace
									</p>
								</div>
							</div>
						{:else}
							<div class="flex flex-col items-center gap-1.5 text-slate-500">
								<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-0.5">
									<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
									</svg>
								</div>
								<p class="text-xs font-semibold text-slate-700">
									Drag & drop your statutory document here, or <span class="text-emerald-700 hover:underline">browse files</span>
								</p>
								<p class="text-[10px] text-slate-400">PDF, PNG, JPG, or DOCX (stored locally in vault)</p>
							</div>
						{/if}
					</div>

					<!-- NPCRS 2MB Notice & Compression Action -->
					{#if selectedFile && selectedFile.size > NPC_MAX_FILE_BYTES}
						<div class="mt-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50/90 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
							<div class="flex items-start gap-2 min-w-0">
								<AlertTriangle class="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<p class="font-bold">File Exceeds NPCRS 2 MB Limit ({formatBytes(selectedFile.size)})</p>
									<p class="text-[11px] text-amber-800 leading-snug">
										The National Privacy Commission NPCRS registration portal rejects files larger than 2 MB. TANOD can store this file locally, but it may be rejected during portal submission.
									</p>
								</div>
							</div>

							{#if selectedFile.type.startsWith('image/')}
								<button
									type="button"
									disabled={isCompressing}
									onclick={compressSelectedImage}
									class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
								>
									{#if isCompressing}
										<div class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
										<span>Compressing...</span>
									{:else}
										<Sparkles class="h-3.5 w-3.5" />
										<span>Optimize to &lt;2 MB</span>
									{/if}
								</button>
							{/if}
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

				{#if isUploading}
					<!-- Upload Progress Bar & Status Text -->
					<div class="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
						<div class="flex items-center justify-between text-xs">
							<span class="font-semibold text-emerald-900 flex items-center gap-2">
								<span class="animate-spin w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full inline-block"></span>
								{uploadStatusMessage || 'Archiving to sovereign vault...'}
							</span>
							<span class="font-mono font-bold text-emerald-800">{uploadProgress}%</span>
						</div>
						<div class="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
							<div
								class="h-full bg-emerald-600 rounded-full transition-all duration-200"
								style="width: {uploadProgress}%"
							></div>
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
					<button
						type="button"
						onclick={() => showUploadModal = false}
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

<!-- In-App Document / PDF Viewer Modal -->
<DocumentViewerModal
	isOpen={viewerOpen}
	title={viewerTitle}
	filePath={viewerFilePath}
	dataUri={viewerDataUri}
	onClose={() => (viewerOpen = false)}
/>
