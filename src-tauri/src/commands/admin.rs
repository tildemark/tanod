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
    pub tin_number: Option<String>,
    pub entity_type: String, // 'PIC', 'PIP', 'BOTH'
    pub sector: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    
    // Head of Organization / Agency
    pub head_name: Option<String>,
    pub head_title: Option<String>,
    pub head_email: Option<String>,
    pub head_phone: Option<String>,

    // Primary DPO
    pub dpo_name: Option<String>,
    pub dpo_email: Option<String>,
    pub industry: Option<String>,
    pub description: Option<String>,
    pub employee_count: Option<i64>,

    // NPCRS Credentials & Deadlines
    pub npc_registration_number: Option<String>,
    pub registration_date: Option<String>,
    pub renewal_deadline: Option<String>,
    pub has_npc_seal: Option<bool>,
    pub asir_due_date: Option<String>,

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
    pub tin_number: Option<String>,
    pub entity_type: String,
    pub sector: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub head_name: Option<String>,
    pub head_title: Option<String>,
    pub head_email: Option<String>,
    pub head_phone: Option<String>,
    pub dpo_name: Option<String>,
    pub dpo_email: Option<String>,
    pub industry: Option<String>,
    pub description: Option<String>,
    pub employee_count: Option<i64>,
    pub npc_registration_number: Option<String>,
    pub registration_date: Option<String>,
    pub renewal_deadline: Option<String>,
    pub has_npc_seal: Option<bool>,
    pub asir_due_date: Option<String>,
    pub npc_notification_email: Option<String>,
    pub breach_notification_hours: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrivacyOfficer {
    pub id: String,
    pub org_id: String,
    pub name: String,
    pub title: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: String, // 'DPO' or 'COP'
    pub is_primary_dpo: bool,
    pub assigned_branch_dept: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePrivacyOfficerPayload {
    pub org_id: String,
    pub name: String,
    pub title: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: String,
    pub is_primary_dpo: bool,
    pub assigned_branch_dept: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePrivacyOfficerPayload {
    pub name: String,
    pub title: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: String,
    pub is_primary_dpo: bool,
    pub assigned_branch_dept: Option<String>,
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

fn get_assets_dir() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from("ph", "sanchez", "tanod") {
        let assets = proj_dirs.data_local_dir().join("assets");
        fs::create_dir_all(&assets).unwrap_or_default();
        assets
    } else {
        PathBuf::from("assets")
    }
}

/// Get primary organization with full statutory NPCRS metadata
#[tauri::command]
pub fn get_organization(state: State<'_, DbState>) -> Result<Organization, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, slug, logo_path, tin_number, entity_type, sector,
                    address, city, country, phone, email, website,
                    head_name, head_title, head_email, head_phone,
                    dpo_name, dpo_email, industry, description, employee_count,
                    npc_registration_number, registration_date, renewal_deadline, has_npc_seal, asir_due_date,
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
            tin_number: row.get(4)?,
            entity_type: row.get(5).unwrap_or_else(|_| "PIC".to_string()),
            sector: row.get(6)?,
            address: row.get(7)?,
            city: row.get(8)?,
            country: row.get(9)?,
            phone: row.get(10)?,
            email: row.get(11)?,
            website: row.get(12)?,
            head_name: row.get(13)?,
            head_title: row.get(14)?,
            head_email: row.get(15)?,
            head_phone: row.get(16)?,
            dpo_name: row.get(17)?,
            dpo_email: row.get(18)?,
            industry: row.get(19)?,
            description: row.get(20)?,
            employee_count: row.get(21)?,
            npc_registration_number: row.get(22)?,
            registration_date: row.get(23)?,
            renewal_deadline: row.get(24)?,
            has_npc_seal: row.get(25)?,
            asir_due_date: row.get(26)?,
            npc_notification_email: row.get(27)?,
            breach_notification_hours: row.get(28)?,
            created_at: row.get(29)?,
            updated_at: row.get(30)?,
        })
    });

    match org_result {
        Ok(org) => Ok(org),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            let id = Uuid::new_v4().to_string();
            let default_org = Organization {
                id: id.clone(),
                name: "Republic Health System".to_string(),
                slug: "republic-health".to_string(),
                logo_path: None,
                tin_number: Some("008-123-456-000".to_string()),
                entity_type: "PIC".to_string(),
                sector: Some("Private - Healthcare".to_string()),
                address: Some("100 Corporate Ave, Bonifacio Global City".to_string()),
                city: Some("Taguig".to_string()),
                country: Some("Philippines".to_string()),
                phone: Some("+63 2 8123 4567".to_string()),
                email: Some("privacy@republichealth.ph".to_string()),
                website: Some("https://republichealth.ph".to_string()),
                head_name: Some("Dr. Fernando Gomez, MD, FPCS".to_string()),
                head_title: Some("President & Chief Executive Officer".to_string()),
                head_email: Some("ceo@republichealth.ph".to_string()),
                head_phone: Some("+63 2 8123 4500".to_string()),
                dpo_name: Some("Atty. Maria Santos, CIPP/E".to_string()),
                dpo_email: Some("dpo@republichealth.ph".to_string()),
                industry: Some("Healthcare & Hospital Operations".to_string()),
                description: Some("Personal Information Controller (PIC) operating tertiary healthcare facilities and clinical laboratories.".to_string()),
                employee_count: Some(450),
                npc_registration_number: Some("PIC-REG-2024-009182".to_string()),
                registration_date: Some("2024-03-15".to_string()),
                renewal_deadline: Some("2027-03-15".to_string()),
                has_npc_seal: Some(true),
                asir_due_date: Some("2027-03-31".to_string()),
                npc_notification_email: Some("privacy.complaints@privacy.gov.ph".to_string()),
                breach_notification_hours: Some(72),
                created_at: None,
                updated_at: None,
            };

            conn.execute(
                "INSERT INTO organizations (
                    id, name, slug, logo_path, tin_number, entity_type, sector,
                    address, city, country, phone, email, website,
                    head_name, head_title, head_email, head_phone,
                    dpo_name, dpo_email, industry, description, employee_count,
                    npc_registration_number, registration_date, renewal_deadline, has_npc_seal, asir_due_date,
                    npc_notification_email, breach_notification_hours
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29)",
                params![
                    default_org.id,
                    default_org.name,
                    default_org.slug,
                    default_org.logo_path,
                    default_org.tin_number,
                    default_org.entity_type,
                    default_org.sector,
                    default_org.address,
                    default_org.city,
                    default_org.country,
                    default_org.phone,
                    default_org.email,
                    default_org.website,
                    default_org.head_name,
                    default_org.head_title,
                    default_org.head_email,
                    default_org.head_phone,
                    default_org.dpo_name,
                    default_org.dpo_email,
                    default_org.industry,
                    default_org.description,
                    default_org.employee_count,
                    default_org.npc_registration_number,
                    default_org.registration_date,
                    default_org.renewal_deadline,
                    default_org.has_npc_seal,
                    default_org.asir_due_date,
                    default_org.npc_notification_email,
                    default_org.breach_notification_hours,
                ],
            )
            .map_err(|e| e.to_string())?;

            // Seed primary DPO into privacy_officers table
            let dpo_officer_id = Uuid::new_v4().to_string();
            let _ = conn.execute(
                "INSERT INTO privacy_officers (
                    id, org_id, name, title, email, phone, role, is_primary_dpo, assigned_branch_dept
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    dpo_officer_id,
                    id,
                    "Atty. Maria Santos, CIPP/E",
                    "Data Protection Officer",
                    "dpo@republichealth.ph",
                    "+63 2 8123 4567",
                    "DPO",
                    1,
                    "Corporate Headquarters (Sole Regulatory Reporter)"
                ],
            );

            // Seed sample Compliance Officer for Privacy (COP)
            let cop_officer_id = Uuid::new_v4().to_string();
            let _ = conn.execute(
                "INSERT INTO privacy_officers (
                    id, org_id, name, title, email, phone, role, is_primary_dpo, assigned_branch_dept
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    cop_officer_id,
                    id,
                    "Engr. Carlos Mendoza",
                    "Compliance Officer for Privacy (COP)",
                    "carlos.mendoza@republichealth.ph",
                    "+63 2 8123 4588",
                    "COP",
                    0,
                    "IT Infrastructure & Server Farm"
                ],
            );

            // Seed baseline departments
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

