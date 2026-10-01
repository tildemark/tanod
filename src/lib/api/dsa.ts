import { invoke } from '@tauri-apps/api/core';
import type { DataSharingAgreement, CreateDsaPayload, UpdateDsaPayload } from '$lib/types/dsa';

export async function listDataSharingAgreements(orgId: string): Promise<DataSharingAgreement[]> {
  return await invoke<DataSharingAgreement[]>('list_data_sharing_agreements', { orgId });
}

export async function createDataSharingAgreement(payload: CreateDsaPayload): Promise<DataSharingAgreement> {
  return await invoke<DataSharingAgreement>('create_data_sharing_agreement', { payload });
}

export async function updateDataSharingAgreement(id: string, payload: UpdateDsaPayload): Promise<DataSharingAgreement> {
  return await invoke<DataSharingAgreement>('update_data_sharing_agreement', { id, payload });
}

export async function deleteDataSharingAgreement(id: string): Promise<void> {
  await invoke('delete_data_sharing_agreement', { id });
}
