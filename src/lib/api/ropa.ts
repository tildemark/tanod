import { safeInvoke } from './client';
import type { Process, ProcessFormData } from '$lib/types/ropa';

export async function listProcesses(orgId: string = ''): Promise<Process[]> {
  return await safeInvoke<Process[]>('list_processes', { orgId });
}

export async function getProcessById(id: string): Promise<Process> {
  return await safeInvoke<Process>('get_process_by_id', { id });
}

export async function createProcess(payload: ProcessFormData): Promise<Process> {
  return await safeInvoke<Process>('create_process', { payload });
}

export async function updateProcess(id: string, payload: ProcessFormData): Promise<void> {
  return await safeInvoke<void>('update_process', { id, payload });
}

export async function deleteProcess(id: string): Promise<void> {
  return await safeInvoke<void>('delete_process', { id });
}
