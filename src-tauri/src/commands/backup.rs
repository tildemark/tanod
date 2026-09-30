use crate::db::DbState;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::State;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupManifest {
    pub tanod_version: String,
    pub exported_at: String,
    pub org_id: String,
    pub org_name: String,
    pub files: HashMap<String, String>, // relative_path -> sha256_hex
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupExportResult {
    pub archive_path: String,
    pub file_size_bytes: u64,
    pub file_count: usize,
    pub sha256_checksum: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreInspectionResult {
    pub is_valid: bool,
    pub tanod_version: String,
    pub exported_at: String,
    pub org_name: String,
    pub file_count: usize,
    pub error: Option<String>,
}

fn get_app_data_dir() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from("ph", "sanchez", "tanod") {
        proj_dirs.data_local_dir().to_path_buf()
    } else {
        PathBuf::from(".")
    }
}

fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

/// Checkpoints SQLite WAL mode and creates a compressed .tanod disaster recovery package.
#[tauri::command]
pub fn export_backup_archive(
    destination_path: Option<String>,
    state: State<'_, DbState>,
) -> Result<BackupExportResult, String> {
    let data_dir = get_app_data_dir();
    let db_path = data_dir.join("tanod.db");

    // 1. Force WAL checkpoint to flush all in-flight transactions into the primary database file
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("WAL checkpoint failed: {}", e))?;
    }

    // 2. Determine export file path
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let target_archive_path = if let Some(p) = destination_path {
        PathBuf::from(p)
    } else {
        // Default to Windows user Downloads or desktop
        if let Some(proj_dirs) = ProjectDirs::from("ph", "sanchez", "tanod") {
            let backup_dir = proj_dirs.data_local_dir().join("backups");
            fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
            backup_dir.join(format!("TANOD_Backup_{}.tanod", timestamp))
        } else {
            PathBuf::from(format!("TANOD_Backup_{}.tanod", timestamp))
        }
    };

    let zip_file = File::create(&target_archive_path)
        .map_err(|e| format!("Failed to create archive file: {}", e))?;
    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut manifest_files = HashMap::new();
    let mut file_count = 0;

    // 3. Add tanod.db
    if db_path.exists() {
        let db_bytes = fs::read(&db_path)
            .map_err(|e| format!("Failed to read database: {}", e))?;
        let hash = compute_sha256(&db_bytes);
        manifest_files.insert("tanod.db".to_string(), hash);

        zip.start_file("tanod.db", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(&db_bytes)
            .map_err(|e| e.to_string())?;
        file_count += 1;
    } else {
        return Err("Database file not found".to_string());
    }

    // 4. Add Vault directory files (%APPDATA%\tanod\vault\**\*)
    let vault_dir = data_dir.join("vault");
    if vault_dir.exists() {
        add_directory_to_zip(&vault_dir, &data_dir, &mut zip, options, &mut manifest_files, &mut file_count)?;
    }

    // 5. Add Assets directory files (%APPDATA%\tanod\assets\**\*)
    let assets_dir = data_dir.join("assets");
    if assets_dir.exists() {
        add_directory_to_zip(&assets_dir, &data_dir, &mut zip, options, &mut manifest_files, &mut file_count)?;
    }

    // 6. Query organization details for manifest
    let (org_id, org_name) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, name FROM organizations LIMIT 1",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .unwrap_or(("unknown".to_string(), "TANOD Organization".to_string()))
    };

    // 7. Write manifest.json
    let manifest = BackupManifest {
        tanod_version: "0.1.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        org_id,
        org_name,
        files: manifest_files,
    };
    let manifest_bytes = serde_json::to_vec_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

    zip.start_file("manifest.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(&manifest_bytes)
        .map_err(|e| e.to_string())?;
    file_count += 1;

    let finished_file = zip.finish().map_err(|e| format!("Failed to finalize archive: {}", e))?;
    let metadata = finished_file.metadata().map_err(|e| e.to_string())?;
    let file_size = metadata.len();

    // Compute checksum of the entire package
    let archive_bytes = fs::read(&target_archive_path).map_err(|e| e.to_string())?;
    let pkg_hash = compute_sha256(&archive_bytes);

    Ok(BackupExportResult {
        archive_path: target_archive_path.to_string_lossy().to_string(),
        file_size_bytes: file_size,
        file_count,
        sha256_checksum: pkg_hash,
    })
}

