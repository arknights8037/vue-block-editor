#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct EndpointResponse {
    status: u16,
    body: String,
    content_type: String,
    session_id: Option<String>,
}

// Read-only native transport for desktop endpoints. Do not follow redirects with credentials.
#[tauri::command]
async fn read_endpoint(url: String, authorization: Option<String>) -> Result<EndpointResponse, String> {
    endpoint_request(url, authorization, None, None, None).await
}

// Only the admin MCP operations used by this editor can use native POST transport.
#[tauri::command]
async fn admin_endpoint(url: String, authorization: Option<String>, body: String,
    session_id: Option<String>, protocol: Option<String>) -> Result<EndpointResponse, String> {
    let message: serde_json::Value = serde_json::from_str(&body).map_err(|_| "管理员请求不是有效的 JSON")?;
    let method = message["method"].as_str().unwrap_or("");
    if !matches!(method, "initialize" | "notifications/initialized" | "tools/list" | "tools/call") {
        return Err("不支持的管理员操作".into());
    }
    if method == "tools/call" && !matches!(message["params"]["name"].as_str(), Some("update_wiki_article" | "update_lesson")) {
        return Err("不支持的管理员编辑工具".into());
    }
    let parsed = reqwest::Url::parse(&url).map_err(|_| "管理员地址无效")?;
    if !matches!(parsed.path(), "/mcp/admin" | "/mcp/admin/") || authorization.as_deref().unwrap_or("").is_empty() {
        return Err("管理员编辑需要 /mcp/admin 地址和认证凭证".into());
    }
    endpoint_request(url, authorization, Some(body), session_id, protocol).await
}

// OpenAI-compatible model transport for the in-app Agent. The model endpoint
// is supplied by the user in the demo settings; redirects are disabled so an
// Authorization header cannot be forwarded to another host.
#[tauri::command]
async fn agent_completion(url: String, authorization: Option<String>, body: String) -> Result<EndpointResponse, String> {
    let message: serde_json::Value = serde_json::from_str(&body).map_err(|_| "模型请求不是有效的 JSON")?;
    if message["stream"] != false || !message["messages"].is_array() || !message["tools"].is_array() {
        return Err("模型请求格式不受支持".into());
    }
    endpoint_request(url, authorization, Some(body), None, None).await
}

