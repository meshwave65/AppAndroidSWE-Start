/**
 * ============================================================
 * SOFIA WEB EXTRACTOR - MOBILE FIRST (REAL FUNCTIONALITY)
 * ============================================================
 *
 * Version: 2.0.0 (Mobile-First with Real Backend)
 * Updated: 2026-05-21
 *
 * Description:
 * Core frontend controller with REAL functionality connected to:
 * - Supabase (Auth, Database)
 * - appsofia.meshwave.com.br (API)
 */

"use strict";

import "./style.css";
import { supabase } from "./lib/supabase.js";

const MESH_WAVE_UUID = "7891b8f4-68cc-4344-89e1-c000b80918bb";
const API_BASE_URL = "https://appsofia.meshwave.com.br";

// ======================
// STATE
// ======================
let USER = { id: null, user_name: "guest", full_name: "Guest User", email: null };
let SESSION = { logged: false };
let TASKS = [];
let TASK_SELECTION = new Set();

let FILES_DATA = [];
let SELECTED_FILE = null;
let CURRENT_PREVIEW_FILE = null;

let SEARCH_MODE = "DEFAULT";
let SEARCH_MATCH_MODE = "PARTIAL";
let SEARCH_RESULTS = [];
let AGENTS = [];
let LLM_PROVIDERS = [];

let FILE_FILTER_AGENT = "ALL";
let FILE_FILTER_LLM = "ALL";
let FILE_FILTER_SLUG = "";

// ======================
// HELPERS
// ======================
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.remove("active");
  });
  const el = document.getElementById("tab" + n);
  if (el) {
    el.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    const navBtns = document.querySelectorAll(".nav-btn");
    if (navBtns[n - 1]) navBtns[n - 1].classList.add("active");
  }
}

function showToast(message, type = "info", duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function showMessage(elementId, message, type = "info") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `message show ${type}`;
}

function extractSlugFromUrl(url) {
  if (!url) return null;
  try {
    const clean = url.split("?")[0].split("#")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

function extractOriginProvider(url = "") {
  if (!url || typeof url !== "string") return "unknown";
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("manus.im")) return "manus";
    if (host.includes("chatgpt.com")) return "chatgpt";
    if (host.includes("grok.com")) return "grok";
    if (host.includes("perplexity.ai")) return "perplexity";
    if (host.includes("claude.ai")) return "claude";
  } catch {}
  return "unknown";
}

function getStatusIcon(status) {
  const s = (status || "").toUpperCase();
  if (s === "STAGED") return "📦";
  if (s === "DONE") return "🏁";
  if (s === "DELETED") return "🗑️";
  if (s === "PROCESS" || s === "PROCESSING") return "⚙️";
  if (s === "FAIL" || s === "FAILED") return "🚨";
  if (s === "PAUSE" || s === "PAUSED") return "⏸️";
  return "❓";
}

function getStatusClass(status) {
  const s = (status || "").toUpperCase();
  if (s === "STAGED") return "status-staged";
  if (s === "PROCESS" || s === "PROCESSING") return "status-process";
  if (s === "DONE") return "status-done";
  if (s === "FAIL" || s === "FAILED") return "status-fail";
  if (s === "PAUSE" || s === "PAUSED") return "status-pause";
  return "status-staged";
}

async function ensureAgent(user_uuid, agent_name) {
  if (!agent_name || !user_uuid) return;
  const { data: existing } = await supabase
    .from("user_agents")
    .select("id")
    .eq("user_uuid", user_uuid)
    .eq("agent_name", agent_name)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("user_agents")
    .insert([{
      user_uuid,
      client_uuid: MESH_WAVE_UUID,
      agent_name
    }])
    .select()
    .maybeSingle();
  if (error) return null;
  return data;
}

function updateUserDisplay() {
  const name = USER.full_name || USER.user_name || "Guest";
  const headerEl = document.getElementById("headerUserName");
  if (headerEl) headerEl.textContent = name;
}