/// Update organization metadata with NPCRS fields
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
            tin_number = ?4,
            entity_type = ?5,
            sector = ?6,
            address = ?7,
            city = ?8,
            country = ?9,
            phone = ?10,
            email = ?11,
            website = ?12,
            head_name = ?13,
            head_title = ?14,
            head_email = ?15,
            head_phone = ?16,
            dpo_name = ?17,
            dpo_email = ?18,
            industry = ?19,
            description = ?20,
            employee_count = ?21,
            npc_registration_number = ?22,
            registration_date = ?23,
            renewal_deadline = ?24,
            has_npc_seal = ?25,
            asir_due_date = ?26,
            npc_notification_email = ?27,
            breach_notification_hours = ?28,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?29",
        params![
            payload.name,
            payload.slug,
            payload.logo_path,
            payload.tin_number,
            payload.entity_type,
            payload.sector,
            payload.address,
            payload.city,
            payload.country,
            payload.phone,
            payload.email,
            payload.website,
            payload.head_name,
            payload.head_title,
            payload.head_email,
            payload.head_phone,
            payload.dpo_name,
            payload.dpo_email,
            payload.industry,
            payload.description,
            payload.employee_count,
            payload.npc_registration_number,
            payload.registration_date,
            payload.renewal_deadline,
            payload.has_npc_seal,
            payload.asir_due_date,
            payload.npc_notification_email,
            payload.breach_notification_hours,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    drop(conn);
    get_organization(state)
}

