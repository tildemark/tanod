import { safeInvoke } from './client';
import type { StatutoryDocument, UploadDocumentPayload } from '$lib/types/vault';

export async function listStatutoryDocuments(
  orgId: string,
  year?: number
): Promise<StatutoryDocument[]> {
  return await safeInvoke<StatutoryDocument[]>('list_statutory_documents', {
    orgId,
    year: year || null
  });
}

export async function uploadStatutoryDocument(
  payload: UploadDocumentPayload
): Promise<StatutoryDocument> {
  return await safeInvoke<StatutoryDocument>('upload_statutory_document', { payload });
}

export async function openStatutoryDocument(filePath: string): Promise<void> {
  return await safeInvoke<void>('open_statutory_document', { filePath });
}

export async function readStatutoryDocument(filePath: string): Promise<string> {
  return await safeInvoke<string>('read_statutory_document', { filePath });
}

export async function openVaultFolder(year?: number): Promise<void> {
  return await safeInvoke<void>('open_vault_folder', { year: year || null });
}

export async function deleteStatutoryDocument(id: string): Promise<void> {
  return await safeInvoke<void>('delete_statutory_document', { id });
}

export interface LoadedFileContent {
  file_name: string;
  file_size: number;
  mime_type: string;
  base64_content: string;
}

export async function readFileFromDisk(filePath: string): Promise<LoadedFileContent> {
  return await safeInvoke<LoadedFileContent>('read_file_from_disk', { filePath });
}
