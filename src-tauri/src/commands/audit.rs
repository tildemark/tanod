use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemAuditLog {
    pub id: String,
    pub org_id: String,
    pub timestamp: String,
    pub action: String,
    pub entity_type: String,
    pub entity_id: String,
    pub summary: String,
    pub details: String,
    pub prev_hash: String,
    pub entry_hash: String,
}

/// Helper function to record a tamper-evident audit log with hash-chaining
pub fn record_audit_entry(
    conn: &rusqlite::Connection,
    org_id: &str,
    action: &str,
    entity_type: &str,
    entity_id: &str,
    summary: &str,
    details: &str,
) -> Result<SystemAuditLog, String> {
    // 1. Fetch latest entry_hash to form the blockchain-like hash link
    let prev_hash: String = conn
        .query_row(
            "SELECT entry_hash FROM system_audit_logs ORDER BY timestamp DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "0000000000000000000000000000000000000000000000000000000000000000".to_string());

    let id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().to_rfc3339();

    // 2. Compute SHA-256(prev_hash + timestamp + action + entity_id + summary + details)
    let mut hasher = Sha256::new();
    hasher.update(prev_hash.as_bytes());
    hasher.update(timestamp.as_bytes());
    hasher.update(action.as_bytes());
    hasher.update(entity_id.as_bytes());
    hasher.update(summary.as_bytes());
    hasher.update(details.as_bytes());
    let entry_hash = format!("{:x}", hasher.finalize());

    // 3. Insert into SQLite (append-only)
    conn.execute(
        "INSERT INTO system_audit_logs (
            id, org_id, timestamp, action, entity_type, entity_id, summary, details, prev_hash, entry_hash
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            org_id,
            timestamp,
            action,
            entity_type,
            entity_id,
            summary,
            details,
            prev_hash,
            entry_hash,
        ],
    )
    .map_err(|e| format!("Failed to record immutable audit log: {}", e))?;

    Ok(SystemAuditLog {
        id,
        org_id: org_id.to_string(),
        timestamp,
        action: action.to_string(),
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
        summary: summary.to_string(),
        details: details.to_string(),
        prev_hash,
        entry_hash,
    })
}

#[tauri::command]
pub fn list_system_audit_logs(
    org_id: String,
    limit: Option<i64>,
    state: State<'_, DbState>,
) -> Result<Vec<SystemAuditLog>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let row_limit = limit.unwrap_or(100);

    let mut stmt = conn
        .prepare(
            "SELECT id, org_id, timestamp, action, entity_type, entity_id, summary, details, prev_hash, entry_hash
             FROM system_audit_logs
             WHERE org_id = ?1 OR ?1 = ''
             ORDER BY timestamp DESC
             LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id, row_limit], |row| {
            Ok(SystemAuditLog {
                id: row.get(0)?,
                org_id: row.get(1)?,
                timestamp: row.get(2)?,
                action: row.get(3)?,
                entity_type: row.get(4)?,
                entity_id: row.get(5)?,
                summary: row.get(6)?,
                details: row.get(7)?,
                prev_hash: row.get(8)?,
                entry_hash: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

#[tauri::command]
pub fn verify_audit_trail_integrity(state: State<'_, DbState>) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, timestamp, action, entity_id, summary, details, prev_hash, entry_hash
             FROM system_audit_logs
             ORDER BY timestamp ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut expected_prev = "0000000000000000000000000000000000000000000000000000000000000000".to_string();

    for row_res in rows {
        let (_id, timestamp, action, entity_id, summary, details, prev_hash, entry_hash) =
            row_res.map_err(|e| e.to_string())?;

        // 1. Verify prev_hash matches the previous record's entry_hash
        if prev_hash != expected_prev {
            return Ok(false);
        }

        // 2. Re-compute hash
        let mut hasher = Sha256::new();
        hasher.update(prev_hash.as_bytes());
        hasher.update(timestamp.as_bytes());
        hasher.update(action.as_bytes());
        hasher.update(entity_id.as_bytes());
        hasher.update(summary.as_bytes());
        hasher.update(details.as_bytes());
        let calculated = format!("{:x}", hasher.finalize());

        if calculated != entry_hash {
            return Ok(false);
        }

        expected_prev = entry_hash;
    }

    Ok(true)
}