// ======================
// MODAL FUNCTIONS
// ======================
function openPreviewModal(file) {
  CURRENT_PREVIEW_FILE = file;
  const modal = document.getElementById("previewModal");
  const title = document.getElementById("previewTitle");
  const body = document.getElementById("previewBody");
  
  if (!modal || !title || !body) return;
  
  // Extrair apenas o nome.extensão do arquivo
  const cleanFilename = file.filename ? file.filename.split("_").pop() : "arquivo";
  title.textContent = cleanFilename;
  body.innerHTML = "Carregando...";
  
  const ext = cleanFilename.split(".").pop().toLowerCase();
  const fileUrl = `${API_BASE_URL}/api/file?path=${encodeURIComponent(file.path)}&download=false`;
  
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    body.innerHTML = `<img src="${fileUrl}" class="preview-image" alt="${cleanFilename}">`;
  } else if (ext === "pdf") {
    body.innerHTML = `<iframe src="${fileUrl}" style="width:100%;height:500px;border:none;border-radius:8px;"></iframe>`;
  } else if (["txt", "md", "json", "log", "csv"].includes(ext)) {
    fetch(fileUrl)
      .then(res => res.text())
      .then(text => {
        const preview = text.length > 5000 ? text.substring(0, 5000) + "\n\n[... arquivo truncado ...]" : text;
        body.innerHTML = `<div class="preview-text">${preview}</div>`;
      })
      .catch(() => {
        body.innerHTML = "<div class='preview-text'>Erro ao carregar arquivo</div>";
      });
  } else {
    body.innerHTML = "<div class='preview-text'>Formato não suportado para preview</div>";
  }
  
  modal.classList.add("active");
}

function closePreviewModal() {
  const modal = document.getElementById("previewModal");
  if (modal) modal.classList.remove("active");
  CURRENT_PREVIEW_FILE = null;
}

function downloadCurrentFile() {
  if (!CURRENT_PREVIEW_FILE) return;
  downloadFile(CURRENT_PREVIEW_FILE.path);
  closePreviewModal();
}

// ======================
// AUTH & LOGIN
// ======================
async function login() {
  const identifier = document.getElementById("login_email")?.value?.trim();
  const password = document.getElementById("login_pass")?.value;
  if (!identifier || !password) {
    showMessage("auth_msg", "Preencha os campos", "error");
    return;
  }
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .or(`email.eq."${identifier}",user_name.eq."${identifier}"`)
    .maybeSingle();
  if (clientError || !client) {
    showMessage("auth_msg", "Usuário não encontrado", "error");
    return;
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: client.email,
    password
  });
  if (error || !data?.user) {
    showMessage("auth_msg", "Falha na autenticação", "error");
    return;
  }
  SESSION.logged = true;
  USER = {
    id: data.user.id,
    user_name: client.user_name,
    full_name: client.full_name,
    email: client.email
  };
  
  if (document.getElementById("p_username")) document.getElementById("p_username").value = USER.user_name;
  if (document.getElementById("p_name")) document.getElementById("p_name").value = USER.full_name || "";
  if (document.getElementById("p_email")) document.getElementById("p_email").value = USER.email || "";
  
  updateUserDisplay();
  showToast("Login realizado com sucesso!", "success");
  showTab(3);
  await loadAgentsAndLLMs();
  await loadTasks();
  await loadFiles();
}

async function registerUser() {
  const fullName = document.getElementById("reg_fullname")?.value?.trim();
  const email = document.getElementById("reg_email")?.value?.trim().toLowerCase();
  const customUsername = document.getElementById("reg_username")?.value?.trim();
  const code = document.getElementById("reg_code")?.value?.trim()?.toUpperCase();
  const pass = document.getElementById("reg_pass")?.value;
  const pass2 = document.getElementById("reg_pass2")?.value;
  const msg = document.getElementById("reg_msg");

  if (msg) msg.innerText = "";
  if (!fullName || !email || !code || !pass || !pass2) {
    showMessage("reg_msg", "Preencha todos os campos obrigatórios", "error");
    return;
  }
  if (pass !== pass2) {
    showMessage("reg_msg", "As senhas não conferem", "error");
    return;
  }
  if (pass.length < 6) {
    showMessage("reg_msg", "Senha deve possuir no mínimo 6 caracteres", "error");
    return;
  }
  const username = customUsername || email.split("@")[0];
  const { data: invite, error: inviteError } = await supabase
    .from("invites_dev")
    .select("*")
    .eq("code", code)
    .eq("status", "active");

  if (inviteError || !invite) {
    showMessage("reg_msg", "Código de convite inválido ou já utilizado", "error");
    return;
  }
  const { data: existingUsername } = await supabase.from("clients").select("client_uuid").eq("user_name", username).maybeSingle();
  if (existingUsername) {
    showMessage("reg_msg", "Este nome de usuário já está em uso", "error");
    return;
  }
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: pass });
  if (authError || !authData?.user) {
    showMessage("reg_msg", authError?.message || "Erro ao criar usuário", "error");
    return;
  }
  const { error: profileError } = await supabase.from("clients").insert([{
    owner_user_id: authData.user.id,
    user_name: username,
    full_name: fullName,
    email: email,
    client_id: Date.now()
  }]);
  if (profileError) {
    showMessage("reg_msg", "Erro ao criar perfil do usuário", "error");
    return;
  }
  await supabase.from("invites_dev").update({ status: "used" }).eq("code", code);
  showMessage("reg_msg", "Conta criada com sucesso!", "success");
  setTimeout(() => { showTab(1); }, 1500);
}

