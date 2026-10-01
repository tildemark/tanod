pub mod commands;
pub mod db;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let conn = db::init_db().expect("Failed to initialize SQLite database");

    tauri::Builder::default()
        .manage(db::DbState {
            conn: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            // Organization & Settings
            commands::admin::get_organization,
            commands::admin::update_organization,
            commands::admin::save_org_logo,
            commands::admin::list_departments,
            commands::admin::create_department,
            commands::admin::update_department,
            commands::admin::delete_department,
            // Privacy Officers
            commands::admin::list_privacy_officers,
            commands::admin::create_privacy_officer,
            commands::admin::update_privacy_officer,
            commands::admin::delete_privacy_officer,
            // ROPA Processes
            commands::ropa::list_processes,
            commands::ropa::get_process_by_id,
            commands::ropa::create_process,
            commands::ropa::update_process,
            commands::ropa::delete_process,
            // PIA Assessments
            commands::pia::list_pia_assessments,
            commands::pia::get_pia_by_process_id,
            commands::pia::save_pia_assessment,
            commands::pia::delete_pia_assessment,
            // Incidents & 72-Hour Timer
            commands::enforcement::list_incidents,
            commands::enforcement::create_incident,
            commands::enforcement::update_incident,
            commands::enforcement::delete_incident,
            // Data Subject Rights (DSR) Kanban & Action Logs
            commands::enforcement::list_dsr_requests,
            commands::enforcement::create_dsr_request,
            commands::enforcement::update_dsr_status,
            commands::enforcement::resolve_dsr_request,
            commands::enforcement::list_dsr_action_logs,
            commands::enforcement::delete_dsr_request,
            // Dedicated Immutable Tamper-Evident Audit Trail
            commands::audit::list_system_audit_logs,
            commands::audit::verify_audit_trail_integrity,
            // DPO Directives & Institutional Memos
            commands::enforcement::list_dpo_memos,
            commands::enforcement::create_dpo_memo,
            commands::enforcement::update_dpo_memo,
            commands::enforcement::delete_dpo_memo,
            // Statutory Document Vault
            commands::vault::list_statutory_documents,
            commands::vault::upload_statutory_document,
            commands::vault::open_statutory_document,
            commands::vault::open_vault_folder,
            commands::vault::delete_statutory_document,
            // Data Sharing & Outsourcing Agreements (DSA/DOA)
            commands::dsa::list_data_sharing_agreements,
            commands::dsa::create_data_sharing_agreement,
            commands::dsa::update_data_sharing_agreement,
            commands::dsa::delete_data_sharing_agreement,
            // Disaster Recovery & Clean PC Restoration
            commands::backup::export_backup_archive,
            commands::backup::inspect_backup_archive,
            commands::backup::restore_backup_archive,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            log::info!("TANOD Desktop initialized with local SQLite storage at: {:?}", db::get_db_path());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
