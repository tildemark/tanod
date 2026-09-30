import { invoke } from '@tauri-apps/api/core';
import type { BackupExportResult, RestoreInspectionResult } from '$lib/types/backup';

export async function exportBackupArchive(
  destinationPath?: string
): Promise<BackupExportResult> {
  return await invoke<BackupExportResult>('export_backup_archive', {
    destinationPath: destinationPath || null
  });
}

export async function inspectBackupArchive(
  archivePath: string
): Promise<RestoreInspectionResult> {
  return await invoke<RestoreInspectionResult>('inspect_backup_archive', { archivePath });
}

export async function restoreBackupArchive(archivePath: string): Promise<string> {
  return await invoke<string>('restore_backup_archive', { archivePath });
}
