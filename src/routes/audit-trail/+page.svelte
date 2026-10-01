<script lang="ts">
  import { onMount } from 'svelte';
  import { getOrganization } from '$lib/api/admin';
  import { listSystemAuditLogs, verifyAuditTrailIntegrity, type SystemAuditLog } from '$lib/api/audit';
  import { ShieldCheck, History, RefreshCw, Lock, AlertTriangle, CheckCircle2 } from 'lucide-svelte';

  let auditLogs = $state<SystemAuditLog[]>([]);
  let isIntegrityValid = $state<boolean | null>(null);
  let isLoading = $state(true);
  let isReverifying = $state(false);
  let orgId = $state('');

  // Filter / search
  let searchQuery = $state('');
  let selectedEntity = $state('ALL');

  let entityTypes = $derived(
    [...new Set(auditLogs.map(l => l.entity_type))].sort()
  );

  let filteredLogs = $derived(
    auditLogs.filter(log => {
      const matchEntity = selectedEntity === 'ALL' || log.entity_type === selectedEntity;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        log.summary.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q);
      return matchEntity && matchSearch;
    })
  );

  async function loadData() {
    try {
      isLoading = true;
      const org = await getOrganization();
      orgId = org.id;
      const [logs, valid] = await Promise.all([
        listSystemAuditLogs(org.id, 200),
        verifyAuditTrailIntegrity()
      ]);
      auditLogs = logs;
      isIntegrityValid = valid;
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      isLoading = false;
    }
  }

  async function reverify() {
    isReverifying = true;
    try {
      const [logs, valid] = await Promise.all([
        listSystemAuditLogs(orgId, 200),
        verifyAuditTrailIntegrity()
      ]);
      auditLogs = logs;
      isIntegrityValid = valid;
    } finally {
      isReverifying = false;
    }
  }

  onMount(loadData);
</script>

<svelte:head>
  <title>Immutable Audit Trail — TANOD</title>
</svelte:head>

