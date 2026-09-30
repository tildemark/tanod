import { invoke } from '@tauri-apps/api/core';
import type { PiaAssessment, SavePiaPayload } from '$lib/types/pia';

export async function listPiaAssessments(orgId: string = ''): Promise<PiaAssessment[]> {
  return await invoke<PiaAssessment[]>('list_pia_assessments', { orgId });
}

export async function getPiaByProcessId(processId: string): Promise<PiaAssessment | null> {
  return await invoke<PiaAssessment | null>('get_pia_by_process_id', { processId });
}

export async function savePiaAssessment(payload: SavePiaPayload): Promise<PiaAssessment> {
  return await invoke<PiaAssessment>('save_pia_assessment', { payload });
}

export async function deletePiaAssessment(id: string): Promise<void> {
  return await invoke<void>('delete_pia_assessment', { id });
}