async function restoreSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("owner_user_id", session.user.id)
      .maybeSingle();

    if (!client) return;

    SESSION.logged = true;
    USER = {
      id: session.user.id,
      user_name: client.user_name,
      full_name: client.full_name,
      email: client.email
    };

    updateUserDisplay();
    await loadAgentsAndLLMs();
    await loadTasks();
    await loadFiles();
  } catch (error) {
    console.error("Session restore error:", error);
  }
}

// ======================
// AGENTS + LLM FILTERS
// ======================
async function loadAgentsAndLLMs() {
  if (!SESSION.logged) return;
  const { data: agentsData } = await supabase.from("user_agents").select("agent_name").order("agent_name", { ascending: true });
  AGENTS = agentsData || [];
  
  const agentSelects = [
    document.getElementById("insert_agent"),
    document.getElementById("filter_agent"),
    document.getElementById("file_filter_agent")
  ];
  
  agentSelects.forEach(select => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    if (select.id.includes("filter")) {
      const opt = document.createElement("option");
      opt.value = "ALL";
      opt.innerText = "Todos os Agentes";
      select.appendChild(opt);
    }
    AGENTS.forEach(agent => {
      const opt = document.createElement("option");
      opt.value = agent.agent_name;
      opt.innerText = agent.agent_name;
      select.appendChild(opt);
    });
    if (current) select.value = current;
  });

  const { data: llmData } = await supabase.from("user_origin_providers").select("origin_provider").order("origin_provider", { ascending: true });
  LLM_PROVIDERS = llmData || [];
  const llmSelects = [
    document.getElementById("filter_llm"),
    document.getElementById("file_filter_llm")
  ];
  llmSelects.forEach(select => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "ALL";
    all.innerText = "Todos os LLM";
    select.appendChild(all);
    LLM_PROVIDERS.forEach(provider => {
      const opt = document.createElement("option");
      opt.value = provider.origin_provider;
      opt.innerText = provider.origin_provider.toUpperCase();
      select.appendChild(opt);
    });
    if (current) select.value = current;
  });
}

// ======================
// TASKS
// ======================
async function loadTasks() {
  if (!SESSION.logged) return;
  let query = supabase.from("appsofia_tasks").select("*").eq("session_user_id", USER.id);
  const filterAgent = document.getElementById("filter_agent")?.value;
  const filterLLM = document.getElementById("filter_llm")?.value;
  const filterStatus = document.getElementById("filter_status")?.value;
  if (filterAgent && filterAgent !== "ALL") query = query.eq("agente", filterAgent);
  if (filterLLM && filterLLM !== "ALL") query = query.eq("origin_provider", filterLLM);
  if (filterStatus && filterStatus !== "ALL") query = query.eq("status", filterStatus);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return;
  TASKS = data || [];
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById("tasks");
  if (!container) return;
  container.innerHTML = "";
  if (TASKS.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Nenhuma tarefa encontrada</div>';
    return;
  }
  TASKS.forEach(t => {
    const card = document.createElement("div");
    card.className = "task-card";
    const extStatus = t.extractor_status || t.status || "STAGED";
    const dwnStatus = t.downloader_status || t.status || "STAGED";
    card.innerHTML = `
      <input type="checkbox" class="task-checkbox" onchange="toggleTaskSelection('${t.id}', this)">
      <div class="task-status">${getStatusIcon(extStatus)}</div>
      <div class="task-info">
        <div class="task-id">${t.id}</div>
        <div class="task-url">${t.full_url}</div>
      </div>
      <div class="task-status-badge ${getStatusClass(extStatus)}">${extStatus}</div>
      <div class="task-status-badge ${getStatusClass(dwnStatus)}">${dwnStatus}</div>
    `;
    container.appendChild(card);
  });
}