<div class="space-y-6">

  <!-- Page Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
          RA 10173 Sec. 20 · SHA-256 Hash Chain
        </span>
      </div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
        <History class="h-6 w-6 text-slate-700" />
        Immutable Audit Trail
      </h1>
      <p class="text-xs text-slate-500 mt-1 max-w-2xl">
        Append-only cryptographic log of all compliance actions across ROPA, PIA, Incidents, DSR, Vault, and DSA modules.
        Each entry is SHA-256 hash-chained to the previous record — tampering or silent deletion is detectable.
      </p>
    </div>

    <button
      type="button"
      onclick={reverify}
      disabled={isReverifying}
      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer shrink-0"
    >
      <RefreshCw class="h-3.5 w-3.5 {isReverifying ? 'animate-spin' : ''}" />
      <span>{isReverifying ? 'Re-verifying...' : 'Re-verify Integrity'}</span>
    </button>
  </div>

  {#if isLoading}
    <div class="p-16 text-center text-slate-500">
      <div class="animate-spin w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full mx-auto mb-3"></div>
      Loading tamper-evident audit records...
    </div>

  {:else}
    <!-- Integrity Status Banner -->
    <div class="p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs {
      isIntegrityValid === null
        ? 'bg-slate-50 border-slate-200'
        : isIntegrityValid
          ? 'bg-emerald-50/80 border-emerald-300'
          : 'bg-rose-50/80 border-rose-300'
    }">
      <div class="flex items-start sm:items-center gap-3.5">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 {
          isIntegrityValid === null
            ? 'bg-slate-400 text-white'
            : isIntegrityValid
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
        }">
          {#if isIntegrityValid}
            <ShieldCheck class="w-5 h-5" />
          {:else if isIntegrityValid === false}
            <AlertTriangle class="w-5 h-5" />
          {:else}
            <Lock class="w-5 h-5" />
          {/if}
        </div>
        <div>
          <h3 class="text-sm font-bold font-mono {
            isIntegrityValid ? 'text-emerald-950' : isIntegrityValid === false ? 'text-rose-950' : 'text-slate-800'
          }">
            {#if isIntegrityValid}
              ✓ Cryptographic Hash-Chain Intact & Verified
            {:else if isIntegrityValid === false}
              ⚠ Cryptographic Integrity Warning — Hash Mismatch Detected
            {:else}
              Integrity status unknown
            {/if}
          </h3>
          <p class="text-xs mt-0.5 {
            isIntegrityValid ? 'text-emerald-800' : isIntegrityValid === false ? 'text-rose-800' : 'text-slate-500'
          }">
            {#if isIntegrityValid}
              All {auditLogs.length} compliance events are cryptographically chained with SHA-256 hashes, satisfying RA 10173 Sec. 20 organizational accountability requirements.
            {:else if isIntegrityValid === false}
              A SHA-256 hash mismatch was detected in the audit log sequence. This may indicate tampering, manual database modification, or a restore from an unsigned backup. Escalate immediately to the Head of Organization.
            {:else}
              Click "Re-verify Integrity" to perform a full hash-chain verification of all audit records.
            {/if}
          </p>
        </div>
      </div>

      <!-- Stats chips -->
      <div class="flex items-center gap-2 flex-wrap shrink-0">
        <div class="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <p class="text-lg font-black font-mono text-slate-900">{auditLogs.length}</p>
          <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Events</p>
        </div>
        <div class="text-center px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <p class="text-lg font-black font-mono text-slate-900">{entityTypes.length}</p>
          <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Modules</p>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search events, actions, modules..."
          class="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div class="flex items-center gap-2 text-xs">
        <span class="font-semibold text-slate-500">Module:</span>
        <select
          bind:value={selectedEntity}
          class="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="ALL">All Modules ({auditLogs.length})</option>
          {#each entityTypes as et}
            <option value={et}>{et} ({auditLogs.filter(l => l.entity_type === et).length})</option>
          {/each}
        </select>
      </div>

      {#if filteredLogs.length !== auditLogs.length}
        <span class="text-xs text-slate-500 font-mono">Showing {filteredLogs.length} of {auditLogs.length}</span>
      {/if}
    </div>

    <!-- Audit Log Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
          <Lock class="h-3.5 w-3.5 text-slate-500" />
          Sequential Immutable Log Registry
        </span>
        <span class="text-[11px] font-mono text-slate-500">Append-Only SQLite WAL · SHA-256 Chained</span>
      </div>

      {#if filteredLogs.length === 0}
        <div class="p-12 text-center text-slate-400 space-y-2">
          <History class="h-8 w-8 mx-auto text-slate-300" />
          <p class="text-xs font-medium text-slate-500">
            {auditLogs.length === 0
              ? 'No audit events recorded yet. All compliance actions across ROPA, PIA, DSR, Incidents, Vault, and DSA will appear here automatically.'
              : 'No events match your current filter.'}
          </p>
        </div>
      {:else}
        <div class="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {#each filteredLogs as log (log.id)}
            <div class="px-5 py-3.5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <!-- Action badge -->
                  <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                    {log.action}
                  </span>
                  <!-- Module badge -->
                  <span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {log.entity_type}
                  </span>
                  <!-- Timestamp -->
                  <span class="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                <p class="text-xs font-semibold text-slate-900 truncate">{log.summary}</p>

                {#if log.details && log.details !== '{}'}
                  <p class="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">
                    {log.details}
                  </p>
                {/if}
              </div>

              <!-- Hash chain display -->
              <div class="shrink-0 text-right space-y-0.5 font-mono text-[10px] text-slate-400 min-w-[140px]">
                <div class="flex items-center justify-end gap-1">
                  <CheckCircle2 class="h-3 w-3 text-emerald-500" />
                  <span class="text-slate-600 font-bold">{log.entry_hash.slice(0, 16)}…</span>
                </div>
                <div>prev: <span class="text-slate-500">{log.prev_hash.slice(0, 12)}…</span></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Regulatory Footnote -->
    <div class="text-[11px] text-slate-400 font-mono px-1 flex items-center gap-2">
      <Lock class="h-3 w-3 text-slate-300" />
      <span>
        This log is stored in an append-only SQLite table (<code>system_audit_logs</code>) using WAL mode.
        Records are SHA-256 hash-chained — any gap, insertion, or deletion will fail integrity verification.
        Complies with RA 10173 Sec. 20 accountability obligations.
      </span>
    </div>

  {/if}
</div>
