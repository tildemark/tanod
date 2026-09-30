export interface BackupManifest {
  tanod_version: string;
  exported_at: string;
  org_id: string;
  org_name: string;
  files: Record<string, string>;
}

export interface BackupExportResult {
  archive_path: string;
  file_size_bytes: number;
  file_count: number;
  sha256_checksum: string;
}

export interface RestoreInspectionResult {
  is_valid: boolean;
  tanod_version: string;
  exported_at: string;
  org_name: string;
  file_count: number;
  error?: string | null;
}
