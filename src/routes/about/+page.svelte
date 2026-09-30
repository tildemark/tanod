<script lang="ts">
	const appVersion = '0.1.0';
	const developer = {
		name: 'Alfredo Sanchez Jr',
		email: 'derf@sanchez.ph',
		website: 'https://sanchez.ph',
		github: 'https://github.com/tildemark/tanod'
	};
</script>

<svelte:head>
	<title>About TANOD — Privacy-First Desktop Workspace for Philippine DPOs</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8 pb-12">
	<!-- Top Hero / App Presentation -->
	<div class="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
		<div class="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

		<div class="flex flex-col sm:flex-row items-center sm:items-start gap-8 relative z-10">
			<!-- High-Res Shield Logo -->
			<div class="w-36 h-36 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-slate-950 shrink-0 p-1.5 flex items-center justify-center">
				<img
					src="/images/tanod-logo.jpg"
					alt="TANOD Official Emblem"
					class="w-full h-full object-cover rounded-xl"
				/>
			</div>

			<div class="space-y-3 text-center sm:text-left flex-1">
				<div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
					<span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
						v{appVersion} Production Release
					</span>
					<span class="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
						Tauri v2 + Rust Core
					</span>
					<span class="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/50">
						100% Offline & Sovereign
					</span>
				</div>

				<h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
					TANOD Desktop
				</h1>
				<p class="text-base text-slate-300 font-medium">
					Autonomous, Privacy-First Desktop Workspace for Philippine Data Protection Officers
				</p>
				<p class="text-xs text-slate-400 leading-relaxed max-w-xl">
					Formulated in strict adherence to Republic Act No. 10173 (Data Privacy Act of 2012), National Privacy Commission (NPC) Circular No. 2022-04, Circular 16-03, and Advisory 17-03.
				</p>
			</div>
		</div>
	</div>

	<!-- Developer & Creator Card -->
	<div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
		<div class="flex items-center gap-2">
			<span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/40">
				Lead Engineer & Architect
			</span>
			<span class="text-xs text-slate-500 font-mono">Creator Information</span>
		</div>

		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
			<div class="space-y-1">
				<h2 class="text-xl font-bold text-white tracking-tight">
					{developer.name}
				</h2>
				<p class="text-xs text-slate-400">
					Developer & Solutions Architect • Philippine Privacy Engineering
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<a
					href="mailto:{developer.email}"
					class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
				>
					<svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					{developer.email}
				</a>

				<a
					href={developer.website}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-emerald-800/60 transition-colors"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
					sanchez.ph
				</a>

				<a
					href={developer.github}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
					Source Code
				</a>
			</div>
		</div>
	</div>

	<!-- Core Architectural Principles -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
			<div class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">01 • Zero Cloud Sovereignty</div>
			<p class="text-xs text-slate-300 leading-relaxed">
				All personal data inventories, assessments, and breach logs reside solely in your local <code class="text-emerald-400 font-mono text-[11px]">%APPDATA%\tanod\tanod.db</code>. No telemetric relays, no cloud subscriptions, no external leaks.
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
			<div class="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">02 • Philippine Statutory Engine</div>
			<p class="text-xs text-slate-300 leading-relaxed">
				Custom-tailored to Republic Act No. 10173, NPC Advisory 17-03 4×4 PIA risk matrix, 72-hour mandatory breach countdowns, and NPCRS notarized portal helper workflows.
			</p>
		</div>

		<div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
			<div class="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">03 • Disaster Resilience</div>
			<p class="text-xs text-slate-300 leading-relaxed">
				Integrated Statutory Document Vault archiving corporate proofs by year with native Windows shell execution, plus full portability to clean-installed workstations.
			</p>
		</div>
	</div>

	<!-- Brand Emblems Showcase -->
	<div class="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
		<h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Official Brand Assets</h3>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4">
				<img src="/images/tanod-logo.jpg" alt="Dark Background Emblem" class="w-16 h-16 rounded-lg object-cover border border-amber-500/30" />
				<div>
					<div class="text-sm font-semibold text-white">Dark Shield Emblem</div>
					<div class="text-xs text-slate-400">Primary desktop app branding & system tray</div>
				</div>
			</div>

			<div class="p-4 rounded-xl bg-white border border-slate-300 flex items-center gap-4">
				<img src="/images/tanod-logo-white-bg.jpg" alt="White Background Emblem" class="w-16 h-16 rounded-lg object-cover border border-slate-200" />
				<div>
					<div class="text-sm font-semibold text-slate-900">Pure White Shield Emblem</div>
					<div class="text-xs text-slate-600">Print stationery, letters & board resolutions</div>
				</div>
			</div>
		</div>
	</div>
</div>
