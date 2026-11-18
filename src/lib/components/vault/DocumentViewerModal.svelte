<script lang="ts">
  import { X, ExternalLink, Download, FileText, ZoomIn, ZoomOut, RotateCw } from 'lucide-svelte';
  import { openStatutoryDocument } from '$lib/api/vault';

  interface Props {
    isOpen: boolean;
    title: string;
    filePath: string;
    dataUri: string;
    onClose: () => void;
  }

  let { isOpen, title, filePath, dataUri, onClose }: Props = $props();

  let zoomLevel = $state(100);
  let isOpeningNative = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  async function handleOpenNative() {
    isOpeningNative = true;
    try {
      await openStatutoryDocument(filePath);
    } catch (e) {
      console.error('Failed to open document in system app', e);
    } finally {
      isOpeningNative = false;
    }
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = dataUri;
    const filename = filePath.split(/[/\\]/).pop() || 'document.pdf';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleBackdropClick}
    class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-150"
  >
    <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
      
      <!-- Viewer Header Toolbar -->
      <div class="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 select-none">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shrink-0">
            <FileText class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-100 truncate tracking-tight">{title || 'Statutory Compliance Record'}</h3>
            <p class="text-[10px] text-slate-400 font-mono truncate">{filePath}</p>
          </div>
        </div>

        <!-- Controls: Open in OS Default, Download, Close -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onclick={handleDownload}
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Save copy to local disk"
          >
            <Download class="h-3.5 w-3.5 text-slate-300" />
            <span class="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            disabled={isOpeningNative}
            onclick={handleOpenNative}
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Open in native desktop application (Acrobat, Word, etc.)"
          >
            <ExternalLink class="h-3.5 w-3.5 text-slate-300" />
            <span class="hidden sm:inline">Open in OS App</span>
          </button>

          <div class="h-4 w-px bg-slate-800 mx-1"></div>

          <button
            type="button"
            aria-label="Close document viewer"
            onclick={onClose}
            class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Embedded PDF Canvas / Object Frame -->
      <div class="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
        {#if dataUri}
          <object
            data={dataUri}
            type="application/pdf"
            class="w-full h-full border-0"
            aria-label="Statutory Document Preview"
          >
            <!-- Fallback for environments where embedded PDF object isn't directly rendered -->
            <div class="flex flex-col items-center justify-center p-8 text-center text-slate-300 max-w-md space-y-4">
              <div class="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                <FileText class="w-6 h-6" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-white mb-1">Embedded Viewer Preview</h4>
                <p class="text-xs text-slate-400 leading-relaxed">
                  The document has been securely loaded from the local vault. If your system cannot display inline PDF rendering inside the web container, you can launch it in your default system reader.
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={handleOpenNative}
                  class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ExternalLink class="w-3.5 h-3.5" />
                  Open in Desktop Reader
                </button>
              </div>
            </div>
          </object>
        {:else}
          <div class="flex flex-col items-center justify-center text-slate-400 space-y-2">
            <div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            <p class="text-xs font-mono">Decrypting and loading document from statutory vault...</p>
          </div>
        {/if}
      </div>

      <!-- Viewer Footer Bar -->
      <div class="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 select-none">
        <span class="text-[11px] font-mono flex items-center gap-2 text-emerald-400">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          Statutory Vault Isolated • 100% Offline
        </span>
        <span class="text-[10px] text-slate-400 font-mono">Press ESC or Close to return</span>
      </div>

    </div>
  </div>
{/if}
