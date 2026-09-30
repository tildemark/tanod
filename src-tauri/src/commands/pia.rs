use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PiaAssessment {
    pub id: String,
    pub process_id: String,
    pub process_title: Option<String>,
    pub department_name: Option<String>,
    pub threshold_answers: serde_json::Value,
    pub data_flow_details: serde_json::Value,
    pub privacy_principles_checklist: serde_json::Value,
    pub impact_score: i64,      // 1 to 4
    pub probability_score: i64, // 1 to 4
    pub risk_rating: i64,       // impact * probability (1 to 16)
    pub risk_level: String,     // 'NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH'
    pub mitigation_solutions: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavePiaPayload {
    pub process_id: String,
    pub threshold_answers: serde_json::Value,
    pub data_flow_details: serde_json::Value,
    pub privacy_principles_checklist: serde_json::Value,
    pub impact_score: i64,
    pub probability_score: i64,
    pub mitigation_solutions: Option<String>,
}

/// Official NPC 4x4 Risk Matrix Level Calculation
/// Impact (1-4) * Probability (1-4)
/// 1: NEGLIGIBLE | 2-4: LOW | 6-9: MEDIUM | 10-16: HIGH
pub fn compute_npc_risk_level(rating: i64) -> &'static str {
    match rating {
        1 => "NEGLIGIBLE",
        2..=4 => "LOW",
        5..=9 => "MEDIUM",
        _ => "HIGH",
    }
}

/// List all PIA assessments for an organization
#[tauri::command]
pub fn list_pia_assessments(org_id: String, state: State<'_, DbState>) -> Result<Vec<PiaAssessment>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.process_id, p.title, d.name,
                    a.threshold_answers, a.data_flow_details, a.privacy_principles_checklist,
                    a.impact_score, a.probability_score, a.risk_rating, a.risk_level,
                    a.mitigation_solutions, a.created_at, a.updated_at
             FROM pia_assessments a
             JOIN processes p ON p.id = a.process_id
             JOIN departments d ON d.id = p.dept_id
             WHERE d.org_id = ?1 OR ?1 = ''
             ORDER BY a.updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            let threshold_str: String = row.get(4)?;
            let flow_str: String = row.get(5)?;
            let principles_str: String = row.get(6)?;

            let threshold_answers = serde_json::from_str(&threshold_str).unwrap_or(serde_json::json!({}));
            let data_flow_details = serde_json::from_str(&flow_str).unwrap_or(serde_json::json!({}));
            let privacy_principles_checklist = serde_json::from_str(&principles_str).unwrap_or(serde_json::json!({}));

            Ok(PiaAssessment {
                id: row.get(0)?,
                process_id: row.get(1)?,
                process_title: Some(row.get(2)?),
                department_name: Some(row.get(3)?),
                threshold_answers,
                data_flow_details,
                privacy_principles_checklist,
                impact_score: row.get(7)?,
                probability_score: row.get(8)?,
                risk_rating: row.get(9)?,
                risk_level: row.get(10)?,
                mitigation_solutions: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

/// Get PIA assessment by process ID
#[tauri::command]
pub fn get_pia_by_process_id(process_id: String, state: State<'_, DbState>) -> Result<Option<PiaAssessment>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.process_id, p.title, d.name,
                    a.threshold_answers, a.data_flow_details, a.privacy_principles_checklist,
                    a.impact_score, a.probability_score, a.risk_rating, a.risk_level,
                    a.mitigation_solutions, a.created_at, a.updated_at
             FROM pia_assessments a
             JOIN processes p ON p.id = a.process_id
             JOIN departments d ON d.id = p.dept_id
             WHERE a.process_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row(params![process_id], |row| {
        let threshold_str: String = row.get(4)?;
        let flow_str: String = row.get(5)?;
        let principles_str: String = row.get(6)?;

        let threshold_answers = serde_json::from_str(&threshold_str).unwrap_or(serde_json::json!({}));
        let data_flow_details = serde_json::from_str(&flow_str).unwrap_or(serde_json::json!({}));
        let privacy_principles_checklist = serde_json::from_str(&principles_str).unwrap_or(serde_json::json!({}));

        Ok(PiaAssessment {
            id: row.get(0)?,
            process_id: row.get(1)?,
            process_title: Some(row.get(2)?),
            department_name: Some(row.get(3)?),
            threshold_answers,
            data_flow_details,
            privacy_principles_checklist,
            impact_score: row.get(7)?,
            probability_score: row.get(8)?,
            risk_rating: row.get(9)?,
            risk_level: row.get(10)?,
            mitigation_solutions: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    });

    match result {
        Ok(assessment) => Ok(Some(assessment)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Create or Update (Upsert) a PIA Assessment
#[tauri::command]
pub fn save_pia_assessment(
    payload: SavePiaPayload,
    state: State<'_, DbState>,
) -> Result<PiaAssessment, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let impact = payload.impact_score.clamp(1, 4);
    let probability = payload.probability_score.clamp(1, 4);
    let rating = impact * probability;
    let risk_level = compute_npc_risk_level(rating);

    let threshold_json = serde_json::to_string(&payload.threshold_answers).unwrap_or_else(|_| "{}".to_string());
    let flow_json = serde_json::to_string(&payload.data_flow_details).unwrap_or_else(|_| "{}".to_string());
    let principles_json = serde_json::to_string(&payload.privacy_principles_checklist).unwrap_or_else(|_| "{}".to_string());

    // Check if assessment already exists for process
    let existing_id: Option<String> = conn
        .query_row(
            "SELECT id FROM pia_assessments WHERE process_id = ?1",
            params![payload.process_id],
            |row| row.get(0),
        )
        .ok();

    let _id = if let Some(id) = existing_id {
        conn.execute(
            "UPDATE pia_assessments SET
                threshold_answers = ?1,
                data_flow_details = ?2,
                privacy_principles_checklist = ?3,
                impact_score = ?4,
                probability_score = ?5,
                risk_level = ?6,
                mitigation_solutions = ?7,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?8",
            params![
                threshold_json,
                flow_json,
                principles_json,
                impact,
                probability,
                risk_level,
                payload.mitigation_solutions,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;
        id
    } else {
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO pia_assessments (
                id, process_id, threshold_answers, data_flow_details,
                privacy_principles_checklist, impact_score, probability_score,
                risk_level, mitigation_solutions
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                new_id,
                payload.process_id,
                threshold_json,
                flow_json,
                principles_json,
                impact,
                probability,
                risk_level,
                payload.mitigation_solutions,
            ],
        )
        .map_err(|e| e.to_string())?;
        new_id
    };

    // Also sync the process table risk_level
    let _ = conn.execute(
        "UPDATE processes SET risk_level = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![risk_level, payload.process_id],
    );

    drop(conn);
    get_pia_by_process_id(payload.process_id, state)?
        .ok_or_else(|| "Failed to retrieve saved assessment".to_string())
}

/// Delete a PIA assessment
#[tauri::command]
pub fn delete_pia_assessment(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM pia_assessments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
