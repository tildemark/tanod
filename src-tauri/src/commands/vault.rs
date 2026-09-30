use crate::db::DbState;
use directories::ProjectDirs;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct StatutoryDocument {
    pub id: String,
    pub org_id: String,
    pub year: i32,
    pub category: String,
    pub title: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size_bytes: i64,
    pub mime_type: Option<String>,
    pub notes: Option<String>,
    pub uploaded_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UploadDocumentPayload {
    pub org_id: String,
    pub year: i32,
    pub category: String,
    pub title: String,
    pub file_name: String,
    pub base64_content: String,
    pub mime_type: Option<String>,
    pub notes: Option<String>,
}

/// Returns the root statutory vault folder on Windows (%APPDATA%\tanod\vault\).
pub fn get_vault_root() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from("ph", "sanchez", "tanod") {
        let vault_dir = proj_dirs.data_local_dir().join("vault");
        fs::create_dir_all(&vault_dir).expect("Failed to create vault folder");
        vault_dir
    } else {
        let vault_dir = PathBuf::from("vault");
        fs::create_dir_all(&vault_dir).expect("Failed to create local vault folder");
        vault_dir
    }
}

/// Returns the folder for a given year (%APPDATA%\tanod\vault\{year}\).
pub fn get_vault_year_folder(year: i32) -> PathBuf {
    let year_dir = get_vault_root().join(year.to_string());
    fs::create_dir_all(&year_dir).expect("Failed to create yearly vault folder");
    year_dir
}

/// Lists all statutory documents for an organization, optionally filtered by year.
#[tauri::command]
pub fn list_statutory_documents(
    org_id: String,
    year: Option<i32>,
    state: State<'_, DbState>,
) -> Result<Vec<StatutoryDocument>, String> {
    let conn = state.conn.lock().unwrap();

    let query = if let Some(y) = year {
        format!(
            "SELECT id, org_id, year, category, title, file_name, file_path, file_size_bytes, mime_type, notes, uploaded_at 
             FROM statutory_documents 
             WHERE org_id = ?1 AND year = {} 
             ORDER BY uploaded_at DESC",
            y
        )
    } else {
        "SELECT id, org_id, year, category, title, file_name, file_path, file_size_bytes, mime_type, notes, uploaded_at 
         FROM statutory_documents 
         WHERE org_id = ?1 
         ORDER BY year DESC, uploaded_at DESC".to_string()
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(StatutoryDocument {
                id: row.get(0)?,
                org_id: row.get(1)?,
                year: row.get(2)?,
                category: row.get(3)?,
                title: row.get(4)?,
                file_name: row.get(5)?,
                file_path: row.get(6)?,
                file_size_bytes: row.get(7)?,
                mime_type: row.get(8)?,
                notes: row.get(9)?,
                uploaded_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut documents = Vec::new();
    for doc in rows {
        documents.push(doc.map_err(|e| e.to_string())?);
    }

    Ok(documents)
}

/// Uploads and saves a document into %APPDATA%\tanod\vault\{year}\{uuid}_{safe_filename}.
#[tauri::command]
pub fn upload_statutory_document(
    payload: UploadDocumentPayload,
    state: State<'_, DbState>,
) -> Result<StatutoryDocument, String> {
    let doc_id = Uuid::new_v4().to_string();
    let year_dir = get_vault_year_folder(payload.year);

    // Sanitize filename and construct destination
    let safe_filename = payload.file_name.replace(['\\', '/', ':', '*', '?', '"', '<', '>', '|'], "_");
    let stored_file_name = format!("{}_{}", &doc_id[..8], safe_filename);
    let target_path = year_dir.join(&stored_file_name);

    // Decode base64 bytes
    use base64::Engine;
    let decoded_bytes = base64::engine::general_purpose::STANDARD
        .decode(&payload.base64_content)
        .map_err(|e| format!("Base64 decoding failed: {}", e))?;

    let file_size_bytes = decoded_bytes.len() as i64;

    // Write file to vault
    fs::write(&target_path, decoded_bytes)
        .map_err(|e| format!("Failed to save file to vault: {}", e))?;

    let file_path_str = target_path.to_string_lossy().to_string();

    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO statutory_documents (
            id, org_id, year, category, title, file_name, file_path, file_size_bytes, mime_type, notes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            doc_id,
            payload.org_id,
            payload.year,
            payload.category,
            payload.title,
            payload.file_name,
            file_path_str,
            file_size_bytes,
            payload.mime_type,
            payload.notes
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(StatutoryDocument {
        id: doc_id,
        org_id: payload.org_id,
        year: payload.year,
        category: payload.category,
        title: payload.title,
        file_name: payload.file_name,
        file_path: file_path_str,
        file_size_bytes,
        mime_type: payload.mime_type,
        notes: payload.notes,
        uploaded_at: Some(chrono::Utc::now().to_rfc3339()),
    })
}

/// Opens a document in its default Windows desktop application (Adobe Acrobat, Word, etc.).
#[tauri::command]
pub fn open_statutory_document(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

/// Opens the annual vault folder directly in Windows File Explorer.
#[tauri::command]
pub fn open_vault_folder(year: Option<i32>) -> Result<(), String> {
    let target_dir = if let Some(y) = year {
        get_vault_year_folder(y)
    } else {
        get_vault_root()
    };

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&target_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("xdg-open")
            .arg(&target_dir)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

/// Deletes a document entry and removes the physical file from the local vault.
#[tauri::command]
pub fn delete_statutory_document(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();

    let file_path: Option<String> = conn
        .query_row(
            "SELECT file_path FROM statutory_documents WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .ok();

    conn.execute(
        "DELETE FROM statutory_documents WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    // Attempt physical deletion
    if let Some(fp) = file_path {
        let p = Path::new(&fp);
        if p.exists() {
            let _ = fs::remove_file(p);
        }
    }

    Ok(())
}
