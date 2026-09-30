use crate::db::DbState;
use base64::{engine::general_purpose, Engine as _};
use directories::ProjectDirs;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub logo_path: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub dpo_name: Option<String>,
    pub dpo_email: Option<String>,
    pub industry: Option<String>,
    pub description: Option<String>,
    pub employee_count: Option<i64>,
    pub npc_notification_email: Option<String>,
    pub breach_notification_hours: Option<i64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateOrgPayload {
    pub name: String,
    pub slug: String,
    pub logo_path: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub dpo_name: Option<String>,
    pub dpo_email: Option<String>,
    pub industry: Option<String>,
    pub description: Option<String>,
    pub employee_count: Option<i64>,
    pub npc_notification_email: Option<String>,
    pub breach_notification_hours: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Department {
    pub id: String,
    pub org_id: String,
    pub name: String,
    pub description: Option<String>,
    pub process_count: i64,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDeptPayload {
    pub org_id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDeptPayload {
    pub name: String,
    pub description: Option<String>,
}

/// Helper to get or create assets directory inside %APPDATA%\tanod\assets
fn get_assets_dir() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from("ph", "sanchez", "tanod") {
        let assets = proj_dirs.data_local_dir().join("assets");
        fs::create_dir_all(&assets).unwrap_or_default();
        assets
    } else {
        PathBuf::from("assets")
    }
}

/// Get primary organization (creates default Philippine PIC profile if not present)
#[tauri::command]
pub fn get_organization(state: State<'_, DbState>) -> Result<Organization, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, slug, logo_path, address, city, country, phone, email, website,
                    dpo_name, dpo_email, industry, description, employee_count,
                    npc_notification_email, breach_notification_hours, created_at, updated_at
             FROM organizations LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let org_result = stmt.query_row([], |row| {
        Ok(Organization {
            id: row.get(0)?,
            name: row.get(1)?,
            slug: row.get(2)?,
            logo_path: row.get(3)?,
            address: row.get(4)?,
            city: row.get(5)?,
            country: row.get(6)?,
            phone: row.get(7)?,
            email: row.get(8)?,
            website: row.get(9)?,
            dpo_name: row.get(10)?,
            dpo_email: row.get(11)?,
            industry: row.get(12)?,
            description: row.get(13)?,
            employee_count: row.get(14)?,
            npc_notification_email: row.get(15)?,
            breach_notification_hours: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    });

    match org_result {
        Ok(org) => Ok(org),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Seed initial organization profile
            let id = Uuid::new_v4().to_string();
            let default_org = Organization {
                id: id.clone(),
                name: "Republic Health System".to_string(),
                slug: "republic-health".to_string(),
                logo_path: None,
                address: Some("100 Corporate Ave, Bonifacio Global City".to_string()),
                city: Some("Taguig".to_string()),
                country: Some("Philippines".to_string()),
                phone: Some("+63 2 8123 4567".to_string()),
                email: Some("privacy@republichealth.ph".to_string()),
                website: Some("https://republichealth.ph".to_string()),
                dpo_name: Some("Atty. Maria Santos, CIPP/E".to_string()),
                dpo_email: Some("dpo@republichealth.ph".to_string()),
                industry: Some("Healthcare & Medical Services".to_string()),
                description: Some("Personal Information Controller (PIC) operating healthcare facilities in Metro Manila.".to_string()),
                employee_count: Some(450),
                npc_notification_email: Some("privacy.complaints@privacy.gov.ph".to_string()),
                breach_notification_hours: Some(72),
                created_at: None,
                updated_at: None,
            };

            conn.execute(
                "INSERT INTO organizations (
                    id, name, slug, logo_path, address, city, country, phone, email, website,
                    dpo_name, dpo_email, industry, description, employee_count,
                    npc_notification_email, breach_notification_hours
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                params![
                    default_org.id,
                    default_org.name,
                    default_org.slug,
                    default_org.logo_path,
                    default_org.address,
                    default_org.city,
                    default_org.country,
                    default_org.phone,
                    default_org.email,
                    default_org.website,
                    default_org.dpo_name,
                    default_org.dpo_email,
                    default_org.industry,
                    default_org.description,
                    default_org.employee_count,
                    default_org.npc_notification_email,
                    default_org.breach_notification_hours,
                ],
            )
            .map_err(|e| e.to_string())?;

            // Also seed common standard departments
            let depts = vec![
                ("Human Resources", "Employee lifecycle, payroll, and benefits administration"),
                ("Information Technology", "Infrastructure, access control, cybersecurity, and log retention"),
                ("Legal & Compliance", "Contracts, DSAs, DSR fulfillment, and regulatory audits"),
                ("Finance & Accounting", "Billing, vendor invoices, tax compliance, and treasury"),
            ];

            for (dept_name, dept_desc) in depts {
                let dept_id = Uuid::new_v4().to_string();
                let _ = conn.execute(
                    "INSERT INTO departments (id, org_id, name, description) VALUES (?1, ?2, ?3, ?4)",
                    params![dept_id, id, dept_name, dept_desc],
                );
            }

            Ok(default_org)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Update organization metadata
#[tauri::command]
pub fn update_organization(
    id: String,
    payload: UpdateOrgPayload,
    state: State<'_, DbState>,
) -> Result<Organization, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE organizations SET
            name = ?1,
            slug = ?2,
            logo_path = ?3,
            address = ?4,
            city = ?5,
            country = ?6,
            phone = ?7,
            email = ?8,
            website = ?9,
            dpo_name = ?10,
            dpo_email = ?11,
            industry = ?12,
            description = ?13,
            employee_count = ?14,
            npc_notification_email = ?15,
            breach_notification_hours = ?16,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?17",
        params![
            payload.name,
            payload.slug,
            payload.logo_path,
            payload.address,
            payload.city,
            payload.country,
            payload.phone,
            payload.email,
            payload.website,
            payload.dpo_name,
            payload.dpo_email,
            payload.industry,
            payload.description,
            payload.employee_count,
            payload.npc_notification_email,
            payload.breach_notification_hours,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    drop(conn);
    get_organization(state)
}

/// Save organization logo image locally in %APPDATA%/tanod/assets/
#[tauri::command]
pub fn save_org_logo(
    file_name: String,
    base64_data: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let assets_dir = get_assets_dir();
    let ext = std::path::Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    let unique_name = format!("logo_{}.{}", Uuid::new_v4(), ext);
    let target_path = assets_dir.join(&unique_name);

    // Decode base64
    let clean_base64 = if let Some(idx) = base64_data.find(',') {
        &base64_data[idx + 1..]
    } else {
        &base64_data
    };

    let bytes = general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| format!("Invalid base64 image data: {}", e))?;

    fs::write(&target_path, bytes).map_err(|e| format!("Failed to save logo file: {}", e))?;

    let saved_path_str = target_path.to_string_lossy().to_string();

    // Update current organization logo_path
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE organizations SET logo_path = ?1, updated_at = CURRENT_TIMESTAMP",
        params![saved_path_str],
    )
    .map_err(|e| e.to_string())?;

    Ok(saved_path_str)
}

/// List all departments for an organization with process count
#[tauri::command]
pub fn list_departments(org_id: String, state: State<'_, DbState>) -> Result<Vec<Department>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.org_id, d.name, d.description,
                    COUNT(p.id) AS process_count,
                    d.created_at, d.updated_at
             FROM departments d
             LEFT JOIN processes p ON p.dept_id = d.id
             WHERE d.org_id = ?1
             GROUP BY d.id
             ORDER BY d.name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(Department {
                id: row.get(0)?,
                org_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                process_count: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut depts = Vec::new();
    for row in rows {
        depts.push(row.map_err(|e| e.to_string())?);
    }

    Ok(depts)
}

/// Create a new department
#[tauri::command]
pub fn create_department(
    payload: CreateDeptPayload,
    state: State<'_, DbState>,
) -> Result<Department, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO departments (id, org_id, name, description) VALUES (?1, ?2, ?3, ?4)",
        params![id, payload.org_id, payload.name, payload.description],
    )
    .map_err(|e| e.to_string())?;

    Ok(Department {
        id,
        org_id: payload.org_id,
        name: payload.name,
        description: payload.description,
        process_count: 0,
        created_at: None,
        updated_at: None,
    })
}

/// Update an existing department
#[tauri::command]
pub fn update_department(
    id: String,
    payload: UpdateDeptPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE departments SET name = ?1, description = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![payload.name, payload.description, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Safe department deletion with check: fails if department has associated processes
#[tauri::command]
pub fn delete_department(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM processes WHERE dept_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if count > 0 {
        return Err(format!(
            "Cannot delete department: It is associated with {} ROPA process(es). Reassign or delete those records first.",
            count
        ));
    }

    conn.execute("DELETE FROM departments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
