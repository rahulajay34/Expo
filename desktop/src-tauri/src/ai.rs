use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri::Emitter;

#[derive(Debug, Deserialize)]
pub struct AiRequest {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub stream: bool,
    pub stream_id: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct StreamEvent {
    pub stream_id: String,
    pub delta: String,
    pub done: bool,
    pub error: Option<String>,
}

fn build_openai_body(request: &AiRequest) -> serde_json::Value {
    let system_msg: Option<&ChatMessage> = request.messages.iter().find(|m| m.role == "system");
    let other_msgs: Vec<serde_json::Value> = request
        .messages
        .iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        })
        .collect();

    let mut messages = Vec::new();
    if let Some(sys) = system_msg {
        messages.push(serde_json::json!({
            "role": "system",
            "content": sys.content
        }));
    }
    messages.extend(other_msgs);

    serde_json::json!({
        "model": request.model,
        "messages": messages,
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(4096),
        "stream": request.stream
    })
}

fn build_anthropic_body(request: &AiRequest) -> serde_json::Value {
    let system_content: String = request
        .messages
        .iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.clone())
        .collect::<Vec<_>>()
        .join("\n");

    let messages: Vec<serde_json::Value> = request
        .messages
        .iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        })
        .collect();

    let mut body = serde_json::json!({
        "model": request.model,
        "messages": messages,
        "max_tokens": request.max_tokens.unwrap_or(4096),
        "temperature": request.temperature.unwrap_or(0.7),
        "stream": request.stream
    });

    if !system_content.is_empty() {
        body["system"] = serde_json::Value::String(system_content);
    }

    body
}

fn build_gemini_body(request: &AiRequest) -> serde_json::Value {
    let system_content: String = request
        .messages
        .iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.clone())
        .collect::<Vec<_>>()
        .join("\n");

    let contents: Vec<serde_json::Value> = request
        .messages
        .iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            let role = if m.role == "assistant" {
                "model"
            } else {
                "user"
            };
            serde_json::json!({
                "role": role,
                "parts": [{ "text": m.content }]
            })
        })
        .collect();

    let mut body = serde_json::json!({
        "contents": contents,
        "generationConfig": {
            "temperature": request.temperature.unwrap_or(0.7),
            "maxOutputTokens": request.max_tokens.unwrap_or(4096)
        }
    });

    if !system_content.is_empty() {
        body["systemInstruction"] = serde_json::json!({
            "parts": [{ "text": system_content }]
        });
    }

    body
}

fn get_url(provider: &str, model: &str, api_key: &str, stream: bool) -> String {
    match provider {
        "openai" => "https://api.openai.com/v1/chat/completions".to_string(),
        "xai" => "https://api.x.ai/v1/chat/completions".to_string(),
        "anthropic" => "https://api.anthropic.com/v1/messages".to_string(),
        "gemini" => {
            if stream {
                format!(
                    "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
                    model, api_key
                )
            } else {
                format!(
                    "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                    model, api_key
                )
            }
        }
        _ => String::new(),
    }
}

fn map_error(status: u16, provider: &str, model: &str, body_text: &str) -> String {
    match status {
        401 => format!("Invalid API key for {}", provider),
        429 => format!("Rate limited by {}. Wait and retry.", provider),
        404 => format!("Model {} not found on {}", model, provider),
        400 => {
            let msg = serde_json::from_str::<serde_json::Value>(body_text)
                .ok()
                .and_then(|v| {
                    v.get("error")
                        .and_then(|e| e.get("message"))
                        .and_then(|m| m.as_str())
                        .map(|s| s.to_string())
                })
                .unwrap_or_else(|| body_text.chars().take(300).collect());
            format!("Bad request to {}: {}", provider, msg)
        }
        500 | 502 | 503 => format!("{} server error. Try again later.", provider),
        _ => format!("{} returned status {}: {}", provider, status, &body_text[..body_text.len().min(300)]),
    }
}

fn extract_non_stream_content(provider: &str, body: &serde_json::Value) -> Result<String, String> {
    match provider {
        "openai" | "xai" => body
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("message"))
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Failed to parse response from API".to_string()),
        "anthropic" => body
            .get("content")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("text"))
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Failed to parse Anthropic response".to_string()),
        "gemini" => body
            .get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Failed to parse Gemini response".to_string()),
        _ => Err(format!("Unknown provider: {}", provider)),
    }
}

fn extract_stream_delta(provider: &str, data: &str) -> Option<String> {
    let parsed: serde_json::Value = serde_json::from_str(data).ok()?;

    match provider {
        "openai" | "xai" => parsed
            .get("choices")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("delta"))
            .and_then(|d| d.get("content"))
            .and_then(|c| c.as_str())
            .map(|s| s.to_string()),
        "anthropic" => {
            let event_type = parsed.get("type").and_then(|t| t.as_str()).unwrap_or("");
            match event_type {
                "content_block_delta" => parsed
                    .get("delta")
                    .and_then(|d| d.get("text"))
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string()),
                _ => None,
            }
        }
        "gemini" => parsed
            .get("candidates")
            .and_then(|c| c.get(0))
            .and_then(|c| c.get("content"))
            .and_then(|c| c.get("parts"))
            .and_then(|p| p.get(0))
            .and_then(|p| p.get("text"))
            .and_then(|t| t.as_str())
            .map(|s| s.to_string()),
        _ => None,
    }
}

