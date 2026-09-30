<script lang="ts">
	const app = {
		name: 'TANOD Desktop',
		version: '0.1.0',
		releaseChannel: 'Stable Production',
		license: 'MIT License (Open-Source Sovereign Privacy)',
		buildDate: '2026-10-01'
	};

	const developer = {
		name: 'Alfredo Sanchez Jr',
		email: 'derf@sanchez.ph',
		website: 'https://sanchez.ph',
		github: 'https://github.com/tildemark/tanod'
	};

	const techStack = [
		{ name: 'Tauri Framework', version: 'v2.12.0', role: 'Native OS Bridge, Memory Safety & Low Footprint' },
		{ name: 'Rust Core Engine', version: '1.80+', role: 'Cryptographic Hashing, SQLite WAL & File I/O' },
		{ name: 'SQLite (rusqlite)', version: '3.45 (v0.32 bundled)', role: 'Local Embedded Relational Engine with WAL' },
		{ name: 'SvelteKit (SPA Mode)', version: 'v2.16.0 (Svelte 5)', role: 'Reactive Zero-Latency Desktop UI Layer' },
		{ name: 'Tailwind CSS', version: 'v3.4.17', role: 'Design System & Typography Token Engine' },
		{ name: 'Compression Engine', version: 'zip v2.2 + sha2 0.10', role: 'Atomic Archiving & SHA-256 Manifest Verification' }
	];

	const statutoryStandards = [
		{ code: 'RA 10173', title: 'Data Privacy Act of 2012', desc: 'Core statutory framework for personal data governance in the Philippines' },
		{ code: 'NPC Circular 2022-04', title: 'Registration Framework (NPCRS)', desc: 'Mandatory DPO appointment, Head of Agency sign-off, annual renewals' },
		{ code: 'NPC Circular 16-03', title: 'Personal Data Breach Management', desc: '72-hour mandatory notification timer and Annual ASIR filing' },
		{ code: 'NPC Advisory 17-03', title: 'Privacy Impact Assessment', desc: 'Diagnostic thresholds, 5-stage data flow lifecycle, 4×4 risk matrix' }
	];

	const companionApps = [
		{
			name: 'SILIP',
			tagline: 'Philippine Data Privacy Law Search Engine',
			description: 'Searchable Interface for Legal Information & Privacy. Hybrid semantic keyword + vector search through RA 10173, IRR, and NPC Circulars with AI insights.',
			url: 'https://silip.sanchez.ph',
			github: 'https://github.com/tildemark/silip',
			badge: 'Semantic Jurisprudence',
			iconType: 'silip'
		},
		{
			name: 'DPA Mastery',
			tagline: 'Interactive Data Privacy Act Knowledge Suite',
			description: 'Comprehensive study, spaced-repetition testing, mock exams, and certification drills for Philippine DPOs and privacy compliance officers.',
			url: 'https://dpa.sanchez.ph',
			github: 'https://github.com/tildemark/dpa-mastery',
			badge: 'DPO Certification Drills',
			iconType: 'dpa'
		}
	];
</script>