async fn endpoint_request(url: String, authorization: Option<String>, body: Option<String>,
    session_id: Option<String>, protocol: Option<String>) -> Result<EndpointResponse, String> {
    let url = reqwest::Url::parse(&url).map_err(|_| "端点地址无效")?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none()
        || !url.username().is_empty() || url.password().is_some() {
        return Err("端点地址必须为不含凭证的 HTTP 或 HTTPS URL".into());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(30))
        .build().map_err(|_| "无法初始化端点连接")?;
    let mut request = if let Some(body) = body {
        let mut post = client.post(url).header("Accept", "application/json, text/event-stream")
            .header("Content-Type", "application/json").body(body);
        if let Some(value) = session_id { post = post.header("Mcp-Session-Id", value); }
        if let Some(value) = protocol { post = post.header("MCP-Protocol-Version", value); }
        post
    } else { client.get(url).header("Accept", "application/json") };
    if let Some(value) = authorization { request = request.header("Authorization", value); }
    let mut response = request.send().await.map_err(|_| "无法连接端点，请检查服务地址和网络")?;
    let status = response.status().as_u16();
    let content_type = response.headers().get("Content-Type").and_then(|v| v.to_str().ok()).unwrap_or("application/json").to_string();
    let session_id = response.headers().get("Mcp-Session-Id").and_then(|v| v.to_str().ok()).map(str::to_string);
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "端点响应读取失败")? {
        if bytes.len() + chunk.len() > 16 * 1024 * 1024 { return Err("端点响应超过 16 MB".into()); }
        bytes.extend_from_slice(&chunk);
    }
    let body = String::from_utf8(bytes).map_err(|_| "端点响应不是 UTF-8 文本")?;
    Ok(EndpointResponse { status, body, content_type, session_id })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_endpoint, admin_endpoint, agent_completion])
        .run(tauri::generate_context!())
        .expect("error while running Vue Block Editor desktop shell");
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};

    async fn rpc(method: &str, params: Value, session: Option<String>, id: Option<u32>) -> EndpointResponse {
        let mut message = json!({"jsonrpc":"2.0", "method":method, "params":params});
        if let Some(id) = id { message["id"] = json!(id); }
        admin_endpoint("http://127.0.0.1:8001/mcp/admin".into(), Some("Bearer editor-isolated-test-token".into()), message.to_string(), session, Some("2025-11-25".into())).await.unwrap()
    }
    fn result(response: &EndpointResponse) -> Value {
        assert_eq!(response.status, 200, "{}", response.body);
        let message: Value = if response.content_type.contains("text/event-stream") {
            response.body.lines().filter_map(|line| line.strip_prefix("data: "))
                .filter_map(|data| serde_json::from_str::<Value>(data).ok())
                .find(|message| message.get("id").is_some()).expect("MCP response")
        } else { serde_json::from_str(&response.body).unwrap() };
        assert!(message.get("error").is_none(), "{message}");
        message["result"].clone()
    }

    #[test]
    fn rejects_unrelated_native_write_tools() {
        tauri::async_runtime::block_on(async {
            let error = admin_endpoint("http://127.0.0.1:8001/mcp/admin".into(), Some("Bearer test".into()),
                json!({"method":"tools/call", "params":{"name":"delete_wiki_article"}}).to_string(), None, None).await.err().unwrap();
            assert!(error.contains("不支持"));
        });
    }

    #[test]
    #[ignore = "requires .codex_tmp/serve_admin_test.py on port 8001; writes only to the isolated test DB"]
    fn native_admin_writes_round_trip() {
        tauri::async_runtime::block_on(async {
            let denied = admin_endpoint("http://127.0.0.1:8001/mcp/admin".into(), Some("Bearer invalid".into()),
                json!({"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"native-test","version":"1"}}}).to_string(), None, None).await.unwrap();
            assert_eq!(denied.status, 401);
            let initialized = rpc("initialize", json!({"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"native-test","version":"1"}}), None, Some(1)).await;
            result(&initialized);
            let session = initialized.session_id.clone();
            assert_eq!(rpc("notifications/initialized", json!({}), session.clone(), None).await.status, 202);
            let tools = result(&rpc("tools/list", json!({}), session.clone(), Some(2)).await);
            assert!(tools["tools"].as_array().unwrap().iter().any(|tool| tool["name"] == "update_wiki_article"));
            let wiki: Value = serde_json::from_str(&read_endpoint("http://127.0.0.1:8001/api/v1/wiki/git".into(), None).await.unwrap().body).unwrap();
            let courses: Value = serde_json::from_str(&read_endpoint("http://127.0.0.1:8001/api/v1/courses".into(), None).await.unwrap().body).unwrap();
            let lesson = &courses[0]["lessons"][0];
            let marker = "桌面原生保存验证：管理员修改正文，保留加粗格式并同时保存 Markdown 与 JSON。";
            let doc = json!({"type":"doc", "content":[{"type":"paragraph","content":[{"type":"text","text":marker,"marks":[{"type":"bold"}]}]}]});
            for (name, slug) in [("update_wiki_article", wiki["slug"].as_str().unwrap()), ("update_lesson", lesson["slug"].as_str().unwrap())] {
                let saved = result(&rpc("tools/call", json!({"name":name,"arguments":{"slug":slug,"body_markdown":format!("**{marker}**"),"content_json":doc.to_string()}}), session.clone(), Some(3)).await);
                assert!(saved.get("isError") != Some(&json!(true)), "{saved}");
            }
            let wiki_after: Value = serde_json::from_str(&read_endpoint("http://127.0.0.1:8001/api/v1/wiki/git".into(), None).await.unwrap().body).unwrap();
            let courses_after: Value = serde_json::from_str(&read_endpoint("http://127.0.0.1:8001/api/v1/courses".into(), None).await.unwrap().body).unwrap();
            for (before, after) in [(&wiki, &wiki_after), (lesson, &courses_after[0]["lessons"][0])] {
                assert_eq!(before["title"], after["title"]);
                assert!(after["body_markdown"].as_str().unwrap().contains(marker));
                let stored: Value = serde_json::from_str(after["content_json"].as_str().unwrap()).unwrap();
                assert_eq!(stored["content"], doc["content"]);
            }
            assert_eq!(courses[0]["lessons"][1], courses_after[0]["lessons"][1]);
        });
    }
}