fn is_stream_done(provider: &str, data: &str) -> bool {
    if data.trim() == "[DONE]" {
        return true;
    }
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
        match provider {
            "openai" | "xai" => {
                if let Some(choices) = parsed.get("choices").and_then(|c| c.as_array()) {
                    if let Some(choice) = choices.first() {
                        if let Some(reason) = choice.get("finish_reason").and_then(|r| r.as_str()) {
                            return reason == "stop" || reason == "end_turn";
                        }
                    }
                }
            }
            "anthropic" => {
                if let Some(t) = parsed.get("type").and_then(|t| t.as_str()) {
                    return t == "message_stop";
                }
            }
            "gemini" => {
                if let Some(candidates) = parsed.get("candidates").and_then(|c| c.as_array()) {
                    if let Some(candidate) = candidates.first() {
                        if let Some(reason) = candidate.get("finishReason").and_then(|r| r.as_str()) {
                            return reason == "STOP" || reason == "MAX_TOKENS";
                        }
                    }
                }
            }
            _ => {}
        }
    }
    false
}

#[tauri::command]
pub async fn ai_call(app: tauri::AppHandle, request: AiRequest) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = get_url(&request.provider, &request.model, &request.api_key, request.stream);
    if url.is_empty() {
        return Err(format!("Unknown provider: {}", request.provider));
    }

    let body = match request.provider.as_str() {
        "openai" | "xai" => build_openai_body(&request),
        "anthropic" => build_anthropic_body(&request),
        "gemini" => build_gemini_body(&request),
        _ => return Err(format!("Unknown provider: {}", request.provider)),
    };

    let mut req_builder = client.post(&url).header("Content-Type", "application/json");

    match request.provider.as_str() {
        "openai" => {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", request.api_key));
        }
        "xai" => {
            req_builder = req_builder.header("Authorization", format!("Bearer {}", request.api_key));
        }
        "anthropic" => {
            req_builder = req_builder
                .header("x-api-key", &request.api_key)
                .header("anthropic-version", "2023-06-01");
        }
        "gemini" => {
            // API key is in the URL query parameter
        }
        _ => {}
    }

    let response = req_builder
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Request to {} timed out.", request.provider)
            } else if e.is_connect() {
                format!("Cannot reach {}. Check your internet connection.", request.provider)
            } else {
                format!("Network error connecting to {}: {}", request.provider, e)
            }
        })?;

    let status = response.status().as_u16();

    if !request.stream {
        let body_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

        if status < 200 || status >= 300 {
            return Err(map_error(status, &request.provider, &request.model, &body_text));
        }

        let parsed: serde_json::Value = serde_json::from_str(&body_text)
            .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

        return extract_non_stream_content(&request.provider, &parsed);
    }

    // Streaming mode
    if status < 200 || status >= 300 {
        let body_text = response.text().await.unwrap_or_default();
        let error_msg = map_error(status, &request.provider, &request.model, &body_text);
        let _ = app.emit("ai-stream", StreamEvent {
            stream_id: request.stream_id.clone(),
            delta: String::new(),
            done: true,
            error: Some(error_msg.clone()),
        });
        return Err(error_msg);
    }

    let stream_id = request.stream_id.clone();
    let provider = request.provider.clone();

    let mut byte_stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = byte_stream.next().await {
        match chunk_result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                buffer.push_str(&text);

                // Process complete lines from buffer
                while let Some(newline_pos) = buffer.find('\n') {
                    let line = buffer[..newline_pos].trim().to_string();
                    buffer = buffer[newline_pos + 1..].to_string();

                    if line.is_empty() {
                        continue;
                    }

                    let data = if line.starts_with("data: ") {
                        line[6..].to_string()
                    } else if line.starts_with("data:") {
                        line[5..].trim().to_string()
                    } else {
                        // Skip non-data lines (event:, id:, retry:, etc.)
                        continue;
                    };

                    if is_stream_done(&provider, &data) {
                        let _ = app.emit("ai-stream", StreamEvent {
                            stream_id: stream_id.clone(),
                            delta: String::new(),
                            done: true,
                            error: None,
                        });
                        return Ok(String::new());
                    }

                    if let Some(delta) = extract_stream_delta(&provider, &data) {
                        if !delta.is_empty() {
                            let _ = app.emit("ai-stream", StreamEvent {
                                stream_id: stream_id.clone(),
                                delta,
                                done: false,
                                error: None,
                            });
                        }
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("Stream error from {}: {}", provider, e);
                let _ = app.emit("ai-stream", StreamEvent {
                    stream_id: stream_id.clone(),
                    delta: String::new(),
                    done: true,
                    error: Some(error_msg.clone()),
                });
                return Err(error_msg);
            }
        }
    }

    // Stream ended naturally
    let _ = app.emit("ai-stream", StreamEvent {
        stream_id: stream_id.clone(),
        delta: String::new(),
        done: true,
        error: None,
    });

    Ok(String::new())
}