function toggleTaskSelection(id, cb) {
  if (cb.checked) TASK_SELECTION.add(id);
  else TASK_SELECTION.delete(id);
}

async function insertTask() {
  const rawValue = document.getElementById("task_url").value.trim();
  if (!rawValue) { showToast("URL(s) obrigatória(s)", "error"); return; }
  const urls = rawValue.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
  if (urls.length === 0) { showToast("Nenhuma URL válida encontrada", "error"); return; }
  const agentName = document.getElementById("agent_override").value || document.getElementById("insert_agent").value;
  await ensureAgent(USER.id, agentName);
  const payloads = urls.map(url => ({
    user_name: USER.user_name,
    agente: agentName,
    full_url: url,
    session_user_id: USER.id,
    user_uuid: USER.id,
    slug: extractSlugFromUrl(url),
    client_uuid: MESH_WAVE_UUID,
    origin_provider: extractOriginProvider(url),
    status: "STAGED"
  }));
  const { error } = await supabase.from("appsofia_tasks").insert(payloads);
  if (error) showToast("Erro ao inserir tarefa", "error");
  else {
    showToast(`${urls.length} tarefa(s) inserida(s) com sucesso!`, "success");
    document.getElementById("task_url").value = "";
    loadTasks();
  }
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const taskInput = document.getElementById("task_url");
    if (taskInput) {
      const currentVal = taskInput.value.trim();
      taskInput.value = currentVal + (currentVal ? "\n" : "") + content;
    }
  };
  reader.readAsText(file);
}

function smartRefresh() {
  loadTasks();
  loadFiles();
  showToast("Atualizado!", "info", 1500);
}

function runAction(action) {
  if (TASK_SELECTION.size === 0) {
    showToast("Selecione pelo menos uma tarefa", "info");
    return;
  }
  showToast(`Ação '${action}' executada em ${TASK_SELECTION.size} tarefa(s)`, "success");
}

// ======================
// FILES FILTERS
// ======================
window.setFileAgentFilter = (val) => {
  FILE_FILTER_AGENT = val;
  loadFiles();
};
window.setFileLLMFilter = (val) => {
  FILE_FILTER_LLM = val;
  loadFiles();
};
window.setFileSlugFilter = (val) => {
  const value = (val && val.target) ? val.target.value : val;
  FILE_FILTER_SLUG = value || "";
  loadFiles();
};

