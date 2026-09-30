<script lang="ts">
  import { X } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  const app = {
    name: 'TANOD Desktop',
    version: '1.0.0',
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

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleBackdropClick}
    class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
  >
    <div class="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg overflow-hidden bg-slate-950 border border-amber-500/40 flex items-center justify-center p-0.5 shadow-2xs">
            <img src="/images/tanod-logo.jpg" alt="TANOD Shield" class="h-full w-full object-cover rounded-sm" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-slate-900 tracking-tight">About TANOD Desktop</h2>
              <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                v{app.version}
              </span>
            </div>
            <p class="text-[11px] text-slate-500">Autonomous Sovereign Desktop Workspace for Philippine DPOs</p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close dialog"
          onclick={onClose}
          class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="overflow-y-auto p-6 space-y-6 flex-1 text-slate-900">
        
        <!-- Privacy Transparency Attestation -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Zero-Telemetry Privacy Attestation
              </h3>
            </div>
            <span class="text-[10px] text-emerald-800 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              100% Offline
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div class="bg-white border border-slate-200/90 rounded-lg p-3 space-y-1">
              <div class="font-semibold text-emerald-700 text-[11px]">✓ Zero Cloud Data</div>
              <p class="text-[11px] text-slate-600 leading-snug">No analytics, telemetry, or remote trackers are embedded.</p>
            </div>
            <div class="bg-white border border-slate-200/90 rounded-lg p-3 space-y-1">
              <div class="font-semibold text-emerald-700 text-[11px]">✓ 100% Local Storage</div>
              <p class="text-[11px] text-slate-600 leading-snug">All ROPA, PIA, and vault documents stay in <code class="font-mono text-[10px]">%APPDATA%\tanod\</code>.</p>
            </div>
            <div class="bg-white border border-slate-200/90 rounded-lg p-3 space-y-1">
              <div class="font-semibold text-emerald-700 text-[11px]">✓ Zero External APIs</div>
              <p class="text-[11px] text-slate-600 leading-snug">No cloud AI, remote logins, or third-party servers required.</p>
            </div>
          </div>
        </div>

        <!-- Lead Architect & Developer -->
        <div class="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shadow-2xs">
          <div>
            <div class="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Lead Systems Architect & Developer</div>
            <div class="text-sm font-bold text-slate-900 mt-0.5">{developer.name}</div>
            <div class="text-xs text-slate-500">Philippine Data Privacy Engineering & Sovereign Systems</div>
          </div>

          <div class="flex items-center gap-2">
            <a
              href="mailto:{developer.email}"
              class="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              {developer.email}
            </a>
            <a
              href={developer.website}
              target="_blank"
              rel="noopener"
              class="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors"
            >
              sanchez.ph
            </a>
            <a
              href={developer.github}
              target="_blank"
              rel="noopener"
              class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <!-- Tech Stack -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            Desktop Runtime Specifications
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {#each techStack as tech}
              <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <span class="font-bold text-slate-900">{tech.name}</span>
                  <div class="text-[10px] text-slate-500">{tech.role}</div>
                </div>
                <span class="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-emerald-800 font-semibold">
                  {tech.version}
                </span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Companion Ecosystem Applications -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Companion Privacy Ecosystem
            </h3>
            <span class="text-[10px] text-slate-400 font-mono">Philippine DPO Tools</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each companionApps as c}
              <div class="border border-slate-200 rounded-xl p-3.5 bg-slate-50 flex flex-col justify-between gap-3">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-slate-900">{c.name}</span>
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold">
                      {c.badge}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-600 leading-snug">{c.description}</p>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <a href={c.github} target="_blank" rel="noopener" class="text-[11px] text-slate-500 hover:text-slate-800 font-medium">
                    Source Code
                  </a>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener"
                    class="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-emerald-800 text-[11px] font-semibold"
                  >
                    Launch Web App →
                  </a>
                </div>
              </div>
            {/each}
          </div>
        </div>


      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 text-xs">
        <span class="text-[11px] text-slate-500 font-mono">Distributed under MIT License • 100% Offline Sovereign</span>
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
