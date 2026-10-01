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
        PathBuf::from("tanod.db")
    }
}

/// Initializes SQLite connection, enables foreign keys and runs schema migrations.
pub fn init_db() -> Result<Connection> {
    let db_path = get_db_path();
    log::info!("Connecting to SQLite database at: {:?}", db_path);

    let conn = Connection::open(&db_path)?;

    // Enable foreign keys and WAL mode
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;"
    )?;

    run_migrations(&conn)?;

    Ok(conn)
}

/// Runs initial schema migrations creating statutory tables strictly aligned with NPC Circular 2022-04 & RA 10173.
fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        -- 1. Organizations (PIC/PIP Entity Profile matching NPCRS requirements)
        CREATE TABLE IF NOT EXISTS organizations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            logo_path TEXT,
            tin_number TEXT,
            entity_type TEXT NOT NULL DEFAULT 'PIC' CHECK(entity_type IN ('PIC', 'PIP', 'BOTH')),
            sector TEXT DEFAULT 'Private', -- Government, Private: Healthcare, BPO, Financial, etc.
            address TEXT,
            city TEXT,
            country TEXT DEFAULT 'Philippines',
            phone TEXT,
            email TEXT,
            website TEXT,
            
            -- Head of Agency / Head of Organization (statutory sign-off)
            head_name TEXT,
            head_title TEXT,
            head_email TEXT,
            head_phone TEXT,
            
            -- Primary DPO
            dpo_name TEXT,
            dpo_email TEXT,
            industry TEXT,
            description TEXT,
            employee_count INTEGER,
            
            -- NPCRS Official Registration Credentials
            npc_registration_number TEXT,
            registration_date DATE,
            renewal_deadline DATE, -- Annual NPCRS renewal
            has_npc_seal BOOLEAN DEFAULT 0,
            
            -- ASIR & Breach settings
            asir_due_date DATE, -- Annual Security Incident Report (March 31)
            npc_notification_email TEXT DEFAULT 'privacy.complaints@privacy.gov.ph',
            breach_notification_hours INTEGER DEFAULT 72,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 1b. Privacy Officers (Designated Primary DPO + Multiple COPs under NPC Circular 2022-04)
        CREATE TABLE IF NOT EXISTS privacy_officers (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL CHECK(role IN ('DPO', 'COP')), -- Only 1 primary DPO allowed
            is_primary_dpo BOOLEAN NOT NULL DEFAULT 0,
            assigned_branch_dept TEXT,
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
            threshold_answers TEXT NOT NULL DEFAULT '{}',
            data_flow_details TEXT NOT NULL DEFAULT '{}',
            privacy_principles_checklist TEXT NOT NULL DEFAULT '{}',
            impact_score INTEGER NOT NULL CHECK(impact_score BETWEEN 1 AND 4),
            probability_score INTEGER NOT NULL CHECK(probability_score BETWEEN 1 AND 4),
            risk_rating INTEGER GENERATED ALWAYS AS (impact_score * probability_score) STORED,
            risk_level TEXT NOT NULL,
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
            memo_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            pillar TEXT NOT NULL CHECK(pillar IN ('Organizational', 'Physical', 'Technical', 'Incident')),
            target_dept_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            issued_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 8. Statutory Documents & Yearly Vault
        CREATE TABLE IF NOT EXISTS statutory_documents (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            category TEXT NOT NULL CHECK(category IN (
                'SEC_GIS',
                'SECRETARY_CERTIFICATE',
                'BOARD_RESOLUTION',
                'NOTARIZED_DPO_FORM',
                'NPC_REGISTRATION_CERT',
                'NPC_SEAL_OF_REGISTRATION',
                'DATA_SHARING_AGREEMENT',
                'OTHER_COMPLIANCE'
            )),
            title TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size_bytes INTEGER NOT NULL DEFAULT 0,
            mime_type TEXT,
            notes TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 9. Dedicated Tamper-Evident Hash-Chained Audit Trail (RA 10173 & NPC Circular 16-01 Sec. 25)
        CREATE TABLE IF NOT EXISTS system_audit_logs (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            action TEXT NOT NULL,          -- e.g. DSR_CREATED, DSR_ACTIONED, ROPA_UPDATED, INCIDENT_LOGGED
            entity_type TEXT NOT NULL,     -- 'DSR', 'ROPA', 'PIA', 'INCIDENT', 'VAULT', 'SYSTEM'
            entity_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            details TEXT NOT NULL DEFAULT '{}',
            prev_hash TEXT NOT NULL,
            entry_hash TEXT NOT NULL
        );

        -- 10. DSR Action / Resolution Historical Trail
        CREATE TABLE IF NOT EXISTS dsr_action_logs (
            id TEXT PRIMARY KEY,
            dsr_id TEXT NOT NULL REFERENCES dsr_requests(id) ON DELETE CASCADE,
            action_taken TEXT NOT NULL,       -- 'REDACTED', 'ERASED', 'EXTRACTED_PROVIDED', 'DENIED', 'NOTE_ADDED'
            action_details TEXT NOT NULL,     -- Description of what was done
            data_location TEXT,               -- Where data was stored / database / physical cabinet
            performed_by TEXT NOT NULL DEFAULT 'Data Protection Office',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- 11. Data Sharing & Outsourcing Agreements (DSA / DOA Registry) (RA 10173 Sec. 14 / NPC Circ 16-02 & 2020-03)
        CREATE TABLE IF NOT EXISTS data_sharing_agreements (
            id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            counterparty_name TEXT NOT NULL,
            agreement_type TEXT NOT NULL CHECK(agreement_type IN ('DATA_SHARING', 'OUTSOURCING_PIP', 'CROSS_BORDER', 'INTER_AGENCY')),
            description TEXT,
            data_categories TEXT NOT NULL,         -- JSON array or semicolon-separated text
            data_subjects TEXT,                   -- JSON array or text
            purpose TEXT NOT NULL,
            lawful_basis TEXT,
            effective_date DATE NOT NULL,
            expiration_date DATE NOT NULL,
            auto_renew BOOLEAN NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED')),
            pip_compliance_certified BOOLEAN NOT NULL DEFAULT 0,
            security_measures TEXT,
            vault_document_id TEXT REFERENCES statutory_documents(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        "#
    )?;

    // Safe column migrations in case table was created previously without new NPCRS & DSR fields
    let alter_statements = vec![
        "ALTER TABLE organizations ADD COLUMN tin_number TEXT;",
        "ALTER TABLE organizations ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'PIC';",
        "ALTER TABLE organizations ADD COLUMN sector TEXT DEFAULT 'Private';",
        "ALTER TABLE organizations ADD COLUMN head_name TEXT;",
        "ALTER TABLE organizations ADD COLUMN head_title TEXT;",
        "ALTER TABLE organizations ADD COLUMN head_email TEXT;",
        "ALTER TABLE organizations ADD COLUMN head_phone TEXT;",
        "ALTER TABLE organizations ADD COLUMN npc_registration_number TEXT;",
        "ALTER TABLE organizations ADD COLUMN registration_date DATE;",
        "ALTER TABLE organizations ADD COLUMN renewal_deadline DATE;",
        "ALTER TABLE organizations ADD COLUMN has_npc_seal BOOLEAN DEFAULT 0;",
        "ALTER TABLE organizations ADD COLUMN asir_due_date DATE;",
        // Enhanced DSR fields
        "ALTER TABLE dsr_requests ADD COLUMN requested_scope TEXT;",
        "ALTER TABLE dsr_requests ADD COLUMN action_taken TEXT;",
        "ALTER TABLE dsr_requests ADD COLUMN data_location TEXT;",
        "ALTER TABLE dsr_requests ADD COLUMN resolution_summary TEXT;",
        "ALTER TABLE dsr_requests ADD COLUMN resolved_date DATETIME;",
        // Enhanced Policies & DPO Directives Workflow (DRAFT, PROPOSED, APPROVED, ARCHIVED)
        "ALTER TABLE dpo_memos ADD COLUMN status TEXT NOT NULL DEFAULT 'APPROVED';",
        "ALTER TABLE dpo_memos ADD COLUMN policy_category TEXT NOT NULL DEFAULT 'POLICY';",
        "ALTER TABLE dpo_memos ADD COLUMN version TEXT NOT NULL DEFAULT '1.0';",
        "ALTER TABLE dpo_memos ADD COLUMN effective_date DATE;",
        "ALTER TABLE dpo_memos ADD COLUMN review_date DATE;",
        "ALTER TABLE dpo_memos ADD COLUMN approved_by TEXT;",
    ];

    for stmt in alter_statements {
        let _ = conn.execute(stmt, []);
    }

    log::info!("Database schema migrations applied successfully with NPCRS compliance and tamper-evident audit additions.");
    Ok(())
}
