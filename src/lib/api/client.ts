import { invoke as tauriInvoke, isTauri } from '@tauri-apps/api/core';

/**
 * Returns true if running inside the Tauri native desktop container.
 */
export function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;
  return isTauri() || Boolean((window as any).__TAURI_INTERNALS__);
}

// In-memory mock store for preview mode so changes persist during browser testing
let browserPreviewOrg: any = {
  id: 'org-local-browser-preview',
  name: 'Republic Health System',
  slug: 'republic-health',
  entity_type: 'PIC',
  industry: 'Healthcare & Medical Services',
  city: 'Metro Manila',
  dpo_name: 'Atty. Maria Santos, CIPP/E',
  dpo_email: 'dpo@republichealth.ph',
  npc_registration_number: 'NPC-PIC-2024-00912',
  renewal_deadline: '2027-06-30',
  asir_due_date: '2027-03-31',
  seal_status: 'REGISTERED'
};

let browserPreviewOfficers: any[] = [
  {
    id: 'officer-1',
    org_id: 'org-local-browser-preview',
    name: 'Atty. Maria Santos, CIPP/E',
    title: 'Data Protection Officer',
    email: 'dpo@republichealth.ph',
    phone: '+63 2 8123 4567',
    role: 'DPO',
    is_primary_dpo: true,
    assigned_branch_dept: 'Executive Legal & Compliance Office'
  }
];

/**
 * Safe invoke wrapper that avoids throwing uncaught runtime exceptions
 * when accessed directly in a regular web browser (e.g. during web preview or tests).
 */
export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriApp()) {
    console.warn(`[TANOD Local Bridge] invoke("${cmd}") called outside of Tauri desktop shell. Returning fallback.`);
    
    // Org & Officers simulated persistence for browser dev preview
    if (cmd === 'get_organization') {
      return { ...browserPreviewOrg } as unknown as T;
    }
    if (cmd === 'update_organization') {
      const payload = (args?.payload || {}) as any;
      browserPreviewOrg = { ...browserPreviewOrg, ...payload };
      return { ...browserPreviewOrg } as unknown as T;
    }
    if (cmd === 'list_privacy_officers') {
      return [...browserPreviewOfficers] as unknown as T;
    }
    if (cmd === 'create_privacy_officer') {
      const payload = (args?.payload || {}) as any;
      if (payload.is_primary_dpo) {
        browserPreviewOfficers = browserPreviewOfficers.map(o => ({ ...o, is_primary_dpo: false }));
        browserPreviewOrg.dpo_name = payload.name;
        browserPreviewOrg.dpo_email = payload.email;
      }
      const newOfficer = { id: `officer-${Date.now()}`, ...payload };
      browserPreviewOfficers.push(newOfficer);
      return newOfficer as unknown as T;
    }
    if (cmd === 'update_privacy_officer') {
      const id = args?.id as string;
      const payload = (args?.payload || {}) as any;
      if (payload.is_primary_dpo) {
        browserPreviewOfficers = browserPreviewOfficers.map(o => ({ ...o, is_primary_dpo: false }));
        browserPreviewOrg.dpo_name = payload.name;
        browserPreviewOrg.dpo_email = payload.email;
      }
      browserPreviewOfficers = browserPreviewOfficers.map(o => o.id === id ? { ...o, ...payload } : o);
      return undefined as unknown as T;
    }
    if (cmd === 'delete_privacy_officer') {
      const id = args?.id as string;
      browserPreviewOfficers = browserPreviewOfficers.filter(o => o.id !== id);
      return undefined as unknown as T;
    }

    if (cmd === 'read_statutory_document') {
      // In browser preview mode, generate a lightweight valid sample PDF data URI
      return 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1RpdGxlIChUQU5PRCBEb2N1bWVudCBQcmV2aWV3KQovQXV0aG9yIChUQU5PRCBEUFAgV29ya3NwYWNlKQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNSAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNiAwIFIKPj4KPj4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCAxMzgKPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgNzAwIFRECihoZXJlIGlzIHlvdXIgYXVkaXQtcmVhZHkgcHJpdmFjeSBkb2N1bWVudCkgVGoKL0YxIDEyIFRmCjAgLTMwIFRECihoYXZlIGZ1bGwgc292ZXJlaWdudHkgb3ZlciBhbGwgcGVyc29uYWwgZGF0YSByZWNvcmRzLikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwOTYgMDAwMDAgbiAConverterCjAwMDAwMDAxNDQgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAowMDAwMDAwMzM1IDAwMDAwIG4gCjAwMDAwMDA1MjYgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDIgMCBSCi9JbmZvIDEgMCBSCj4+CnN0YXJ0eHJlZgo2MDUKJSVFT0YK' as unknown as T;
    }

    if (cmd.startsWith('list_') || cmd.includes('get_processes')) {
      return [] as unknown as T;
    }
    if (cmd === 'verify_audit_trail_integrity') {
      return true as unknown as T;
    }
    if (cmd === 'inspect_backup_archive') {
      return {
        manifest: {
          app_version: '1.1.0',
          created_at: new Date().toISOString(),
          db_sha256: 'mock-sha256',
          vault_file_count: 0
        },
        has_database: true,
        vault_files: []
      } as unknown as T;
    }
    if (cmd === 'export_backup_archive') {
      return {
        archive_path: 'mock/backup.tanod',
        manifest: {
          app_version: '1.1.0',
          created_at: new Date().toISOString(),
          db_sha256: 'mock-sha256',
          vault_file_count: 0
        }
      } as unknown as T;
    }
    if (cmd.startsWith('get_')) {
      return null as unknown as T;
    }
    return {} as unknown as T;
  }

  return await tauriInvoke<T>(cmd, args);
}

export { isTauri };