fn add_directory_to_zip(
    dir: &Path,
    base_dir: &Path,
    zip: &mut ZipWriter<File>,
    options: SimpleFileOptions,
    manifest_files: &mut HashMap<String, String>,
    file_count: &mut usize,
) -> Result<(), String> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                add_directory_to_zip(&path, base_dir, zip, options, manifest_files, file_count)?;
            } else if path.is_file() {
                if let Ok(rel_path) = path.strip_prefix(base_dir) {
                    let rel_path_str = rel_path.to_string_lossy().replace('\\', "/");
                    if let Ok(bytes) = fs::read(&path) {
                        let hash = compute_sha256(&bytes);
                        manifest_files.insert(rel_path_str.clone(), hash);

                        if zip.start_file(&rel_path_str, options).is_ok()
                            && zip.write_all(&bytes).is_ok()
                        {
                            *file_count += 1;
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

/// Inspects a .tanod archive before restoration, verifying manifest integrity.
#[tauri::command]
pub fn inspect_backup_archive(archive_path: String) -> Result<RestoreInspectionResult, String> {
    let file = File::open(&archive_path)
        .map_err(|e| format!("Failed to open backup file: {}", e))?;
    let mut zip = ZipArchive::new(file)
        .map_err(|e| format!("Not a valid ZIP/TANOD archive: {}", e))?;

    let mut manifest_file = zip
        .by_name("manifest.json")
        .map_err(|_| "Invalid TANOD package: Missing manifest.json descriptor".to_string())?;

    let mut manifest_str = String::new();
    manifest_file
        .read_to_string(&mut manifest_str)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest: BackupManifest = serde_json::from_str(&manifest_str)
        .map_err(|e| format!("Invalid manifest format: {}", e))?;

    Ok(RestoreInspectionResult {
        is_valid: true,
        tanod_version: manifest.tanod_version,
        exported_at: manifest.exported_at,
        org_name: manifest.org_name,
        file_count: manifest.files.len(),
        error: None,
    })
}

/// Restores a clean PC workstation from a .tanod archive package.
#[tauri::command]
pub fn restore_backup_archive(
    archive_path: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let inspection = inspect_backup_archive(archive_path.clone())?;
    if !inspection.is_valid {
        return Err("Archive validation failed".to_string());
    }

    let data_dir = get_app_data_dir();
    let file = File::open(&archive_path)
        .map_err(|e| format!("Failed to open backup file: {}", e))?;
    let mut zip = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read TANOD archive: {}", e))?;

    // Read and verify manifest
    let manifest: BackupManifest = {
        let mut mf = zip
            .by_name("manifest.json")
            .map_err(|_| "Missing manifest.json".to_string())?;
        let mut s = String::new();
        mf.read_to_string(&mut s)
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&s)
            .map_err(|e| e.to_string())?
    };

    // Release database lock during file replacement
    let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
    let _ = conn_guard.execute_batch("PRAGMA optimize;");

    // Extract files verifying hashes
    for (rel_path, expected_hash) in &manifest.files {
        if let Ok(mut zf) = zip.by_name(rel_path) {
            let mut file_bytes = Vec::new();
            zf.read_to_end(&mut file_bytes)
                .map_err(|e| format!("Error extracting {}: {}", rel_path, e))?;

            let computed_hash = compute_sha256(&file_bytes);
            if &computed_hash != expected_hash {
                return Err(format!(
                    "Integrity check failed for {}: Hash mismatch! File may be corrupted or tampered.",
                    rel_path
                ));
            }

            let dest_path = data_dir.join(rel_path);
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&dest_path, file_bytes)
                .map_err(|e| format!("Failed to write {}: {}", rel_path, e))?;
        }
    }

    // Reopen database connection to point to restored database
    let db_path = crate::db::get_db_path();
    let new_conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to reopen database after restore: {}", e))?;
    new_conn
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
        .map_err(|e| e.to_string())?;

    *conn_guard = new_conn;

    Ok(format!(
        "Successfully restored compliance workspace for '{}' with {} files.",
        inspection.org_name, inspection.file_count
    ))
}