/// List Privacy Officers (DPO + COPs)
#[tauri::command]
pub fn list_privacy_officers(org_id: String, state: State<'_, DbState>) -> Result<Vec<PrivacyOfficer>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, org_id, name, title, email, phone, role, is_primary_dpo, assigned_branch_dept, created_at, updated_at
             FROM privacy_officers
             WHERE org_id = ?1
             ORDER BY is_primary_dpo DESC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![org_id], |row| {
            Ok(PrivacyOfficer {
                id: row.get(0)?,
                org_id: row.get(1)?,
                name: row.get(2)?,
                title: row.get(3)?,
                email: row.get(4)?,
                phone: row.get(5)?,
                role: row.get(6)?,
                is_primary_dpo: row.get(7)?,
                assigned_branch_dept: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

/// Create a new Privacy Officer (enforces single Primary DPO rule under NPC Circular 2022-04)
#[tauri::command]
pub fn create_privacy_officer(
    payload: CreatePrivacyOfficerPayload,
    state: State<'_, DbState>,
) -> Result<PrivacyOfficer, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    if payload.is_primary_dpo {
        // Demote any existing primary DPO to ensure strictly ONE primary DPO reporting to the NPC
        let _ = conn.execute(
            "UPDATE privacy_officers SET is_primary_dpo = 0 WHERE org_id = ?1",
            params![payload.org_id],
        );
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO privacy_officers (
            id, org_id, name, title, email, phone, role, is_primary_dpo, assigned_branch_dept
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id,
            payload.org_id,
            payload.name,
            payload.title,
            payload.email,
            payload.phone,
            payload.role,
            payload.is_primary_dpo,
            payload.assigned_branch_dept
        ],
    )
    .map_err(|e| e.to_string())?;

    // If this is set as primary DPO, also sync organization table dpo_name and dpo_email
    if payload.is_primary_dpo {
        let _ = conn.execute(
            "UPDATE organizations SET dpo_name = ?1, dpo_email = ?2 WHERE id = ?3",
            params![payload.name, payload.email, payload.org_id],
        );
    }

    Ok(PrivacyOfficer {
        id,
        org_id: payload.org_id,
        name: payload.name,
        title: payload.title,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        is_primary_dpo: payload.is_primary_dpo,
        assigned_branch_dept: payload.assigned_branch_dept,
        created_at: None,
        updated_at: None,
    })
}

/// Update Privacy Officer
#[tauri::command]
pub fn update_privacy_officer(
    id: String,
    payload: UpdatePrivacyOfficerPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let org_id: String = conn
        .query_row("SELECT org_id FROM privacy_officers WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if payload.is_primary_dpo {
        let _ = conn.execute(
            "UPDATE privacy_officers SET is_primary_dpo = 0 WHERE org_id = ?1 AND id != ?2",
            params![org_id, id],
        );
        let _ = conn.execute(
            "UPDATE organizations SET dpo_name = ?1, dpo_email = ?2 WHERE id = ?3",
            params![payload.name, payload.email, org_id],
        );
    }

    conn.execute(
        "UPDATE privacy_officers SET
            name = ?1, title = ?2, email = ?3, phone = ?4, role = ?5,
            is_primary_dpo = ?6, assigned_branch_dept = ?7, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?8",
        params![
            payload.name,
            payload.title,
            payload.email,
            payload.phone,
            payload.role,
            payload.is_primary_dpo,
            payload.assigned_branch_dept,
            id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete Privacy Officer (safeguard: cannot delete primary DPO if it's the only one)
#[tauri::command]
pub fn delete_privacy_officer(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let is_primary: bool = conn
        .query_row(
            "SELECT is_primary_dpo FROM privacy_officers WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if is_primary {
        return Err("Cannot delete the Primary DPO. Reassign another officer as Primary DPO first.".to_string());
    }

    conn.execute("DELETE FROM privacy_officers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

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

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE organizations SET logo_path = ?1, updated_at = CURRENT_TIMESTAMP",
        params![saved_path_str],
    )
    .map_err(|e| e.to_string())?;

    Ok(saved_path_str)
}

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
             WHERE d.org_id = ?1 OR ?1 = ''
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
