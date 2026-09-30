import { invoke } from '@tauri-apps/api/core';
import type { StatutoryDocument, UploadDocumentPayload } from '$lib/types/vault';

export async function listStatutoryDocuments(
  orgId: string,
  year?: number
): Promise<StatutoryDocument[]> {
  return await invoke<StatutoryDocument[]>('list_statutory_documents', {
    orgId,
    year: year || null
  });
}

export async function uploadStatutoryDocument(
  payload: UploadDocumentPayload
): Promise<StatutoryDocument> {
  return await invoke<StatutoryDocument>('upload_statutory_document', { payload });
}

export async function openStatutoryDocument(filePath: string): Promise<void> {
  return await invoke<void>('open_statutory_document', { filePath });
}

export async function openVaultFolder(year?: number): Promise<void> {
  return await invoke<void>('open_vault_folder', { year: year || null });
}

export async function deleteStatutoryDocument(id: string): Promise<void> {
  return await invoke<void>('delete_statutory_document', { id });
}
