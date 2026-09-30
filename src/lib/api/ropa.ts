import { invoke } from '@tauri-apps/api/core';
import type { Process, ProcessFormData } from '$lib/types/ropa';

export async function listProcesses(orgId: string = ''): Promise<Process[]> {
  return await invoke<Process[]>('list_processes', { orgId });
}

export async function getProcessById(id: string): Promise<Process> {
  return await invoke<Process>('get_process_by_id', { id });
}

export async function createProcess(payload: ProcessFormData): Promise<Process> {
  return await invoke<Process>('create_process', { payload });
}

export async function updateProcess(id: string, payload: ProcessFormData): Promise<void> {
  return await invoke<void>('update_process', { id, payload });
}

export async function deleteProcess(id: string): Promise<void> {
  return await invoke<void>('delete_process', { id });
}
