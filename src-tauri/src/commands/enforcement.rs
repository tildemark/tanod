use crate::db::DbState;
use chrono::{DateTime, Duration, Utc};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ==========================================
// 1. INCIDENTS & 72-HOUR STATUTORY COUNTDOWN
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Incident {
    pub id: String,
    pub org_id: String,
    pub title: String,
    pub incident_date: String,
    pub discovered_date: String,
    pub breach_timer_deadline: String,
    pub severity: String, // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    pub impacted_individuals: Option<i64>,
    pub systems_affected: Option<String>,
    pub description: Option<String>,
    pub measures_taken: Option<String>,
    pub is_notifiable_breach: bool,
    pub npc_notified: bool,
    pub npc_notification_date: Option<String>,
    pub status: String, // 'REPORTED', 'ASSESSING', 'NOTIFYING', 'RESOLVED'
    pub asir_reported: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateIncidentPayload {
    pub org_id: String,
    pub title: String,
    pub incident_date: String,
    pub discovered_date: Option<String>,
    pub severity: String,
    pub impacted_individuals: Option<i64>,
    pub systems_affected: Option<String>,
    pub description: Option<String>,
    pub measures_taken: Option<String>,
    pub is_notifiable_breach: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateIncidentPayload {
    pub title: String,
    pub incident_date: String,
    pub severity: String,
    pub impacted_individuals: Option<i64>,
    pub systems_affected: Option<String>,
    pub description: Option<String>,
    pub measures_taken: Option<String>,
    pub is_notifiable_breach: bool,
    pub npc_notified: bool,
    pub npc_notification_date: Option<String>,
    pub status: String,
    pub asir_reported: bool,
}

#[tauri::command]
pub fn list_incidents(org_id: String, state: State<'_, DbState>) -> Result<Vec<Incident>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, org_id, title, incident_date, discovered_date, breach_timer_deadline,
                    severity, impacted_individuals, systems_affected, description, measures_taken,
                    is_notifiable_breach, npc_notified, npc_notification_date, status, asir_reported,
                    created_at, updated_at
             FROM incidents
             WHERE org_id = ?1 OR ?1 = ''
             ORDER BY discovered_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(Incident {
                id: row.get(0)?,
                org_id: row.get(1)?,
                title: row.get(2)?,
                incident_date: row.get(3)?,
                discovered_date: row.get(4)?,
                breach_timer_deadline: row.get(5)?,
                severity: row.get(6)?,
                impacted_individuals: row.get(7)?,
                systems_affected: row.get(8)?,
                description: row.get(9)?,
                measures_taken: row.get(10)?,
                is_notifiable_breach: row.get(11)?,
                npc_notified: row.get(12)?,
                npc_notification_date: row.get(13)?,
                status: row.get(14)?,
                asir_reported: row.get(15)?,
                created_at: row.get(16)?,
                updated_at: row.get(17)?,
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
pub fn create_incident(
    payload: CreateIncidentPayload,
    state: State<'_, DbState>,
) -> Result<Incident, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let now_utc = Utc::now();
    let discovered_dt: DateTime<Utc> = if let Some(d_str) = &payload.discovered_date {
        DateTime::parse_from_rfc3339(d_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or(now_utc)
    } else {
        now_utc
    };

    // Calculate mandatory 72-hour statutory deadline under NPC Circular 16-03
    let deadline_dt = discovered_dt + Duration::hours(72);
    let discovered_iso = discovered_dt.to_rfc3339();
    let deadline_iso = deadline_dt.to_rfc3339();

    conn.execute(
        "INSERT INTO incidents (
            id, org_id, title, incident_date, discovered_date, breach_timer_deadline,
            severity, impacted_individuals, systems_affected, description, measures_taken,
            is_notifiable_breach, npc_notified, status, asir_reported
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, 'REPORTED', 0)",
        params![
            id,
            payload.org_id,
            payload.title,
            payload.incident_date,
            discovered_iso,
            deadline_iso,
            payload.severity,
            payload.impacted_individuals,
            payload.systems_affected,
            payload.description,
            payload.measures_taken,
            payload.is_notifiable_breach,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Incident {
        id,
        org_id: payload.org_id,
        title: payload.title,
        incident_date: payload.incident_date,
        discovered_date: discovered_iso,
        breach_timer_deadline: deadline_iso,
        severity: payload.severity,
        impacted_individuals: payload.impacted_individuals,
        systems_affected: payload.systems_affected,
        description: payload.description,
        measures_taken: payload.measures_taken,
        is_notifiable_breach: payload.is_notifiable_breach,
        npc_notified: false,
        npc_notification_date: None,
        status: "REPORTED".to_string(),
        asir_reported: false,
        created_at: None,
        updated_at: None,
    })
}

#[tauri::command]
pub fn update_incident(
    id: String,
    payload: UpdateIncidentPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE incidents SET
            title = ?1,
            incident_date = ?2,
            severity = ?3,
            impacted_individuals = ?4,
            systems_affected = ?5,
            description = ?6,
            measures_taken = ?7,
            is_notifiable_breach = ?8,
            npc_notified = ?9,
            npc_notification_date = ?10,
            status = ?11,
            asir_reported = ?12,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?13",
        params![
            payload.title,
            payload.incident_date,
            payload.severity,
            payload.impacted_individuals,
            payload.systems_affected,
            payload.description,
            payload.measures_taken,
            payload.is_notifiable_breach,
            payload.npc_notified,
            payload.npc_notification_date,
            payload.status,
            payload.asir_reported,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_incident(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM incidents WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// 2. DATA SUBJECT RIGHTS (DSR) & KANBAN
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DsrRequest {
    pub id: String,
    pub org_id: String,
    pub request_type: String, // 'Access', 'Erasure', 'Rectification', 'Portability', 'Objection'
    pub requester_name: String,
    pub requester_email: String,
    pub status: String, // 'RECEIVED', 'UNDER_REVIEW', 'ACTIONED', 'REJECTED'
    pub received_date: String,
    pub sla_deadline: String,
    pub notes: Option<String>,
    pub requested_scope: Option<String>,
    pub action_taken: Option<String>,
    pub data_location: Option<String>,
    pub resolution_summary: Option<String>,
    pub resolved_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DsrActionLog {
    pub id: String,
    pub dsr_id: String,
    pub action_taken: String,
    pub action_details: String,
    pub data_location: Option<String>,
    pub performed_by: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDsrPayload {
    pub org_id: String,
    pub request_type: String,
    pub requester_name: String,
    pub requester_email: String,
    pub received_date: Option<String>,
    pub notes: Option<String>,
    pub requested_scope: Option<String>,
    pub data_location: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDsrStatusPayload {
    pub id: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResolveDsrPayload {
    pub id: String,
    pub status: String,              // 'ACTIONED' or 'REJECTED'
    pub action_taken: String,        // 'REDACTED', 'ERASED', 'EXTRACTED_PROVIDED', 'DENIED', 'NOTE_ADDED'
    pub action_details: String,      // Description of what was done
    pub data_location: Option<String>,
    pub resolution_summary: String,
    pub performed_by: Option<String>,
}

#[tauri::command]
pub fn list_dsr_requests(org_id: String, state: State<'_, DbState>) -> Result<Vec<DsrRequest>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, org_id, request_type, requester_name, requester_email,
                    status, received_date, sla_deadline, notes,
                    requested_scope, action_taken, data_location, resolution_summary, resolved_date,
                    created_at, updated_at
             FROM dsr_requests
             WHERE org_id = ?1 OR ?1 = ''
             ORDER BY received_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(DsrRequest {
                id: row.get(0)?,
                org_id: row.get(1)?,
                request_type: row.get(2)?,
                requester_name: row.get(3)?,
                requester_email: row.get(4)?,
                status: row.get(5)?,
                received_date: row.get(6)?,
                sla_deadline: row.get(7)?,
                notes: row.get(8)?,
                requested_scope: row.get(9)?,
                action_taken: row.get(10)?,
                data_location: row.get(11)?,
                resolution_summary: row.get(12)?,
                resolved_date: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
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
pub fn create_dsr_request(
    payload: CreateDsrPayload,
    state: State<'_, DbState>,
) -> Result<DsrRequest, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let now_utc = Utc::now();
    let received_dt: DateTime<Utc> = if let Some(r_str) = &payload.received_date {
        DateTime::parse_from_rfc3339(r_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or(now_utc)
    } else {
        now_utc
    };

    // Calculate 30-working-day statutory SLA (approx. 42 calendar days excluding weekends)
    let sla_dt = received_dt + Duration::days(42);
    let received_iso = received_dt.to_rfc3339();
    let sla_iso = sla_dt.to_rfc3339();

    conn.execute(
        "INSERT INTO dsr_requests (
            id, org_id, request_type, requester_name, requester_email,
            status, received_date, sla_deadline, notes, requested_scope, data_location
         ) VALUES (?1, ?2, ?3, ?4, ?5, 'RECEIVED', ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            payload.org_id,
            payload.request_type,
            payload.requester_name,
            payload.requester_email,
            received_iso,
            sla_iso,
            payload.notes,
            payload.requested_scope,
            payload.data_location,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Record Immutable Audit Log
    let audit_summary = format!(
        "DSR Request logged: {} ({}) for {}",
        payload.request_type, id, payload.requester_name
    );
    let _ = crate::commands::audit::record_audit_entry(
        &conn,
        &payload.org_id,
        "DSR_RECEIVED",
        "DSR",
        &id,
        &audit_summary,
        &format!("{{\"type\":\"{}\",\"email\":\"{}\"}}", payload.request_type, payload.requester_email),
    );

    Ok(DsrRequest {
        id,
        org_id: payload.org_id,
        request_type: payload.request_type,
        requester_name: payload.requester_name,
        requester_email: payload.requester_email,
        status: "RECEIVED".to_string(),
        received_date: received_iso,
        sla_deadline: sla_iso,
        notes: payload.notes,
        requested_scope: payload.requested_scope,
        action_taken: None,
        data_location: payload.data_location,
        resolution_summary: None,
        resolved_date: None,
        created_at: None,
        updated_at: None,
    })
}

#[tauri::command]
pub fn update_dsr_status(
    payload: UpdateDsrStatusPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE dsr_requests SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![payload.status, payload.id],
    )
    .map_err(|e| e.to_string())?;

    // Record Immutable Audit Log
    let summary = format!("DSR {} transitioned to {}", payload.id, payload.status);
    let _ = crate::commands::audit::record_audit_entry(
        &conn,
        "",
        "DSR_STATUS_CHANGE",
        "DSR",
        &payload.id,
        &summary,
        &format!("{{\"status\":\"{}\"}}", payload.status),
    );

    Ok(())
}

#[tauri::command]
pub fn resolve_dsr_request(
    payload: ResolveDsrPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now_iso = Utc::now().to_rfc3339();
    let action_log_id = Uuid::new_v4().to_string();
    let performer = payload.performed_by.unwrap_or_else(|| "Data Protection Office".to_string());

    // 1. Update dsr_requests
    conn.execute(
        "UPDATE dsr_requests SET
            status = ?1,
            action_taken = ?2,
            data_location = COALESCE(?3, data_location),
            resolution_summary = ?4,
            resolved_date = ?5,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?6",
        params![
            payload.status,
            payload.action_taken,
            payload.data_location,
            payload.resolution_summary,
            now_iso,
            payload.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    // 2. Append to dsr_action_logs trail
    conn.execute(
        "INSERT INTO dsr_action_logs (
            id, dsr_id, action_taken, action_details, data_location, performed_by, created_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            action_log_id,
            payload.id,
            payload.action_taken,
            payload.action_details,
            payload.data_location,
            performer,
            now_iso,
        ],
    )
    .map_err(|e| e.to_string())?;

    // 3. Record Immutable Tamper-Evident Audit Log
    let summary = format!(
        "DSR {} resolved with action: {} ({})",
        payload.id, payload.action_taken, payload.status
    );
    let details = serde_json::json!({
        "status": payload.status,
        "action_taken": payload.action_taken,
        "action_details": payload.action_details,
        "data_location": payload.data_location,
        "resolution_summary": payload.resolution_summary,
        "performer": performer
    })
    .to_string();

    let _ = crate::commands::audit::record_audit_entry(
        &conn,
        "",
        "DSR_RESOLVED",
        "DSR",
        &payload.id,
        &summary,
        &details,
    );

    Ok(())
}

#[tauri::command]
pub fn list_dsr_action_logs(
    dsr_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<DsrActionLog>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, dsr_id, action_taken, action_details, data_location, performed_by, created_at
             FROM dsr_action_logs
             WHERE dsr_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![dsr_id], |row| {
            Ok(DsrActionLog {
                id: row.get(0)?,
                dsr_id: row.get(1)?,
                action_taken: row.get(2)?,
                action_details: row.get(3)?,
                data_location: row.get(4)?,
                performed_by: row.get(5)?,
                created_at: row.get(6)?,
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
pub fn delete_dsr_request(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM dsr_requests WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    // Record audit log
    let summary = format!("DSR Request deleted: {}", id);
    let _ = crate::commands::audit::record_audit_entry(
        &conn,
        "",
        "DSR_DELETED",
        "DSR",
        &id,
        &summary,
        "{}",
    );

    Ok(())
}

// ==========================================
// 3. DPO DIRECTIVES & INSTITUTIONAL MEMOS
// ==========================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DpoMemo {
    pub id: String,
    pub org_id: String,
    pub memo_number: String,
    pub title: String,
    pub pillar: String, // 'Organizational', 'Physical', 'Technical', 'Incident'
    pub target_dept_id: Option<String>,
    pub target_dept_name: Option<String>,
    pub content: String,
    pub issued_date: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMemoPayload {
    pub org_id: String,
    pub memo_number: String,
    pub title: String,
    pub pillar: String,
    pub target_dept_id: Option<String>,
    pub content: String,
    pub issued_date: Option<String>,
}

#[tauri::command]
pub fn list_dpo_memos(org_id: String, state: State<'_, DbState>) -> Result<Vec<DpoMemo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.org_id, m.memo_number, m.title, m.pillar,
                    m.target_dept_id, d.name, m.content, m.issued_date, m.created_at
             FROM dpo_memos m
             LEFT JOIN departments d ON d.id = m.target_dept_id
             WHERE m.org_id = ?1 OR ?1 = ''
             ORDER BY m.issued_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(DpoMemo {
                id: row.get(0)?,
                org_id: row.get(1)?,
                memo_number: row.get(2)?,
                title: row.get(3)?,
                pillar: row.get(4)?,
                target_dept_id: row.get(5)?,
                target_dept_name: row.get(6)?,
                content: row.get(7)?,
                issued_date: row.get(8)?,
                created_at: row.get(9)?,
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
pub fn create_dpo_memo(
    payload: CreateMemoPayload,
    state: State<'_, DbState>,
) -> Result<DpoMemo, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    let issued_iso = payload.issued_date.unwrap_or_else(|| Utc::now().to_rfc3339());

    conn.execute(
        "INSERT INTO dpo_memos (
            id, org_id, memo_number, title, pillar, target_dept_id, content, issued_date
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            payload.org_id,
            payload.memo_number,
            payload.title,
            payload.pillar,
            payload.target_dept_id,
            payload.content,
            issued_iso,
        ],
    )
    .map_err(|e| e.to_string())?;

    let dept_name: Option<String> = if let Some(dept_id) = &payload.target_dept_id {
        conn.query_row("SELECT name FROM departments WHERE id = ?1", params![dept_id], |row| row.get(0)).ok()
    } else {
        None
    };

    Ok(DpoMemo {
        id,
        org_id: payload.org_id,
        memo_number: payload.memo_number,
        title: payload.title,
        pillar: payload.pillar,
        target_dept_id: payload.target_dept_id,
        target_dept_name: dept_name,
        content: payload.content,
        issued_date: issued_iso,
        created_at: None,
    })
}

#[tauri::command]
pub fn delete_dpo_memo(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM dpo_memos WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
