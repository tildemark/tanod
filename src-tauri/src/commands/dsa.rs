use crate::commands::audit::record_audit_entry;
use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DataSharingAgreement {
    pub id: String,
    pub org_id: String,
    pub counterparty_name: String,
    pub agreement_type: String, // 'DATA_SHARING', 'OUTSOURCING_PIP', 'CROSS_BORDER', 'INTER_AGENCY'
    pub description: Option<String>,
    pub data_categories: String,
    pub data_subjects: Option<String>,
    pub purpose: String,
    pub lawful_basis: Option<String>,
    pub effective_date: String,
    pub expiration_date: String,
    pub auto_renew: bool,
    pub status: String, // 'DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED'
    pub pip_compliance_certified: bool,
    pub security_measures: Option<String>,
    pub vault_document_id: Option<String>,
    pub vault_document_title: Option<String>,
    pub vault_document_file_path: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDsaPayload {
    pub org_id: String,
    pub counterparty_name: String,
    pub agreement_type: String,
    pub description: Option<String>,
    pub data_categories: String,
    pub data_subjects: Option<String>,
    pub purpose: String,
    pub lawful_basis: Option<String>,
    pub effective_date: String,
    pub expiration_date: String,
    pub auto_renew: bool,
    pub pip_compliance_certified: bool,
    pub security_measures: Option<String>,
    pub vault_document_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDsaPayload {
    pub counterparty_name: String,
    pub agreement_type: String,
    pub description: Option<String>,
    pub data_categories: String,
    pub data_subjects: Option<String>,
    pub purpose: String,
    pub lawful_basis: Option<String>,
    pub effective_date: String,
    pub expiration_date: String,
    pub auto_renew: bool,
    pub status: String,
    pub pip_compliance_certified: bool,
    pub security_measures: Option<String>,
    pub vault_document_id: Option<String>,
}

#[tauri::command]
pub fn list_data_sharing_agreements(
    org_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<DataSharingAgreement>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                dsa.id, dsa.org_id, dsa.counterparty_name, dsa.agreement_type, dsa.description,
                dsa.data_categories, dsa.data_subjects, dsa.purpose, dsa.lawful_basis,
                dsa.effective_date, dsa.expiration_date, dsa.auto_renew, dsa.status,
                dsa.pip_compliance_certified, dsa.security_measures, dsa.vault_document_id,
                v.title AS vault_document_title, v.file_path AS vault_document_file_path,
                dsa.created_at, dsa.updated_at
             FROM data_sharing_agreements dsa
             LEFT JOIN statutory_documents v ON dsa.vault_document_id = v.id
             WHERE dsa.org_id = ?1
             ORDER BY dsa.expiration_date ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(DataSharingAgreement {
                id: row.get(0)?,
                org_id: row.get(1)?,
                counterparty_name: row.get(2)?,
                agreement_type: row.get(3)?,
                description: row.get(4)?,
                data_categories: row.get(5)?,
                data_subjects: row.get(6)?,
                purpose: row.get(7)?,
                lawful_basis: row.get(8)?,
                effective_date: row.get(9)?,
                expiration_date: row.get(10)?,
                auto_renew: row.get(11)?,
                status: row.get(12)?,
                pip_compliance_certified: row.get(13)?,
                security_measures: row.get(14)?,
                vault_document_id: row.get(15)?,
                vault_document_title: row.get(16)?,
                vault_document_file_path: row.get(17)?,
                created_at: row.get(18)?,
                updated_at: row.get(19)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut agreements = Vec::new();
    for r in rows {
        let mut dsa = r.map_err(|e| e.to_string())?;
        // Auto-update status based on expiration date if not TERMINATED
        if dsa.status != "TERMINATED" && dsa.status != "DRAFT" {
            if let Ok(exp) = chrono::NaiveDate::parse_from_str(&dsa.expiration_date, "%Y-%m-%d") {
                let today = chrono::Local::now().date_naive();
                let days_left = (exp - today).num_days();
                if days_left < 0 {
                    dsa.status = "EXPIRED".to_string();
                } else if days_left <= 60 {
                    dsa.status = "EXPIRING".to_string();
                } else {
                    dsa.status = "ACTIVE".to_string();
                }
            }
        }
        agreements.push(dsa);
    }

    Ok(agreements)
}

#[tauri::command]
pub fn create_data_sharing_agreement(
    payload: CreateDsaPayload,
    state: State<'_, DbState>,
) -> Result<DataSharingAgreement, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Determine initial status based on expiration
    let mut initial_status = "ACTIVE".to_string();
    if let Ok(exp) = chrono::NaiveDate::parse_from_str(&payload.expiration_date, "%Y-%m-%d") {
        let today = chrono::Local::now().date_naive();
        let days_left = (exp - today).num_days();
        if days_left < 0 {
            initial_status = "EXPIRED".to_string();
        } else if days_left <= 60 {
            initial_status = "EXPIRING".to_string();
        }
    }

    conn.execute(
        "INSERT INTO data_sharing_agreements (
            id, org_id, counterparty_name, agreement_type, description,
            data_categories, data_subjects, purpose, lawful_basis,
            effective_date, expiration_date, auto_renew, status,
            pip_compliance_certified, security_measures, vault_document_id,
            created_at, updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        params![
            id,
            payload.org_id,
            payload.counterparty_name,
            payload.agreement_type,
            payload.description,
            payload.data_categories,
            payload.data_subjects,
            payload.purpose,
            payload.lawful_basis,
            payload.effective_date,
            payload.expiration_date,
            payload.auto_renew,
            initial_status,
            payload.pip_compliance_certified,
            payload.security_measures,
            payload.vault_document_id,
            now,
            now
        ],
    )
    .map_err(|e| e.to_string())?;

    // Record audit log entry
    let audit_summary = format!(
        "Recorded new {} with '{}'",
        payload.agreement_type, payload.counterparty_name
    );
    let audit_details = serde_json::json!({
        "dsa_id": id,
        "counterparty": payload.counterparty_name,
        "type": payload.agreement_type,
        "effective_date": payload.effective_date,
        "expiration_date": payload.expiration_date
    })
    .to_string();

    let _ = record_audit_entry(
        &conn,
        &payload.org_id,
        "DSA_RECORDED",
        "DSA",
        &id,
        &audit_summary,
        &audit_details,
    );

    // Fetch the inserted record
    let mut stmt = conn
        .prepare(
            "SELECT 
                dsa.id, dsa.org_id, dsa.counterparty_name, dsa.agreement_type, dsa.description,
                dsa.data_categories, dsa.data_subjects, dsa.purpose, dsa.lawful_basis,
                dsa.effective_date, dsa.expiration_date, dsa.auto_renew, dsa.status,
                dsa.pip_compliance_certified, dsa.security_measures, dsa.vault_document_id,
                v.title AS vault_document_title, v.file_path AS vault_document_file_path,
                dsa.created_at, dsa.updated_at
             FROM data_sharing_agreements dsa
             LEFT JOIN statutory_documents v ON dsa.vault_document_id = v.id
             WHERE dsa.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| {
        Ok(DataSharingAgreement {
            id: row.get(0)?,
            org_id: row.get(1)?,
            counterparty_name: row.get(2)?,
            agreement_type: row.get(3)?,
            description: row.get(4)?,
            data_categories: row.get(5)?,
            data_subjects: row.get(6)?,
            purpose: row.get(7)?,
            lawful_basis: row.get(8)?,
            effective_date: row.get(9)?,
            expiration_date: row.get(10)?,
            auto_renew: row.get(11)?,
            status: row.get(12)?,
            pip_compliance_certified: row.get(13)?,
            security_measures: row.get(14)?,
            vault_document_id: row.get(15)?,
            vault_document_title: row.get(16)?,
            vault_document_file_path: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_data_sharing_agreement(
    id: String,
    payload: UpdateDsaPayload,
    state: State<'_, DbState>,
) -> Result<DataSharingAgreement, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE data_sharing_agreements SET
            counterparty_name = ?1,
            agreement_type = ?2,
            description = ?3,
            data_categories = ?4,
            data_subjects = ?5,
            purpose = ?6,
            lawful_basis = ?7,
            effective_date = ?8,
            expiration_date = ?9,
            auto_renew = ?10,
            status = ?11,
            pip_compliance_certified = ?12,
            security_measures = ?13,
            vault_document_id = ?14,
            updated_at = ?15
         WHERE id = ?16",
        params![
            payload.counterparty_name,
            payload.agreement_type,
            payload.description,
            payload.data_categories,
            payload.data_subjects,
            payload.purpose,
            payload.lawful_basis,
            payload.effective_date,
            payload.expiration_date,
            payload.auto_renew,
            payload.status,
            payload.pip_compliance_certified,
            payload.security_measures,
            payload.vault_document_id,
            now,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    // Record audit entry
    let mut stmt_org = conn
        .prepare("SELECT org_id FROM data_sharing_agreements WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let org_id: String = stmt_org
        .query_row(params![id], |row| row.get(0))
        .unwrap_or_default();

    let audit_summary = format!(
        "Updated {} record for '{}'",
        payload.agreement_type, payload.counterparty_name
    );
    let audit_details = serde_json::json!({
        "dsa_id": id,
        "counterparty": payload.counterparty_name,
        "status": payload.status,
        "expiration_date": payload.expiration_date
    })
    .to_string();

    let _ = record_audit_entry(
        &conn,
        &org_id,
        "DSA_UPDATED",
        "DSA",
        &id,
        &audit_summary,
        &audit_details,
    );

    let mut stmt = conn
        .prepare(
            "SELECT 
                dsa.id, dsa.org_id, dsa.counterparty_name, dsa.agreement_type, dsa.description,
                dsa.data_categories, dsa.data_subjects, dsa.purpose, dsa.lawful_basis,
                dsa.effective_date, dsa.expiration_date, dsa.auto_renew, dsa.status,
                dsa.pip_compliance_certified, dsa.security_measures, dsa.vault_document_id,
                v.title AS vault_document_title, v.file_path AS vault_document_file_path,
                dsa.created_at, dsa.updated_at
             FROM data_sharing_agreements dsa
             LEFT JOIN statutory_documents v ON dsa.vault_document_id = v.id
             WHERE dsa.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| {
        Ok(DataSharingAgreement {
            id: row.get(0)?,
            org_id: row.get(1)?,
            counterparty_name: row.get(2)?,
            agreement_type: row.get(3)?,
            description: row.get(4)?,
            data_categories: row.get(5)?,
            data_subjects: row.get(6)?,
            purpose: row.get(7)?,
            lawful_basis: row.get(8)?,
            effective_date: row.get(9)?,
            expiration_date: row.get(10)?,
            auto_renew: row.get(11)?,
            status: row.get(12)?,
            pip_compliance_certified: row.get(13)?,
            security_measures: row.get(14)?,
            vault_document_id: row.get(15)?,
            vault_document_title: row.get(16)?,
            vault_document_file_path: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_data_sharing_agreement(
    id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT org_id, counterparty_name FROM data_sharing_agreements WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let info: Option<(String, String)> = stmt
        .query_row(params![id], |row| Ok((row.get(0)?, row.get(1)?)))
        .ok();

    conn.execute(
        "DELETE FROM data_sharing_agreements WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    if let Some((org_id, counterparty)) = info {
        let audit_summary = format!("Deleted Data Sharing Agreement with '{}'", counterparty);
        let audit_details = serde_json::json!({ "dsa_id": id }).to_string();
        let _ = record_audit_entry(
            &conn,
            &org_id,
            "DSA_DELETED",
            "DSA",
            &id,
            &audit_summary,
            &audit_details,
        );
    }

    Ok(())
}
