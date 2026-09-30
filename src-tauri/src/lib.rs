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
