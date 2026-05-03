use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

/// RUC data structure matching PeruAPI.com response
#[derive(Debug, Serialize, Deserialize)]
pub struct RucData {
    pub ruc: String,
    pub razon_social: String,
    pub estado: String,
    pub condicion: String,
    pub direccion: String,
    #[serde(default)]
    pub ubigeo: String,
    #[serde(default)]
    pub code: String,
    #[serde(default)]
    pub mensaje: String,
}

/// DNI data structure matching PeruAPI.com response
#[derive(Debug, Serialize, Deserialize)]
pub struct DniData {
    pub dni: String,
    pub cliente: String, // El API devuelve "cliente"
    #[serde(default)]
    pub nombres: String,
    #[serde(default)]
    pub apellido_paterno: String,
    #[serde(default)]
    pub apellido_materno: String,
    #[serde(default)]
    pub code: String,
    #[serde(default)]
    pub mensaje: String,
}

#[derive(Debug)]
pub enum ApiPeruError {
    InvalidDocument,
    NetworkError(String),
    ApiError(String),
    NotFound,
    MissingApiKey,
}

impl std::fmt::Display for ApiPeruError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ApiPeruError::InvalidDocument => write!(f, "Documento inválido"),
            ApiPeruError::NetworkError(msg) => write!(f, "Error de red: {}", msg),
            ApiPeruError::ApiError(msg) => write!(f, "Error de API: {}", msg),
            ApiPeruError::NotFound => write!(f, "Documento no encontrado"),
            ApiPeruError::MissingApiKey => write!(f, "API Key no configurada. Configure su API Key en Configuración."),
        }
    }
}

impl std::error::Error for ApiPeruError {}

/// Validates if a RUC is structurally valid (11 digits)
fn validate_ruc(ruc: &str) -> Result<(), ApiPeruError> {
    if ruc.len() != 11 {
        return Err(ApiPeruError::InvalidDocument);
    }
    if !ruc.chars().all(|c| c.is_numeric()) {
        return Err(ApiPeruError::InvalidDocument);
    }
    Ok(())
}

/// Validates if a DNI is structurally valid (8 digits)
fn validate_dni(dni: &str) -> Result<(), ApiPeruError> {
    if dni.len() != 8 {
        return Err(ApiPeruError::InvalidDocument);
    }
    if !dni.chars().all(|c| c.is_numeric()) {
        return Err(ApiPeruError::InvalidDocument);
    }
    Ok(())
}

/// Fetches RUC data from peruapi.com
pub fn lookup_ruc(ruc: &str, api_key: &str) -> Result<RucData, ApiPeruError> {
    // Validate RUC format
    validate_ruc(ruc)?;

    // Check if API key is provided
    if api_key.is_empty() {
        return Err(ApiPeruError::MissingApiKey);
    }

    // Create HTTP client
    let client = Client::builder()
        .build()
        .map_err(|e| ApiPeruError::NetworkError(e.to_string()))?;

    // Make GET request to peruapi.com with api_token query parameter
    let url = format!("https://peruapi.com/api/ruc/{}?api_token={}", ruc, api_key);

    let response = client
        .get(&url)
        .send()
        .map_err(|e| ApiPeruError::NetworkError(e.to_string()))?;

    // Check if request was successful
    let status = response.status();

    // Get response text first for debugging
    let response_text = response
        .text()
        .map_err(|e| ApiPeruError::NetworkError(format!("Error al leer respuesta: {}", e)))?;

    if !status.is_success() {
        if status.as_u16() == 404 {
            return Err(ApiPeruError::NotFound);
        }
        return Err(ApiPeruError::ApiError(format!(
            "Error HTTP {}: {}",
            status.as_u16(),
            response_text
        )));
    }

    // Parse JSON response
    let ruc_data: RucData = serde_json::from_str(&response_text)
        .map_err(|e| ApiPeruError::ApiError(format!("Error al parsear JSON: {}. Response: {}", e, response_text)))?;

    // Check if API returned an error code
    if !ruc_data.code.is_empty() && ruc_data.code != "200" {
        return Err(ApiPeruError::ApiError(format!(
            "API Error {}: {}",
            ruc_data.code,
            ruc_data.mensaje
        )));
    }

    Ok(ruc_data)
}

/// Fetches DNI data from peruapi.com
pub fn lookup_dni(dni: &str, api_key: &str) -> Result<DniData, ApiPeruError> {
    // Validate DNI format
    validate_dni(dni)?;

    // Check if API key is provided
    if api_key.is_empty() {
        return Err(ApiPeruError::MissingApiKey);
    }

    // Create HTTP client
    let client = Client::builder()
        .build()
        .map_err(|e| ApiPeruError::NetworkError(e.to_string()))?;

    // Make GET request to peruapi.com with api_token query parameter
    let url = format!("https://peruapi.com/api/dni/{}?api_token={}", dni, api_key);

    let response = client
        .get(&url)
        .send()
        .map_err(|e| ApiPeruError::NetworkError(e.to_string()))?;

    // Check if request was successful
    let status = response.status();

    // Get response text first for debugging
    let response_text = response
        .text()
        .map_err(|e| ApiPeruError::NetworkError(format!("Error al leer respuesta: {}", e)))?;

    if !status.is_success() {
        if status.as_u16() == 404 {
            return Err(ApiPeruError::NotFound);
        }
        return Err(ApiPeruError::ApiError(format!(
            "Error HTTP {}: {}",
            status.as_u16(),
            response_text
        )));
    }

    // Parse JSON response
    let dni_data: DniData = serde_json::from_str(&response_text)
        .map_err(|e| ApiPeruError::ApiError(format!("Error al parsear JSON: {}. Response: {}", e, response_text)))?;

    // Check if API returned an error code
    if !dni_data.code.is_empty() && dni_data.code != "200" {
        return Err(ApiPeruError::ApiError(format!(
            "API Error {}: {}",
            dni_data.code,
            dni_data.mensaje
        )));
    }

    Ok(dni_data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_ruc() {
        assert!(validate_ruc("20498053573").is_ok());
        assert!(validate_ruc("123").is_err());
        assert!(validate_ruc("abcdefghijk").is_err());
        assert!(validate_ruc("2049805357A").is_err());
    }

    #[test]
    fn test_validate_dni() {
        assert!(validate_dni("12345678").is_ok());
        assert!(validate_dni("123").is_err());
        assert!(validate_dni("abcdefgh").is_err());
        assert!(validate_dni("1234567A").is_err());
    }
}