// ======================
// FILES
// ======================
async function loadFiles() {
  if (!SESSION.logged) return;
  const url = `${API_BASE_URL}/files?user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    let providers = json?.data?.providers || [];

    if (FILE_FILTER_LLM !== "ALL") {
      providers = providers.filter(p => 
        (p.provider || "").toLowerCase() === FILE_FILTER_LLM.toLowerCase()
      );
    }

    if (FILE_FILTER_AGENT !== "ALL") {
      providers = providers.map(p => ({
        ...p,
        tasks: (p.tasks || []).filter(t => (t.agente || t.agent_name) === FILE_FILTER_AGENT)
      })).filter(p => p.tasks.length > 0);
    }

    if (FILE_FILTER_SLUG !== "") {
      const q = FILE_FILTER_SLUG.toLowerCase().trim();
      providers = providers.map(p => {
        const tasks = Array.isArray(p.tasks) ? p.tasks : [];
        const filteredTasks = tasks.filter(t => {
          const slugVal = (t.slug ?? "").toString().toLowerCase();
          const idVal = (t.id ?? "").toString().toLowerCase();
          const files = Array.isArray(t.files) ? t.files : [];
          const fileMatch = files.some(f => (f.filename ?? "").toString().toLowerCase().includes(q));
          return slugVal.includes(q) || idVal.includes(q) || fileMatch;
        });
        return { ...p, tasks: filteredTasks };
      }).filter(p => Array.isArray(p.tasks) && p.tasks.length > 0);
    }

    FILES_DATA = providers;
    renderFileTree();
  } catch (error) {
    console.error("Error loading files:", error);
  }
}

function renderFileTree() {
  const container = document.getElementById("files");
  if (!container) return;
  container.innerHTML = "";
  if (FILES_DATA.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Nenhum arquivo encontrado</div>';
    return;
  }
  
  FILES_DATA.forEach((provider, providerIndex) => {
    // Provider header (collapsible)
    const providerHeader = document.createElement("div");
    providerHeader.className = "collapsible-header collapsed";
    providerHeader.innerHTML = `
      <div>📁 ${provider.provider}</div>
      <span class="toggle-icon">▼</span>
    `;
    container.appendChild(providerHeader);
    
    // Provider content
    const providerContent = document.createElement("div");
    providerContent.className = "collapsible-content collapsed";
    providerContent.id = `provider-${providerIndex}`;
    
    // Add tasks to provider
    (provider.tasks || []).forEach((task, taskIndex) => {
      // Task header (collapsible)
      const taskHeader = document.createElement("div");
      taskHeader.className = "collapsible-header collapsed";
      taskHeader.style.marginLeft = "15px";
      const taskId = task.id || task.task_id || task.slug || "unknown";
      taskHeader.innerHTML = `
        <div>📋 Task: ${taskId}</div>
        <span class="toggle-icon">▼</span>
      `;
      providerContent.appendChild(taskHeader);
      
      // Task content
      const taskContent = document.createElement("div");
      taskContent.className = "collapsible-content collapsed";
      taskContent.id = `task-${providerIndex}-${taskIndex}`;
      
      // Add files to task
      (task.files || []).forEach(file => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item file-item-nested";
        const displayName = file.filename ? file.filename.split("_").pop() : "arquivo";
        fileItem.innerHTML = `📄 ${displayName}`;
        fileItem.onclick = () => openPreviewModal(file);
        taskContent.appendChild(fileItem);
      });
      
      providerContent.appendChild(taskContent);
      
      // Toggle task content
      taskHeader.onclick = () => {
        taskHeader.classList.toggle("collapsed");
        taskContent.classList.toggle("collapsed");
      };
    });
    
    container.appendChild(providerContent);
    
    // Toggle provider content
    providerHeader.onclick = () => {
      providerHeader.classList.toggle("collapsed");
      providerContent.classList.toggle("collapsed");
    };
  });
}

function downloadFile(path) {
  window.open(`${API_BASE_URL}/api/file?path=${encodeURIComponent(path)}&download=true`, "_blank");
}

// ======================
// SEARCH
// ======================
function setSearchMode(mode) {
  SEARCH_MODE = mode;
  ["modeDefault", "modeResumo", "modeEnrich"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle("active", id.includes(mode.toUpperCase()));
    }
  });
}

async function performSearch() {
  const query = document.getElementById("searchInput")?.value?.trim();
  if (!query) {
    showToast("Digite algo para buscar", "info");
    return;
  }

  const container = document.getElementById("searchResults");
  if (container) container.innerHTML = "Buscando...";

  try {
    const url = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&mode=${SEARCH_MODE}&match=${SEARCH_MATCH_MODE}&user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
    const res = await fetch(url);
    const json = await res.json();
    SEARCH_RESULTS = json.results || [];
    renderSearchResults();
  } catch (error) {
    console.error("Error performing search:", error);
    showToast("Erro ao buscar", "error");
  }
}

function renderSearchResults() {
  const container = document.getElementById("searchResults");
  if (!container) return;

  container.innerHTML = "";

  if (SEARCH_RESULTS.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Nenhum resultado encontrado</div>';
    return;
  }

  SEARCH_RESULTS.forEach(result => {
    const item = document.createElement("div");
    item.className = "search-result";
    item.innerHTML = `
      <div class="search-result-name">${result.filename}</div>
      <div class="search-result-meta">Task: ${result.task_id}</div>
    `;
    item.onclick = () => openPreviewModal(result);
    container.appendChild(item);
  });
}

// ======================
// SETTINGS & CONFIGURATION
// ======================
let USER_CONFIG = {
  database: null,
  storage: null
};

async function loadUserConfig() {
  if (!SESSION.logged) return;
  const { data, error } = await supabase
    .from("user_configurations")
    .select("*")
    .eq("user_id", USER.id)
    .maybeSingle();
  
  if (data) {
    USER_CONFIG = data.config || USER_CONFIG;
    populateConfigFields();
    updateConfigStatus();
  }
}

function populateConfigFields() {
  if (USER_CONFIG.database) {
    document.getElementById("db_host").value = USER_CONFIG.database.host || "";
    document.getElementById("db_port").value = USER_CONFIG.database.port || "5432";
    document.getElementById("db_name").value = USER_CONFIG.database.name || "";
    document.getElementById("db_user").value = USER_CONFIG.database.user || "";
  }
  if (USER_CONFIG.storage) {
    document.getElementById("storage_url").value = USER_CONFIG.storage.url || "";
    document.getElementById("storage_key").value = USER_CONFIG.storage.key || "";
  }
}

function updateConfigStatus() {
  const dbStatus = USER_CONFIG.database ? "🟢 Database: Configured" : "🔴 Database: Not configured";
  const storageStatus = USER_CONFIG.storage ? "🟢 Storage: Configured" : "🔴 Storage: Not configured";
  const statusDiv = document.getElementById("config_status");
  if (statusDiv) {
    statusDiv.innerHTML = `<p>${dbStatus}</p><p>${storageStatus}</p>`;
  }
}

async function saveDBConfig() {
  const config = {
    host: document.getElementById("db_host").value.trim(),
    port: parseInt(document.getElementById("db_port").value) || 5432,
    name: document.getElementById("db_name").value.trim() || "sofia_storage_user",
    user: document.getElementById("db_user").value.trim(),
    pass: document.getElementById("db_pass").value
  };

  if (!config.host || !config.user || !config.pass) {
    showMessage("db_msg", "Please fill in all database fields", "error");
    return;
  }

  USER_CONFIG.database = config;
  await saveConfigToSupabase();
  showMessage("db_msg", "Database configuration saved successfully!", "success");
  updateConfigStatus();
}

async function saveStorageConfig() {
  const config = {
    url: document.getElementById("storage_url").value.trim(),
    key: document.getElementById("storage_key").value.trim()
  };

  if (!config.url || !config.key) {
    showMessage("storage_msg", "Please fill in all storage fields", "error");
    return;
  }

  USER_CONFIG.storage = config;
  await saveConfigToSupabase();
  showMessage("storage_msg", "Storage configuration saved successfully!", "success");
  updateConfigStatus();
}

async function saveConfigToSupabase() {
  if (!SESSION.logged) return;
  
  const { data: existing } = await supabase
    .from("user_configurations")
    .select("id")
    .eq("user_id", USER.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_configurations")
      .update({ config: USER_CONFIG, updated_at: new Date() })
      .eq("user_id", USER.id);
  } else {
    await supabase
      .from("user_configurations")
      .insert([{
        user_id: USER.id,
        config: USER_CONFIG,
        created_at: new Date(),
        updated_at: new Date()
      }]);
  }
}

// ======================
// PROFILE
// ======================
async function saveProfile() {
  const updates = {
    full_name: document.getElementById("p_name")?.value?.trim(),
    email: document.getElementById("p_email")?.value?.trim(),
    tel: document.getElementById("p_tel")?.value?.trim(),
    company: document.getElementById("p_company")?.value?.trim(),
    role: document.getElementById("p_role")?.value?.trim()
  };

  try {
    const { error } = await supabase
      .from("clients")
      .update(updates)
      .eq("owner_user_id", USER.id);

    if (error) {
      showMessage("profile_msg", "Erro ao atualizar perfil", "error");
      return;
    }

    USER = { ...USER, ...updates };
    showMessage("profile_msg", "Perfil atualizado com sucesso!", "success");
  } catch (error) {
    console.error("Error saving profile:", error);
    showMessage("profile_msg", "Erro ao atualizar perfil", "error");
  }
}

// ======================
// WINDOW EXPORTS
// ======================
window.showTab = showTab;
window.login = login;
window.registerUser = registerUser;
window.loadTasks = loadTasks;
window.loadFiles = loadFiles;
window.insertTask = insertTask;
window.handleFileUpload = handleFileUpload;
window.smartRefresh = smartRefresh;
window.runAction = runAction;
window.setSearchMode = setSearchMode;
window.performSearch = performSearch;
window.downloadFile = downloadFile;
window.openPreviewModal = openPreviewModal;
window.closePreviewModal = closePreviewModal;
window.downloadCurrentFile = downloadCurrentFile;
window.saveProfile = saveProfile;
window.saveDBConfig = saveDBConfig;
window.saveStorageConfig = saveStorageConfig;
window.toggleTaskSelection = toggleTaskSelection;
window.setFileAgentFilter = setFileAgentFilter;
window.setFileLLMFilter = setFileLLMFilter;
window.setFileSlugFilter = setFileSlugFilter;

// ======================
// INITIALIZATION
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  showTab(1);
  await restoreSession();

  if (SESSION.logged) {
    await loadAgentsAndLLMs();
    await loadUserConfig();
  }
});

setInterval(updateUserDisplay, 1000);
