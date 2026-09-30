<script lang="ts">
	import {
		exportBackupArchive,
		inspectBackupArchive,
		restoreBackupArchive
	} from '$lib/api/backup';
	import type { BackupExportResult, RestoreInspectionResult } from '$lib/types/backup';

	let isExporting = false;
	let exportResult: BackupExportResult | null = null;
	let exportError: string | null = null;

	// Restore state
	let archivePathInput = '';
	let isInspecting = false;
	let inspection: RestoreInspectionResult | null = null;
	let isRestoring = false;
	let restoreSuccessMessage: string | null = null;
	let restoreError: string | null = null;

	async function handleExport() {
		isExporting = true;
		exportResult = null;
		exportError = null;

		try {
			const res = await exportBackupArchive();
			exportResult = res;
		} catch (err) {
			console.error('Export failed:', err);
			exportError = String(err);
		} finally {
			isExporting = false;
		}
	}

	async function handleInspect() {
		if (!archivePathInput.trim()) return;

		isInspecting = true;
		inspection = null;
		restoreError = null;
		restoreSuccessMessage = null;

		try {
			const cleanPath = archivePathInput.trim().replace(/^"|"$/g, '');
			const res = await inspectBackupArchive(cleanPath);
			inspection = res;
		} catch (err) {
			restoreError = 'Failed to inspect package: ' + err;
		} finally {
			isInspecting = false;
		}
	}

	async function handleRestore() {
		if (!inspection || !archivePathInput.trim()) return;

		if (!confirm(
			`WARNING: Restoring will overwrite the current database and statutory documents with the contents of '${inspection.org_name}' (${inspection.file_count} files). Continue?`
		)) {
			return;
		}

		isRestoring = true;
		restoreError = null;
		restoreSuccessMessage = null;

		try {
			const cleanPath = archivePathInput.trim().replace(/^"|"$/g, '');
			const msg = await restoreBackupArchive(cleanPath);
			restoreSuccessMessage = msg;
			inspection = null;
		} catch (err) {
			restoreError = 'Restore failed: ' + err;
		} finally {
			isRestoring = false;
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<svelte:head>
	<title>Disaster Recovery & Clean PC Restoration — TANOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8 pb-12">
	<!-- Header -->
	<div class="border-b border-slate-200 pb-5">
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
				Zero-Cloud Disaster Recovery
			</span>
			<span class="text-xs text-slate-500 font-mono">Stand-alone .tanod Package Engine</span>
		</div>
		<h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">Disaster Recovery & PC Restoration</h1>
		<p class="text-sm text-slate-600 mt-1 max-w-2xl">
			Create portable, self-contained <code class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono text-xs border border-emerald-200">.tanod</code> archive packages encompassing the SQLite database, statutory document vault, organization credentials, and SHA-256 integrity manifest.
		</p>
	</div>

	<!-- Dual Grid: Export vs Restore -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- 1. Export Card -->
		<div class="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xs">
			<div class="space-y-3">
				<div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
					</svg>
				</div>
				<h2 class="text-lg font-bold text-slate-900">Create Disaster Recovery Package</h2>
				<p class="text-xs text-slate-500 leading-relaxed">
					Forces an atomic SQLite WAL checkpoint to flush all pending operations, zips the database, document vault, and assets, and seals them with an SHA-256 manifest.
				</p>
			</div>

			<div class="space-y-3 pt-2">
				{#if exportResult}
					<div class="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2">
						<div class="font-bold text-emerald-800 flex items-center gap-1.5">
							<span>✓ Archive Package Created</span>
						</div>
						<div class="text-slate-700 font-mono break-all text-[11px]">
							{exportResult.archive_path}
						</div>
						<div class="flex items-center justify-between text-slate-600 pt-1 border-t border-emerald-200 font-mono text-[11px]">
							<span>{formatBytes(exportResult.file_size_bytes)}</span>
							<span>{exportResult.file_count} files archived</span>
						</div>
						<div class="text-[10px] text-slate-500 font-mono truncate">
							SHA-256: {exportResult.sha256_checksum.slice(0, 24)}...
						</div>
					</div>
				{/if}

				{#if exportError}
					<div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
						{exportError}
					</div>
				{/if}

				<button
					type="button"
					on:click={handleExport}
					disabled={isExporting}
					class="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
				>
					{#if isExporting}
						<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
						Checkpointing & Compressing...
					{:else}
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
						</svg>
						Export Full Package (.tanod)
					{/if}
				</button>
			</div>
		</div>

		<!-- 2. Restore Card -->
		<div class="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xs">
			<div class="space-y-3">
				<div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-2xs">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
				</div>
				<h2 class="text-lg font-bold text-slate-900">Restore on Clean PC Install</h2>
				<p class="text-xs text-slate-500 leading-relaxed">
					Reconstitute your entire TANOD workspace on a new laptop or formatted PC. Verifies SHA-256 checksums of every item before replacing files.
				</p>
			</div>

			<div class="space-y-3 pt-2">
				<div>
					<label for="restore-path" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Package Path (.tanod)</label>
					<div class="flex gap-2">
						<input
							id="restore-path"
							type="text"
							bind:value={archivePathInput}
							placeholder="C:\Users\...\TANOD_Backup.tanod"
							class="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
						/>
						<button
							type="button"
							on:click={handleInspect}
							disabled={isInspecting || !archivePathInput.trim()}
							class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer shadow-2xs"
						>
							Inspect
						</button>
					</div>
				</div>

				{#if inspection}
					<div class="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-2">
						<div class="font-bold text-blue-900 flex items-center justify-between">
							<span>Package Verified: {inspection.org_name}</span>
							<span class="text-[10px] font-mono text-slate-500">v{inspection.tanod_version}</span>
						</div>
						<div class="text-[11px] text-slate-600">
							Contains {inspection.file_count} verified files • Exported {new Date(inspection.exported_at).toLocaleDateString()}
						</div>
						<button
							type="button"
							on:click={handleRestore}
							disabled={isRestoring}
							class="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
						>
							{#if isRestoring}
								<div class="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></div>
								Unpacking & Restoring Workspace...
							{:else}
								Execute Full Restoration
							{/if}
						</button>
					</div>
				{/if}

				{#if restoreSuccessMessage}
					<div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
						✓ {restoreSuccessMessage}
					</div>
				{/if}

				{#if restoreError}
					<div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
						{restoreError}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Information Strip -->
	<div class="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-2xs">
		<div class="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">ℹ</div>
		<p class="leading-relaxed">
			<strong>Disaster Recovery Procedure:</strong> When onboarding onto a fresh PC, install the TANOD application MSI. Navigate to this <em>Backup & Recovery</em> module and input the path to your latest <code class="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">.tanod</code> archive package. All compliance registries, ROPA records, PIA matrix assessments, 72-hour incident logs, and statutory documents are restored with 100% fidelity.
		</p>
	</div>
</div>
