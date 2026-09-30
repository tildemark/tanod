use directories::ProjectDirs;
use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

/// Resolves the database file location in the OS local AppData directory (%APPDATA%\tanod\tanod.db on Windows).
pub fn get_db_path() -> PathBuf {
    if let Some(proj_dirs) = ProjectDirs::from("ph", "sanchez", "tanod") {
        let data_dir = proj_dirs.data_local_dir();
        fs::create_dir_all(data_dir).expect("Failed to create Tanod local app data directory");
        data_dir.join("tanod.db")
    } else {
        // Fallback to local directory if OS paths cannot be resolved
        PathBuf::from("tanod.db")
    }
}

/// Initializes SQLite connection, enables foreign keys and runs schema migrations.
pub fn init_db() -> Result<Connection> {
    let db_path = get_db_path();
    log::info!("Connecting to SQLite database at: {:?}", db_path);

    let conn = Connection::open(&db_path)?;

    // Enable foreign keys
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;"
    )?;

    run_migrations(&conn)?;

    Ok(conn)
}

/// Runs initial schema migrations creating all 7 statutory tables adhering strictly to NPC regulations.
fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        -- 1. Organizations (PIC/PIP Entity Profile)
        CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            logo_path TEXT,
            address TEXT,
            city TEXT,
            country TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            dpo_name TEXT,
            dpo_email TEXT,
            industry TEXT,
            description TEXT,
            employee_count INTEGER,
            npc_notification_email TEXT DEFAULT 'privacy.complaints@privacy.gov.ph',
            breach_notification_hours INTEGER DEFAULT 72,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Departments
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Processes (Records of Processing Activities - ROPA)
        CREATE TABLE IF NOT EXISTS processes (
            id TEXT PRIMARY KEY,
            dept_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            data_subjects TEXT NOT NULL DEFAULT '[]', -- JSON Array
            data_categories TEXT NOT NULL DEFAULT '[]', -- JSON Array
            lawful_basis TEXT NOT NULL DEFAULT '[]', -- JSON Array
            recipients TEXT NOT NULL DEFAULT '[]', -- JSON Array
            retention_period TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'REVIEW', 'APPROVED')),
            risk_level TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 4. Privacy Impact Assessments (Official NPC 4x4 Risk Matrix)
        CREATE TABLE IF NOT EXISTS pia_assessments (
            id TEXT PRIMARY KEY,
            process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
            threshold_answers TEXT NOT NULL DEFAULT '{}', -- JSON Object
            data_flow_details TEXT NOT NULL DEFAULT '{}', -- JSON Object
            privacy_principles_checklist TEXT NOT NULL DEFAULT '{}', -- JSON Object
            impact_score INTEGER NOT NULL CHECK(impact_score BETWEEN 1 AND 4),
            probability_score INTEGER NOT NULL CHECK(probability_score BETWEEN 1 AND 4),
            risk_rating INTEGER GENERATED ALWAYS AS (impact_score * probability_score) STORED,
            risk_level TEXT NOT NULL, -- 'NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH'
            mitigation_solutions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Security Incidents & Breaches (NPC Circular 16-03 72-Hour rule)
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            incident_date DATETIME NOT NULL,
            discovered_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            breach_timer_deadline DATETIME NOT NULL, -- discovered_date + 72 hours
            severity TEXT NOT NULL DEFAULT 'LOW' CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
            impacted_individuals INTEGER,
            systems_affected TEXT,
            description TEXT,
            measures_taken TEXT,
            is_notifiable_breach BOOLEAN NOT NULL DEFAULT 0,
            npc_notified BOOLEAN NOT NULL DEFAULT 0,
            npc_notification_date DATETIME,
            status TEXT NOT NULL DEFAULT 'REPORTED' CHECK(status IN ('REPORTED', 'ASSESSING', 'NOTIFYING', 'RESOLVED')),
            asir_reported BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 6. Data Subject Rights (DSR) Helpdesk & Kanban
        CREATE TABLE IF NOT EXISTS dsr_requests (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            request_type TEXT NOT NULL CHECK(request_type IN ('Access', 'Erasure', 'Rectification', 'Portability', 'Objection')),
            requester_name TEXT NOT NULL,
            requester_email TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED', 'UNDER_REVIEW', 'ACTIONED', 'REJECTED')),
            received_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            sla_deadline DATETIME NOT NULL, -- 30 working days from received_date
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 7. DPO Directives & Institutional Memos
        CREATE TABLE IF NOT EXISTS dpo_memos (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            memo_number TEXT UNIQUE NOT NULL, -- e.g. DPO-MEMO-2026-001
            title TEXT NOT NULL,
            pillar TEXT NOT NULL CHECK(pillar IN ('Organizational', 'Physical', 'Technical', 'Incident')),
            target_dept_id TEXT REFERENCES departments(id) ON DELETE SET NULL, -- NULL = Org-wide
            content TEXT NOT NULL,
            issued_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        "#
    )?;

    log::info!("Database schema migrations applied successfully.");
    Ok(())
}
