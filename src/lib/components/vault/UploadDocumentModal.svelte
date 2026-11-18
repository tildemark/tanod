<script lang="ts">
	import { onDestroy } from 'svelte';
	import { uploadStatutoryDocument, readFileFromDisk } from '$lib/api/vault';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import type { UnlistenFn } from '@tauri-apps/api/event';
	import { AlertTriangle, Sparkles } from 'lucide-svelte';
	import type { DocumentCategory, StatutoryDocument, UploadDocumentPayload } from '$lib/types/vault';

	interface CategoryDef {
		value: DocumentCategory;
		label: string;
		desc: string;
		badge: string;
		requiredAnnual: boolean;
	}

	interface Props {
		isOpen: boolean;
		orgId: string;
		initialCategory?: DocumentCategory;
		initialYear?: number;
		onSuccess?: (created: StatutoryDocument) => void;
		onClose: () => void;
	}

	let {
		isOpen = false,
		orgId,
		initialCategory = 'NOTARIZED_DPO_FORM',
		initialYear = new Date().getFullYear(),
		onSuccess,
		onClose
	}: Props = $props();

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
			desc: "Current annual Mayor's or Business Permit issued by the local government unit",
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

	const NPC_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB NPCRS threshold

	let uploadCategory = $state<DocumentCategory>('NOTARIZED_DPO_FORM');
	let uploadYear = $state<number>(new Date().getFullYear());
	let uploadTitle = $state('');
	let uploadNotes = $state('');
	let selectedFile = $state<File | null>(null);

	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadStatusMessage = $state('');
	let isCompressing = $state(false);
	let isDraggingFile = $state(false);
	let isReadingDroppedFile = $state(false);
	let droppedFileName = $state('');

	let unlistenDragDrop: UnlistenFn | null = null;

	$effect(() => {
		if (isOpen) {
			uploadCategory = initialCategory;
			uploadYear = initialYear;
			const catDef = CATEGORIES.find((c) => c.value === initialCategory);
			uploadTitle = `${initialYear} ${catDef ? catDef.label : 'Statutory Document'}`;
			uploadNotes = '';
			selectedFile = null;
			isUploading = false;
			uploadProgress = 0;
			uploadStatusMessage = '';

			// Listen to native Tauri OS drag and drop
			(async () => {
				try {
					const webview = getCurrentWebview();
					unlistenDragDrop = await webview.onDragDropEvent(async (event) => {
						if (!isOpen) return;
						if (event.payload.type === 'over' || event.payload.type === 'enter') {
							isDraggingFile = true;
						} else if (event.payload.type === 'leave') {
							isDraggingFile = false;
						} else if (event.payload.type === 'drop') {
							isDraggingFile = false;
							const paths = event.payload.paths;
							if (paths && paths.length > 0) {
								await loadDroppedFilePath(paths[0]);
							}
						}
					});
				} catch (err) {
					console.warn('Native drag-drop listener failed in modal:', err);
				}
			})();
		} else {
			if (unlistenDragDrop) {
				unlistenDragDrop();
				unlistenDragDrop = null;
			}
		}
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

	function handleFileSelect(e: Event) {
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

	async function handleUpload() {
		if (!selectedFile || !orgId || !uploadTitle.trim()) return;

		isUploading = true;
		uploadProgress = 15;
		uploadStatusMessage = 'Reading local binary buffer...';
		try {
			await new Promise((r) => setTimeout(r, 60));
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
				org_id: orgId,
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

			if (onSuccess) onSuccess(created);
			onClose();
		} catch (err) {
			console.error('Failed to upload statutory document:', err);
			alert('Upload failed: ' + err);
		} finally {
			isUploading = false;
			uploadProgress = 0;
			uploadStatusMessage = '';
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
		<div class="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
			<div class="flex items-center justify-between border-b border-slate-100 pb-3">
				<div>
					<h3 class="text-lg font-bold text-slate-900">Deposit into Statutory Document Vault</h3>
					<p class="text-xs text-slate-500 font-mono">Stored securely in %APPDATA%\tanod\vault\{uploadYear}\</p>
				</div>
				<button type="button" aria-label="Close dialog" onclick={onClose} class="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleUpload(); }} class="space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div class="sm:col-span-2">
						<label for="modal-vault-category" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Category *</label>
						<select
							id="modal-vault-category"
							bind:value={uploadCategory}
							class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="modal-vault-year" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Filing Year *</label>
						<input
							id="modal-vault-year"
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
					<label for="modal-vault-title" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Document Title / Description *</label>
					<input
						id="modal-vault-title"
						type="text"
						bind:value={uploadTitle}
						placeholder="e.g. 2026 Notarized DPO Registration Form & Certificate"
						required
						class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
					/>
				</div>

				<div>
					<label for="modal-vault-file" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
							id="modal-vault-file"
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
					<label for="modal-vault-notes" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Compliance Notes (Optional)</label>
					<textarea
						id="modal-vault-notes"
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
						onclick={onClose}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg cursor-pointer"
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
