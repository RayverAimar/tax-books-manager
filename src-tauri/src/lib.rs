mod api_peru;

use api_peru::{lookup_dni, lookup_ruc, DniData, RucData};

/// Tauri command to lookup RUC data from peruapi.com
/// Requires API key as a mandatory parameter - no fallback
#[tauri::command]
fn query_ruc(ruc: String, api_key: String) -> Result<RucData, String> {
    lookup_ruc(&ruc, &api_key).map_err(|e| e.to_string())
}

/// Tauri command to lookup DNI data from peruapi.com
/// Requires API key as a mandatory parameter - no fallback
#[tauri::command]
fn query_dni(dni: String, api_key: String) -> Result<DniData, String> {
    lookup_dni(&dni, &api_key).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            query_ruc,
            query_dni
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
