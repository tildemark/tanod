import { invoke } from '@tauri-apps/api/core';
import type {
  Incident,
  CreateIncidentPayload,
  UpdateIncidentPayload,
  DsrRequest,
  CreateDsrPayload,
  DpoMemo,
  CreateMemoPayload
} from '$lib/types/enforcement';

// Incidents & 72-Hour Breach Monitor
export async function listIncidents(orgId: string = ''): Promise<Incident[]> {
  return await invoke<Incident[]>('list_incidents', { orgId });
}

export async function createIncident(payload: CreateIncidentPayload): Promise<Incident> {
  return await invoke<Incident>('create_incident', { payload });
}

export async function updateIncident(id: string, payload: UpdateIncidentPayload): Promise<void> {
  return await invoke<void>('update_incident', { id, payload });
}

export async function deleteIncident(id: string): Promise<void> {
  return await invoke<void>('delete_incident', { id });
}

// Data Subject Rights (DSR) & Kanban
export async function listDsrRequests(orgId: string = ''): Promise<DsrRequest[]> {
  return await invoke<DsrRequest[]>('list_dsr_requests', { orgId });
}

export async function createDsrRequest(payload: CreateDsrPayload): Promise<DsrRequest> {
  return await invoke<DsrRequest>('create_dsr_request', { payload });
}

export async function updateDsrStatus(id: string, status: string): Promise<void> {
  return await invoke<void>('update_dsr_status', { payload: { id, status } });
}

export async function resolveDsrRequest(payload: import('$lib/types/enforcement').ResolveDsrPayload): Promise<void> {
  return await invoke<void>('resolve_dsr_request', { payload });
}

export async function listDsrActionLogs(dsrId: string): Promise<import('$lib/types/enforcement').DsrActionLog[]> {
  return await invoke<import('$lib/types/enforcement').DsrActionLog[]>('list_dsr_action_logs', { dsrId });
}

export async function deleteDsrRequest(id: string): Promise<void> {
  return await invoke<void>('delete_dsr_request', { id });
}

// DPO Directives & Institutional Memos
export async function listDpoMemos(orgId: string = ''): Promise<DpoMemo[]> {
  return await invoke<DpoMemo[]>('list_dpo_memos', { orgId });
}

export async function createDpoMemo(payload: CreateMemoPayload): Promise<DpoMemo> {
  return await invoke<DpoMemo>('create_dpo_memo', { payload });
}

export async function deleteDpoMemo(id: string): Promise<void> {
  return await invoke<void>('delete_dpo_memo', { id });
}