<svelte:head>
	<title>About TANOD — System Architecture & Privacy Transparency</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8 pb-12">
	<!-- Top Header: Clean, Executive Typography -->
	<div class="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<span class="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
					v{app.version} • {app.releaseChannel}
				</span>
				<span class="text-xs text-slate-500 font-mono">Build {app.buildDate}</span>
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
				About TANOD
			</h1>
			<p class="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
				Autonomous, privacy-first desktop workspace engineered for Philippine Data Protection Officers (DPOs) and Compliance Officers for Privacy (COPs).
			</p>
		</div>

		<div class="shrink-0 flex items-center gap-2">
			<a
				href={developer.github}
				target="_blank"
				rel="noopener"
				class="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
			>
				<svg class="w-3.5 h-3.5 text-slate-700" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
				GitHub Repository
			</a>
		</div>
	</div>

	<!-- Section 1: Privacy Transparency & Zero-Telemetry Attestation -->
	<div class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
				<h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
					Privacy Transparency Attestation
				</h2>
			</div>
			<span class="text-[11px] text-emerald-800 font-mono font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
				Verified 100% Offline
			</span>
		</div>

		<p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
			Under Section 11 of the Data Privacy Act of 2012, transparency and proportionality are fundamental privacy principles. TANOD operates under an unconditional <strong>Zero-Cloud, Zero-Telemetry</strong> sovereign model:
		</p>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
			<div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
				<div class="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
					<span>✓ What is Collected</span>
				</div>
				<p class="text-[11px] text-slate-600 leading-relaxed">
					<strong class="text-slate-800">Zero data.</strong> No telemetry, analytics, keystroke monitors, behavioral diagnostics, or usage metrics are collected or transmitted.
				</p>
			</div>

			<div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
				<div class="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
					<span>✓ Where Data Resides</span>
				</div>
				<p class="text-[11px] text-slate-600 leading-relaxed">
					<strong class="text-slate-800">100% Local.</strong> ROPA, PIA risk matrices, breach logs, and documents stay strictly in your local <code class="text-slate-700 font-mono text-[10px]">%APPDATA%\tanod\</code> directory.
				</p>
			</div>

			<div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
				<div class="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
					<span>✓ Third-Party APIs</span>
				</div>
				<p class="text-[11px] text-slate-600 leading-relaxed">
					<strong class="text-slate-800">Zero Cloud APIs.</strong> No external cloud AI services, remote trackers, or SaaS relays are embedded into the runtime.
				</p>
			</div>
		</div>

		<div class="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100">
			<span>Local Database File: <code class="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">%APPDATA%\tanod\tanod.db</code></span>
			<a href="https://privacy.gov.ph/data-privacy-act/" target="_blank" rel="noopener" class="text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 font-medium">
				National Privacy Commission RA 10173 Guidelines
				<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
			</a>
		</div>
	</div>

	<!-- Section 2: Creator & Developer Information -->
	<div class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
				Lead Engineer & Developer
			</h2>
			<span class="text-xs text-slate-500 font-mono">Architect</span>
		</div>

		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-slate-50 border border-slate-200 rounded-xl p-4.5">
			<div class="space-y-0.5">
				<div class="text-base font-bold text-slate-900 tracking-tight">
					{developer.name}
				</div>
				<div class="text-xs text-slate-500">
					Solutions Architect & Full-Stack Systems Engineer • Philippine Data Privacy Engineering
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-2.5">
				<a
					href="mailto:{developer.email}"
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
				>
					<svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					{developer.email}
				</a>

				<a
					href={developer.website}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 text-xs font-semibold border border-emerald-300 transition-colors shadow-2xs"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
					sanchez.ph
				</a>
			</div>
		</div>
	</div>

	<!-- Section 3: Technical Architecture & Versions -->
	<div class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
				Technology Stack & Specifications
			</h2>
			<span class="text-xs text-slate-500 font-mono">Desktop Native Runtime</span>
		</div>

		<div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
			{#each techStack as tech}
				<div class="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
					<div class="flex items-center gap-3">
						<span class="font-bold text-slate-900 min-w-[140px]">{tech.name}</span>
						<span class="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 font-semibold">
							{tech.version}
						</span>
					</div>
					<div class="text-slate-500 text-[11px] sm:text-right">
						{tech.role}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Section 4: Ecosystem & Companion Applications -->
	<div class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
					Companion Privacy Engineering Ecosystem
				</h2>
				<p class="text-xs text-slate-500 mt-0.5">
					Complementary open-source tools engineered for Philippine Data Protection Officers and legal researchers.
				</p>
			</div>
			<span class="text-xs text-emerald-800 font-mono font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
				Ecosystem
			</span>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
			{#each companionApps as appItem}
				<div class="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-5 flex flex-col justify-between transition-all space-y-4 group">
					<div class="space-y-3">
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-center gap-3">
								{#if appItem.iconType === 'dpa'}
									<div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
										<img src="/images/dpa-mastery-logo.png" alt="DPA Mastery Icon" class="w-8 h-8 object-contain" />
									</div>
								{:else}
									<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-xs text-white font-black text-sm tracking-wider font-mono">
										SLP
									</div>
								{/if}
								<div>
									<div class="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
										{appItem.name}
									</div>
									<div class="text-[11px] text-slate-500 font-medium">
										{appItem.tagline}
									</div>
								</div>
							</div>

							<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold shrink-0">
								{appItem.badge}
							</span>
						</div>

						<p class="text-xs text-slate-600 leading-relaxed">
							{appItem.description}
						</p>
					</div>

					<div class="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
						<a
							href={appItem.github}
							target="_blank"
							rel="noopener"
							class="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors font-medium"
						>
							<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
							<span>Source Code</span>
						</a>

						<a
							href={appItem.url}
							target="_blank"
							rel="noopener"
							class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 text-xs font-semibold border border-emerald-300 transition-colors shadow-2xs"
						>
							<span>Launch App</span>
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
						</a>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Section 5: Philippine Regulatory Alignment Framework -->
	<div class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xs">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 font-mono">
				Regulatory Alignment Matrix
			</h2>
			<span class="text-xs text-slate-500 font-mono">Statutory Authority</span>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			{#each statutoryStandards as std}
				<div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
					<div class="flex items-center justify-between">
						<span class="font-mono font-bold text-xs text-amber-700">{std.code}</span>
						<span class="text-[10px] text-slate-500 font-mono">Republic of the Philippines</span>
					</div>
					<div class="text-xs font-semibold text-slate-900">{std.title}</div>
					<p class="text-[11px] text-slate-600 leading-relaxed pt-0.5">{std.desc}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Footer Notice -->
	<div class="text-center text-xs text-slate-500 space-y-1 pt-2">
		<p class="font-medium text-slate-700">{app.name} • Version {app.version} ({app.releaseChannel})</p>
		<p>Distributed under the {app.license}. Dedicated to Philippine privacy sovereignty and offline accountability.</p>
	</div>
</div>
