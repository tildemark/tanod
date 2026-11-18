import { safeInvoke } from './client';
import type { BackupExportResult, RestoreInspectionResult } from '$lib/types/backup';

export async function exportBackupArchive(
  destinationPath?: string
): Promise<BackupExportResult> {
  return await safeInvoke<BackupExportResult>('export_backup_archive', {
    destinationPath: destinationPath || null
  });
}

export async function inspectBackupArchive(
  archivePath: string
): Promise<RestoreInspectionResult> {
  return await safeInvoke<RestoreInspectionResult>('inspect_backup_archive', { archivePath });
}

export async function restoreBackupArchive(archivePath: string): Promise<string> {
  return await safeInvoke<string>('restore_backup_archive', { archivePath });
}
