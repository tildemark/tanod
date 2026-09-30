use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Process {
    pub id: String,
    pub dept_id: String,
    pub department_name: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub data_subjects: Vec<String>,
    pub data_categories: Vec<String>,
    pub lawful_basis: Vec<String>,
    pub recipients: Vec<String>,
    pub retention_period: String,
    pub status: String, // 'DRAFT', 'REVIEW', 'APPROVED'
    pub risk_level: Option<String>, // 'LOW', 'MEDIUM', 'HIGH'
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProcessPayload {
    pub dept_id: String,
    pub title: String,
    pub description: Option<String>,
    pub data_subjects: Vec<String>,
    pub data_categories: Vec<String>,
    pub lawful_basis: Vec<String>,
    pub recipients: Vec<String>,
    pub retention_period: String,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProcessPayload {
    pub dept_id: String,
    pub title: String,
    pub description: Option<String>,
    pub data_subjects: Vec<String>,
    pub data_categories: Vec<String>,
    pub lawful_basis: Vec<String>,
    pub recipients: Vec<String>,
    pub retention_period: String,
    pub status: String,
}

/// Rule-based, transparent risk classifier matching Philippine DPA criteria
/// Sensitive personal info (Biometric, Health, Financial, Government IDs) or high-risk subjects trigger elevated ratings.
fn calculate_process_risk(data_categories: &[String], data_subjects: &[String]) -> &'static str {
    let sensitive_categories = [
        "Biometric Data",
        "Health Information",
        "Government IDs",
        "Financial Information",
    ];

    let high_risk_subjects = ["Minors", "Patients", "Customers"];

    let has_sensitive = data_categories.iter().any(|c| sensitive_categories.contains(&c.as_str()));
    let has_high_risk_subject = data_subjects.iter().any(|s| high_risk_subjects.contains(&s.as_str()));

    if has_sensitive && has_high_risk_subject {
        "HIGH"
    } else if has_sensitive || has_high_risk_subject || data_categories.len() >= 4 {
        "MEDIUM"
    } else {
        "LOW"
    }
}

/// List all ROPA processes for an organization (joined with department names)
#[tauri::command]
pub fn list_processes(org_id: String, state: State<'_, DbState>) -> Result<Vec<Process>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.dept_id, d.name, p.title, p.description,
                    p.data_subjects, p.data_categories, p.lawful_basis, p.recipients,
                    p.retention_period, p.status, p.risk_level, p.created_at, p.updated_at
             FROM processes p
             JOIN departments d ON d.id = p.dept_id
             WHERE d.org_id = ?1 OR ?1 = ''
             ORDER BY p.updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            let subjects_json: String = row.get(5)?;
            let categories_json: String = row.get(6)?;
            let basis_json: String = row.get(7)?;
            let recipients_json: String = row.get(8)?;

            let data_subjects = serde_json::from_str(&subjects_json).unwrap_or_default();
            let data_categories = serde_json::from_str(&categories_json).unwrap_or_default();
            let lawful_basis = serde_json::from_str(&basis_json).unwrap_or_default();
            let recipients = serde_json::from_str(&recipients_json).unwrap_or_default();

            Ok(Process {
                id: row.get(0)?,
                dept_id: row.get(1)?,
                department_name: Some(row.get(2)?),
                title: row.get(3)?,
                description: row.get(4)?,
                data_subjects,
                data_categories,
                lawful_basis,
                recipients,
                retention_period: row.get(9)?,
                status: row.get(10)?,
                risk_level: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut processes = Vec::new();
    for row in rows {
        processes.push(row.map_err(|e| e.to_string())?);
    }

    Ok(processes)
}

/// Get single ROPA process by ID
#[tauri::command]
pub fn get_process_by_id(id: String, state: State<'_, DbState>) -> Result<Process, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.dept_id, d.name, p.title, p.description,
                    p.data_subjects, p.data_categories, p.lawful_basis, p.recipients,
                    p.retention_period, p.status, p.risk_level, p.created_at, p.updated_at
             FROM processes p
             JOIN departments d ON d.id = p.dept_id
             WHERE p.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let process = stmt
        .query_row(params![id], |row| {
            let subjects_json: String = row.get(5)?;
            let categories_json: String = row.get(6)?;
            let basis_json: String = row.get(7)?;
            let recipients_json: String = row.get(8)?;

            let data_subjects = serde_json::from_str(&subjects_json).unwrap_or_default();
            let data_categories = serde_json::from_str(&categories_json).unwrap_or_default();
            let lawful_basis = serde_json::from_str(&basis_json).unwrap_or_default();
            let recipients = serde_json::from_str(&recipients_json).unwrap_or_default();

            Ok(Process {
                id: row.get(0)?,
                dept_id: row.get(1)?,
                department_name: Some(row.get(2)?),
                title: row.get(3)?,
                description: row.get(4)?,
                data_subjects,
                data_categories,
                lawful_basis,
                recipients,
                retention_period: row.get(9)?,
                status: row.get(10)?,
                risk_level: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(process)
}

/// Create a new ROPA process
#[tauri::command]
pub fn create_process(
    payload: CreateProcessPayload,
    state: State<'_, DbState>,
) -> Result<Process, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let subjects_json = serde_json::to_string(&payload.data_subjects).unwrap_or_else(|_| "[]".to_string());
    let categories_json = serde_json::to_string(&payload.data_categories).unwrap_or_else(|_| "[]".to_string());
    let basis_json = serde_json::to_string(&payload.lawful_basis).unwrap_or_else(|_| "[]".to_string());
    let recipients_json = serde_json::to_string(&payload.recipients).unwrap_or_else(|_| "[]".to_string());

    let status = payload.status.unwrap_or_else(|| "DRAFT".to_string());
    let risk_level = calculate_process_risk(&payload.data_categories, &payload.data_subjects);

    conn.execute(
        "INSERT INTO processes (
            id, dept_id, title, description, data_subjects, data_categories,
            lawful_basis, recipients, retention_period, status, risk_level
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            payload.dept_id,
            payload.title,
            payload.description,
            subjects_json,
            categories_json,
            basis_json,
            recipients_json,
            payload.retention_period,
            status,
            risk_level,
        ],
    )
    .map_err(|e| e.to_string())?;

    let dept_name: String = conn
        .query_row("SELECT name FROM departments WHERE id = ?1", params![payload.dept_id], |row| row.get(0))
        .unwrap_or_default();

    Ok(Process {
        id,
        dept_id: payload.dept_id,
        department_name: Some(dept_name),
        title: payload.title,
        description: payload.description,
        data_subjects: payload.data_subjects,
        data_categories: payload.data_categories,
        lawful_basis: payload.lawful_basis,
        recipients: payload.recipients,
        retention_period: payload.retention_period,
        status,
        risk_level: Some(risk_level.to_string()),
        created_at: None,
        updated_at: None,
    })
}

/// Update an existing ROPA process
#[tauri::command]
pub fn update_process(
    id: String,
    payload: UpdateProcessPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let subjects_json = serde_json::to_string(&payload.data_subjects).unwrap_or_else(|_| "[]".to_string());
    let categories_json = serde_json::to_string(&payload.data_categories).unwrap_or_else(|_| "[]".to_string());
    let basis_json = serde_json::to_string(&payload.lawful_basis).unwrap_or_else(|_| "[]".to_string());
    let recipients_json = serde_json::to_string(&payload.recipients).unwrap_or_else(|_| "[]".to_string());

    let risk_level = calculate_process_risk(&payload.data_categories, &payload.data_subjects);

    conn.execute(
        "UPDATE processes SET
            dept_id = ?1,
            title = ?2,
            description = ?3,
            data_subjects = ?4,
            data_categories = ?5,
            lawful_basis = ?6,
            recipients = ?7,
            retention_period = ?8,
            status = ?9,
            risk_level = ?10,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?11",
        params![
            payload.dept_id,
            payload.title,
            payload.description,
            subjects_json,
            categories_json,
            basis_json,
            recipients_json,
            payload.retention_period,
            payload.status,
            risk_level,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete a ROPA process
#[tauri::command]
pub fn delete_process(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM processes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
