#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![list_printers, print_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn list_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("lpstat")
            .arg("-p")
            .output()
            .map_err(|e| format!("Failed to run lpstat: {e}"))?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        // lpstat -p lines: "printer <name> ..."
        let printers = stdout
            .lines()
            .filter_map(|line| {
                let line = line.trim();
                if !line.starts_with("printer ") {
                    return None;
                }
                line.split_whitespace().nth(1).map(|s| s.to_string())
            })
            .collect::<Vec<_>>();
        return Ok(printers);
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Printer listing not implemented for this OS yet".to_string())
    }
}

#[tauri::command]
fn print_text(printer: Option<String>, paperWidthMm: Option<u32>, content: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let mut cmd = Command::new("lp");
        if let Some(p) = printer {
            if !p.trim().is_empty() {
                cmd.args(["-d", p.trim()]);
            }
        }

        if let Some(w) = paperWidthMm {
            if w > 0 {
                cmd.args(["-o", &format!("media=Custom.{}x297mm", w)]);
            }
        }
        // Send stdin to lp for silent printing
        let mut child = cmd
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn lp: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            use std::io::Write;
            stdin
                .write_all(content.as_bytes())
                .map_err(|e| format!("Failed to write print content: {e}"))?;
        }

        let out = child
            .wait_with_output()
            .map_err(|e| format!("Failed to wait for lp: {e}"))?;
        if !out.status.success() {
            let err = String::from_utf8_lossy(&out.stderr);
            return Err(format!("lp failed: {err}"));
        }
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = printer;
        let _ = paperWidthMm;
        let _ = content;
        Err("Silent printing not implemented for this OS yet".to_string())
    }
}
