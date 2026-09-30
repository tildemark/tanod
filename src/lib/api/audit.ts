import { invoke } from '@tauri-apps/api/core';

export interface SystemAuditLog {
  id: string;
  org_id: string;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  details: string;
  prev_hash: string;
  entry_hash: string;
}

export async function listSystemAuditLogs(orgId: string = '', limit: number = 100): Promise<SystemAuditLog[]> {
  return await invoke<SystemAuditLog[]>('list_system_audit_logs', { orgId, limit });
}

export async function verifyAuditTrailIntegrity(): Promise<boolean> {
  return await invoke<boolean>('verify_audit_trail_integrity');
}
