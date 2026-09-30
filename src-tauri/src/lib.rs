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
