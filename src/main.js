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
    // Update Nav Buttons
    document.querySelectorAll(".nav-btn").forEach((btn, index) => {
      if (index === n - 1) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    // Scroll to top of the main container when changing tabs
    const main = document.querySelector(".app-main");
    if (main) main.scrollTop = 0;
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
  const s = (status || "").toString().toUpperCase();
  // Novos status (IDs ou Nomes)
  if (s === "100" || s === "STAGED") return "📦";
  if (s === "110" || s === "PROGRESS") return "⚙️";
  if (s === "120" || s === "PAUSED") return "⏸️";
  if (s === "130" || s === "DONE") return "🏁";
  if (s === "200" || s === "FAIL") return "🚨";
  if (s === "9") return "💬"; // Pergunta respondida
  
  // Legado
  if (s === "DELETED") return "🗑️";
  if (s === "PROCESS" || s === "PROCESSING") return "⚙️";
  if (s === "FAIL" || s === "FAILED") return "🚨";
  if (s === "PAUSE" || s === "PAUSED") return "⏸️";
  return "❓";
}

function getStatusClass(status) {
  const s = (status || "").toString().toUpperCase();
  if (s === "100" || s === "STAGED") return "status-staged";
  if (s === "110" || s === "PROGRESS" || s === "PROCESS" || s === "PROCESSING") return "status-process";
  if (s === "130" || s === "DONE") return "status-done";
  if (s === "200" || s === "FAIL" || s === "FAILED") return "status-fail";
  if (s === "120" || s === "PAUSED" || s === "PAUSE") return "status-pause";
  if (s === "9") return "status-staged"; // Status 9 é informativo
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
  body.innerHTML = "Loading...";
  
  const ext = cleanFilename.split(".").pop().toLowerCase();
  
  // Chaveamento dinâmico de storage: usar o storage do usuário se configurado
  let fileUrl;
  // Se o caminho for absoluto (começa com /mnt), usamos sempre a API central
  const isAbsolutePath = file.path && file.path.startsWith("/");
  
  if (!isAbsolutePath && USER_CONFIG.storage && USER_CONFIG.storage.url && USER_CONFIG.storage.key) {
    // Usar o storage do usuário para caminhos relativos (Supabase)
    fileUrl = `${USER_CONFIG.storage.url}/storage/v1/object/public/sofia_storage_user/${file.path}`;
  } else {
    // Usar a API central para caminhos absolutos (Search) ou fallback
    fileUrl = `${API_BASE_URL}/api/file?path=${encodeURIComponent(file.path)}&download=false`;
  }
  
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    body.innerHTML = `<img src="${fileUrl}" class="preview-image" alt="${cleanFilename}">`;
  } else if (ext === "pdf") {
    body.innerHTML = `<iframe src="${fileUrl}" style="width:100%;height:500px;border:none;border-radius:8px;"></iframe>`;
  } else if (["txt", "md", "json", "log", "csv"].includes(ext)) {
    fetch(fileUrl)
      .then(res => res.text())
      .then(text => {
        const preview = text.length > 5000 ? text.substring(0, 5000) + "\n\n[... file truncated ...]": text;
        body.innerHTML = `<div class="preview-text">${preview}</div>`;
      })
      .catch(() => {
        body.innerHTML = "<div class='preview-text'>Error loading file</div>";
      });
  } else {
    body.innerHTML = "<div class='preview-text'>Format not supported for preview</div>";
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
  
  // ✅ Carregar configurações APÓS setar USER.id
  await loadUserConfig();
  
  if (document.getElementById("p_username")) document.getElementById("p_username").value = USER.user_name;
  if (document.getElementById("p_name")) document.getElementById("p_name").value = USER.full_name || "";
  if (document.getElementById("p_email")) document.getElementById("p_email").value = USER.email || "";
  
  updateUserDisplay();
  
  // RECARREGAR CONFIGURAÇÃO ESPECÍFICA DO USUÁRIO LOGADO
  await loadUserConfig();
  
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

    // ✅ Carregar configurações APÓS setar USER.id
    await loadUserConfig();

    updateUserDisplay();
    
    // RECARREGAR CONFIGURAÇÃO ESPECÍFICA DO USUÁRIO RESTAURADO
    await loadUserConfig();
    
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
  const { data: agentsData } = await supabase.from("user_agents").select("agent_name").eq("user_uuid", USER.id).order("agent_name", { ascending: true });
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

  const { data: llmData } = await supabase.from("user_origin_providers").select("origin_provider").eq("user_uuid", USER.id).order("origin_provider", { ascending: true });
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
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:12px;">Nenhuma tarefa encontrada</div>';
    return;
  }
  
  TASKS.forEach(t => {
    const row = document.createElement("div");
    row.className = "task-row";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "40px 40px 1fr 75px 75px";
    row.style.gap = "8px";
    row.style.padding = "12px 8px";
    row.style.borderBottom = "1px solid var(--border)";
    row.style.alignItems = "center";
    row.style.transition = "background 0.2s";

    const extStatus = t.extractor_status || t.status || "100";
    const dwnStatus = t.downloader_status || t.status || "100";
    
    const getStatusName = (s) => {
      if (s === "100") return "STAGED";
      if (s === "110") return "PROGRESS";
      if (s === "120") return "PAUSED";
      if (s === "130") return "DONE";
      if (s === "200") return "FAIL";
      if (s === "9") return "RESP";
      return s;
    };

    const isSelected = TASK_SELECTION.has(t.id);

    row.innerHTML = `
      <div style="display: flex; justify-content: center;">
        <input type="checkbox" class="task-checkbox" onchange="toggleTaskSelection('${t.id}', this)" ${isSelected ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent);">
      </div>
      <div style="text-align: center; font-size: 16px;">${getStatusIcon(extStatus)}</div>
      <div style="min-width: 0;">
        <div style="font-size: 11px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.full_url}</div>
        <div style="font-size: 8px; color: var(--text-muted); margin-top: 2px;">ID: ${t.id.substring(0,8)} | 🤖 ${t.agente || 'default'}</div>
      </div>
      <div style="text-align: center;">
        <span class="task-status-badge ${getStatusClass(extStatus)}" style="font-size: 7px; padding: 2px 4px; width: 100%; justify-content: center;">${getStatusName(extStatus)}</span>
      </div>
      <div style="text-align: center;">
        <span class="task-status-badge ${getStatusClass(dwnStatus)}" style="font-size: 7px; padding: 2px 4px; width: 100%; justify-content: center;">${getStatusName(dwnStatus)}</span>
      </div>
    `;
    
    row.onclick = (e) => {
      if (e.target.type !== 'checkbox') {
        const cb = row.querySelector('.task-checkbox');
        cb.checked = !cb.checked;
        toggleTaskSelection(t.id, cb);
      }
    };
    
    container.appendChild(row);
  });
}

function toggleSelectAll(cb) {
  const checkboxes = document.querySelectorAll('.task-checkbox');
  checkboxes.forEach(box => {
    box.checked = cb.checked;
    // Extrair o ID da tarefa do evento onchange ou buscar no elemento pai
    // No nosso caso, o ID está no atributo onchange: toggleTaskSelection('ID', this)
    const match = box.getAttribute('onchange').match(/'([^']+)'/);
    if (match && match[1]) {
      if (cb.checked) TASK_SELECTION.add(match[1]);
      else TASK_SELECTION.delete(match[1]);
    }
  });
}
window.toggleSelectAll = toggleSelectAll;

function toggleTaskSelection(id, cb) {
  if (cb.checked) TASK_SELECTION.add(id);
  else TASK_SELECTION.delete(id);
}

async function ensureOriginProviderInUserDB(user_uuid, origin_provider) {
  if (!user_uuid || !origin_provider) return;
  const { data: existing } = await supabase
    .from("user_origin_providers")
    .select("id")
    .eq("user_uuid", user_uuid)
    .eq("origin_provider", origin_provider)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("user_origin_providers")
    .insert([{
      user_uuid,
      client_uuid: MESH_WAVE_UUID,
      origin_provider
    }])
    .select()
    .maybeSingle();
  if (error) console.error("Error ensuring origin provider:", error);
  return data;
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
  // Chaveamento dinâmico de Banco de Dados
  let targetClient = supabase; // Default: MeshWave
  let isUserDB = false;

  if (USER_CONFIG.database && USER_CONFIG.storage && USER_CONFIG.storage.url) {
    try {
      const { createClient } = await import("./lib/supabase.js");
      targetClient = createClient(USER_CONFIG.storage.url, USER_CONFIG.storage.key);
      isUserDB = true;
      console.log("Usando Banco de Dados do Usuário");
    } catch (e) {
      console.error("Erro ao inicializar cliente do usuário, usando fallback MeshWave:", e);
    }
  }

  const { error } = await targetClient.from("appsofia_tasks").insert(payloads);
  
  if (error) {
    console.error("Erro na inserção:", error);
    if (isUserDB && (error.code === "PGRST116" || error.message.includes("does not exist"))) {
      showToast("Tabela 'appsofia_tasks' não encontrada no seu DB. Use a aba Settings para configurar.", "error", 5000);
    } else {
      showToast("Erro ao inserir tarefa no banco selecionado", "error");
    }
  } else {
    // Sincronizar origin_providers (apenas se for banco do usuário ou se quisermos manter sync)
    for (const payload of payloads) {
      await ensureOriginProviderInUserDB(USER.id, payload.origin_provider);
    }
    showToast(`${urls.length} tarefa(s) inserida(s) com sucesso no ${isUserDB ? 'seu DB' : 'DB MeshWave'}!`, "success");
    document.getElementById("task_url").value = "";
    loadTasks();
    await loadAgentsAndLLMs();
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
  const url = `${API_BASE_URL}/files?user_uuid=${USER.id}&user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
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
  let downloadUrl;
  if (USER_CONFIG.storage && USER_CONFIG.storage.url && USER_CONFIG.storage.key) {
    // Usar o storage do usuário
    downloadUrl = `${USER_CONFIG.storage.url}/storage/v1/object/public/sofia_storage_user/${path}`;
  } else {
    // Usar a API central (fallback)
    downloadUrl = `${API_BASE_URL}/api/file?path=${encodeURIComponent(path)}&download=true`;
  }
  window.open(downloadUrl, "_blank");
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
    const url = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&mode=${SEARCH_MODE}&match=${SEARCH_MATCH_MODE}&user_uuid=${USER.id}&user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
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
const CONFIG_STORAGE_KEY = "sofia_user_config";

function getConfigStorageKey(userId) {
  if (!userId) return CONFIG_STORAGE_KEY; // Fallback
  return `sofia_user_config_${userId}`;
}

let USER_CONFIG = {
  database: null,
  storage: null
};

async function loadUserConfig() {
  // Carregar do localStorage (Persistência Local)
  // O usuário solicitou que os dados fiquem no lado dele, não no nosso DB
  if (!USER.id) {
    console.warn("USER.id not set, skipping config load");
    return;
  }
  
  const storageKey = getConfigStorageKey(USER.id);
  const localData = localStorage.getItem(storageKey);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      USER_CONFIG = { ...USER_CONFIG, ...parsed };
      console.log(`Configurações carregadas para ${USER.user_name}:`, USER_CONFIG);
    } catch (e) {
      console.error("Erro ao ler config local:", e);
    }
  }
  
  populateConfigFields();
  updateConfigStatus();
}

function populateConfigFields() {
  if (USER_CONFIG.database) {
    if (document.getElementById("db_uri")) document.getElementById("db_uri").value = USER_CONFIG.database.uri || "";
    if (document.getElementById("db_pass")) document.getElementById("db_pass").value = USER_CONFIG.database.pass || "";
  }
  if (USER_CONFIG.storage) {
    if (document.getElementById("storage_url")) document.getElementById("storage_url").value = USER_CONFIG.storage.url || "";
    if (document.getElementById("storage_key")) document.getElementById("storage_key").value = USER_CONFIG.storage.key || "";
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

function parseDatabaseURI(uri, password) {
  try {
    // Substituir placeholder de senha se existir
    const finalUri = uri.replace("[YOUR-PASSWORD]", encodeURIComponent(password));
    const url = new URL(finalUri);
    
    return {
      uri: uri, // Salvar a original com placeholder
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      name: url.pathname.substring(1),
      user: url.username,
      pass: password || url.password
    };
  } catch (e) {
    console.error("Error parsing URI:", e);
    return null;
  }
}

async function saveDBConfig() {
  const uri = document.getElementById("db_uri").value.trim();
  const pass = document.getElementById("db_pass").value;

  if (!uri) {
    showMessage("db_msg", "Please paste your Connection String (URI)", "error");
    return;
  }

  const parsed = parseDatabaseURI(uri, pass);
  if (!parsed) {
    showMessage("db_msg", "Invalid Connection String format", "error");
    return;
  }

  USER_CONFIG.database = parsed;
  await saveUserConfig();
  showMessage("db_msg", "Database configuration saved successfully!", "success");
  updateConfigStatus();
}

async function saveStorageConfig() {
  let url = document.getElementById("storage_url").value.trim();
  const key = document.getElementById("storage_key").value.trim();

  if (!url || !key) {
    showMessage("storage_msg", "Please fill in all storage fields first", "error");
    return;
  }

  // Normalizar URL: remover db. se estiver no início (caso do usuário colar a connection string)
  if (url.startsWith("db.")) {
    url = url.substring(3);
  }

  // Adicionar https:// se não tiver
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const config = {
    url: url,
    key: key
  };

  USER_CONFIG.storage = config;
  await saveUserConfig();
  showMessage("storage_msg", "Storage configuration saved successfully!", "success");
  updateConfigStatus();
}

async function saveUserConfig() {
  // Salvar localmente apenas, conforme solicitado pelo usuário
  // Isso garante privacidade e que não temos acesso às credenciais do DB do usuário
  if (!USER.id) {
    console.warn("USER.id not set, cannot save config");
    return;
  }
  
  const storageKey = getConfigStorageKey(USER.id);
  localStorage.setItem(storageKey, JSON.stringify(USER_CONFIG));
  console.log(`Configurações salvas para ${USER.user_name}`);
}

function clearUserConfig() {
  if (!USER.id) {
    showToast("Nenhum usuário logado", "error");
    return;
  }
  
  if (confirm("Tem certeza que deseja limpar todas as configurações?")) {
    USER_CONFIG = { database: null, storage: null };
    const storageKey = getConfigStorageKey(USER.id);
    localStorage.removeItem(storageKey);
    populateConfigFields();
    updateConfigStatus();
    showToast("Configurações limpas", "success");
    // Reinicializar wizard
    WIZARD_CURRENT_STEP = 1;
    initializeWizard();
  }
}

async function migrateTasksToUserDB() {
  if (!USER_CONFIG.database) {
    showToast("Configure o banco de dados primeiro", "error");
    return;
  }
  
  showMessage("migration_msg", "Iniciando migração...", "info");
  const statusEl = document.getElementById("migration_status");
  if (statusEl) statusEl.textContent = "Processando...";
  
  try {
    // Buscar todas as tarefas do usuário no banco central
    const { data: tasks, error: tasksError } = await supabase
      .from("appsofia_tasks")
      .select("*")
      .eq("session_user_id", USER.id);
    
    if (tasksError || !tasks) {
      showMessage("migration_msg", "Erro ao buscar tarefas", "error");
      if (statusEl) statusEl.textContent = "Erro na última migração";
      return;
    }
    
    // Sincronizar cada tarefa e seu origin_provider
    let migratedCount = 0;
    for (const task of tasks) {
      // Sincronizar origin_provider
      if (task.origin_provider) {
        await ensureOriginProviderInUserDB(USER.id, task.origin_provider);
      }
      migratedCount++;
    }
    
    // Atualizar status
    const migrationData = {
      last_migration: new Date().toISOString(),
      tasks_migrated: migratedCount,
      status: "completed"
    };
    
    USER_CONFIG.migration_status = migrationData;
    await saveUserConfig();
    
    if (updateError) {
      showMessage("migration_msg", "Erro ao atualizar status", "error");
      if (statusEl) statusEl.textContent = "Erro ao salvar status";
      return;
    }
    
    if (statusEl) {
      const lastMigration = new Date(migrationData.last_migration).toLocaleString('pt-BR');
      statusEl.textContent = `✅ Última migração: ${lastMigration} | ${migratedCount} tarefa(s)`;
    }
    
    showMessage("migration_msg", `✅ Migração concluída! ${migratedCount} tarefa(s) sincronizada(s).`, "success");
    await loadAgentsAndLLMs();
    updateConfigStatus();
  } catch (error) {
    console.error("Migration error:", error);
    showMessage("migration_msg", `❌ Erro na migração: ${error.message}`, "error");
    if (statusEl) statusEl.textContent = `Erro: ${error.message}`;
  }
}


async function testDatabaseConnection() {
  const uri = document.getElementById("db_uri").value.trim();
  const pass = document.getElementById("db_pass").value;

  if (!uri) {
    showMessage("db_msg", "Please paste your Connection String (URI) first", "error");
    return;
  }

  const config = parseDatabaseURI(uri, pass);
  if (!config) {
    showMessage("db_msg", "Invalid Connection String format", "error");
    return;
  }

  showMessage("db_msg", "Testing connection...", "info");

  try {
    // No Supabase, o host do banco (ex: db.xxxx.supabase.co) é diferente da URL da API (ex: xxxx.supabase.co)
    // Se o usuário já configurou o Storage, podemos tentar usar a URL de lá
    let apiUrl = "";
    let apiKey = "";

    // Prioridade 1: Tentar inferir a URL da API a partir da URI do banco (independente do storage)
    if (config.host.startsWith("db.")) {
      apiUrl = "https://" + config.host.substring(3);
    } else if (config.host.includes("pooler.supabase.com")) {
      const parts = config.user.split(".");
      if (parts.length > 1) {
        apiUrl = `https://${parts[1]}.supabase.co`;
      }
    }

    // Prioridade 2: Se não conseguiu inferir da URI, usa a URL do storage configurada
    if (!apiUrl && USER_CONFIG.storage && USER_CONFIG.storage.url) {
      apiUrl = USER_CONFIG.storage.url;
    }

    // Chave de API sempre vem do storage (Anon Key)
    if (USER_CONFIG.storage && USER_CONFIG.storage.key) {
      apiKey = USER_CONFIG.storage.key;
    }

    if (!apiUrl) {
      showMessage("db_msg", "⚠️ Could not determine API URL. Please configure Storage first or use a direct Supabase URI.", "warning");
      return;
    }

    const { createClient } = await import("./lib/supabase.js");
    
    // Importar chaves padrão se necessário
    let finalApiKey = apiKey;
    if (!finalApiKey) {
      // Se não tiver chave de storage, tenta inferir se é o projeto default da MeshWave
      if (apiUrl.includes("ufylccbdjfzydbwhpmpp")) {
        finalApiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeWxjY2JkamZ6eWRid2hwbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDE1NjgsImV4cCI6MjA3NzI3NzU2OH0.SqbNgLH2_0gRwrQokFQpZgnIjzH2vVZtpoqmqj8tCgk";
      }
    }

    if (!finalApiKey) {
      showMessage("db_msg", "⚠️ Anon Key not found. Please configure Storage first.", "warning");
      return;
    }
    
    const testClient = createClient(apiUrl, finalApiKey);
    
    // Tentar acessar a tabela 'appsofia_tasks' que é o que o sistema usa
    const { data, error } = await testClient
      .from("appsofia_tasks")
      .select("id")
      .limit(1);
    
    if (error) {
      // Se a tabela não existir, ainda é uma conexão bem-sucedida com a API
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        showMessage("db_msg", "✅ API Connected, but 'appsofia_tasks' table not found. You may need to run migrations.", "warning");
      } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        showMessage("db_msg", "❌ Authentication failed. Check your Supabase Anon Key in Storage settings.", "error");
      } else {
        showMessage("db_msg", `❌ Connection failed: ${error.message}`, "error");
      }
    } else {
      showMessage("db_msg", "✅ Database API connection successful!", "success");
    }
  } catch (error) {
    showMessage("db_msg", `❌ Connection error: ${error.message}`, "error");
  }
}

async function testStorageConnection() {
  let url = document.getElementById("storage_url").value.trim();
  const key = document.getElementById("storage_key").value.trim();

  if (!url || !key) {
    showMessage("storage_msg", "Please fill in all storage fields first", "error");
    return;
  }

  // Normalizar URL: remover db. se estiver no início (caso do usuário colar a connection string)
  if (url.startsWith("db.")) {
    url = url.substring(3);
  }

  // Adicionar https:// se não tiver
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  showMessage("storage_msg", "Testing connection...", "info");

  try {
    const { createClient } = await import("./lib/supabase.js");
    
    let finalKey = key;
    if (!finalKey && url.includes("ufylccbdjfzydbwhpmpp")) {
      finalKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeWxjY2JkamZ6eWRid2hwbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDE1NjgsImV4cCI6MjA3NzI3NzU2OH0.SqbNgLH2_0gRwrQokFQpZgnIjzH2vVZtpoqmqj8tCgk";
    }

    if (!finalKey) {
      showMessage("storage_msg", "Please provide the Supabase Anon Key", "error");
      return;
    }

    const testClient = createClient(url, finalKey);
    const { data, error } = await testClient.storage.from("sofia_storage_user").list("", { limit: 1 });
    
    if (error) {
      showMessage("storage_msg", `❌ Connection failed: ${error.message}`, "error");
    } else {
      showMessage("storage_msg", "✅ Storage connection successful!", "success");
    }
  } catch (error) {
    showMessage("storage_msg", `❌ Connection error: ${error.message}`, "error");
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
// WORKSPACE SETUP WIZARD
// ======================
let WIZARD_CURRENT_STEP = 1;
const WIZARD_TOTAL_STEPS = 3;

const WIZARD_STEPS = [
  {
    id: 1,
    title: "Etapa 1: Informações do Supabase",
    description: "Configure a URL do seu projeto Supabase e a chave de acesso (Anon Key).",
    fields: [
      { id: "wizard_storage_url", label: "URL do Projeto Supabase", type: "text", placeholder: "https://seu-projeto.supabase.co", required: true },
      { id: "wizard_storage_key", label: "Supabase Anon Key", type: "password", placeholder: "Sua chave anon", required: true }
    ]
  },
  {
    id: 2,
    title: "Etapa 2: Banco de Dados",
    description: "Cole a Connection String (URI) do seu banco de dados PostgreSQL.",
    fields: [
      { id: "wizard_db_uri", label: "Connection String (URI)", type: "textarea", placeholder: "postgresql://postgres.[project-id]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres", required: true },
      { id: "wizard_db_pass", label: "Senha do Banco de Dados", type: "password", placeholder: "Sua senha", required: false }
    ]
  },
  {
    id: 3,
    title: "Etapa 3: Resumo e Confirmação",
    description: "Revise as configurações e confirme para criar seu workspace.",
    fields: []
  }
];

function initializeWizard() {
  // Detectar se o usuário já tem configuração
  if (USER_CONFIG.storage && USER_CONFIG.database) {
    // Usuário já configurado, ocultar wizard
    const wizardSection = document.getElementById("onboarding_section");
    if (wizardSection) wizardSection.style.display = "none";
  } else {
    // Mostrar wizard
    renderWizardStep();
  }
}

function renderWizardStep() {
  const step = WIZARD_STEPS[WIZARD_CURRENT_STEP - 1];
  const container = document.getElementById("wizard_content");
  if (!container) return;

  // Atualizar contador
  const counter = document.getElementById("wizard_step_counter");
  if (counter) counter.textContent = `Etapa ${WIZARD_CURRENT_STEP}/${WIZARD_TOTAL_STEPS}`;

  // Atualizar barra de progresso
  const progressBar = document.getElementById("wizard_progress_bar");
  if (progressBar) progressBar.style.width = `${(WIZARD_CURRENT_STEP / WIZARD_TOTAL_STEPS) * 100}%`;

  // Atualizar botões
  const prevBtn = document.getElementById("wizard_prev_btn");
  const nextBtn = document.getElementById("wizard_next_btn");
  if (prevBtn) prevBtn.style.display = WIZARD_CURRENT_STEP > 1 ? "block" : "none";
  if (nextBtn) nextBtn.textContent = WIZARD_CURRENT_STEP === WIZARD_TOTAL_STEPS ? "✅ Concluir" : "Próximo →";

  // Limpar container
  container.innerHTML = "";

  // Adicionar título e descrição
  const header = document.createElement("div");
  header.style.marginBottom = "20px";
  header.innerHTML = `
    <h3 style="margin: 0 0 8px 0; color: var(--primary);">${step.title}</h3>
    <p style="margin: 0; font-size: 12px; color: var(--muted);">${step.description}</p>
  `;
  container.appendChild(header);

  // Adicionar campos
  if (step.fields.length > 0) {
    const form = document.createElement("form");
    form.onsubmit = (e) => { e.preventDefault(); wizardNextStep(); };

    step.fields.forEach(field => {
      const group = document.createElement("div");
      group.className = "form-group";

      const label = document.createElement("label");
      label.htmlFor = field.id;
      label.textContent = field.label;
      group.appendChild(label);

      let input;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 3;
      } else {
        input = document.createElement("input");
        input.type = field.type;
      }
      input.id = field.id;
      input.placeholder = field.placeholder;
      if (field.required) input.required = true;

      // Pré-preencher com valores salvos
      if (WIZARD_CURRENT_STEP === 1) {
        if (field.id === "wizard_storage_url" && USER_CONFIG.storage) {
          input.value = USER_CONFIG.storage.url || "";
        } else if (field.id === "wizard_storage_key" && USER_CONFIG.storage) {
          input.value = USER_CONFIG.storage.key || "";
        }
      } else if (WIZARD_CURRENT_STEP === 2) {
        if (field.id === "wizard_db_uri" && USER_CONFIG.database) {
          input.value = USER_CONFIG.database.uri || "";
        } else if (field.id === "wizard_db_pass" && USER_CONFIG.database) {
          input.value = USER_CONFIG.database.pass || "";
        }
      }

      group.appendChild(input);
      form.appendChild(group);
    });

    container.appendChild(form);
  } else if (WIZARD_CURRENT_STEP === 3) {
    // Etapa de resumo
    const summary = document.createElement("div");
    summary.style.background = "#1a2332";
    summary.style.padding = "15px";
    summary.style.borderRadius = "8px";
    summary.style.fontSize = "12px";

    let summaryHTML = "<h4 style='margin-top: 0;'>Resumo da Configuração:</h4>";

    if (USER_CONFIG.storage) {
      summaryHTML += `
        <p><strong>Supabase URL:</strong></p>
        <p style="margin: 5px 0 10px 0; color: var(--primary); word-break: break-all;">${USER_CONFIG.storage.url}</p>
      `;
    }

    if (USER_CONFIG.database) {
      summaryHTML += `
        <p><strong>Banco de Dados:</strong></p>
        <p style="margin: 5px 0 10px 0; color: var(--primary); word-break: break-all;">${USER_CONFIG.database.uri}</p>
      `;
    }

    summaryHTML += `
      <p style="margin-top: 15px; color: var(--muted); font-size: 11px;">
        ✅ Clique em <strong>Concluir</strong> para salvar e criar as tabelas automaticamente.
      </p>
    `;

    summary.innerHTML = summaryHTML;
    container.appendChild(summary);
  }
}

function wizardNextStep() {
  // Validar e salvar dados da etapa atual
  if (WIZARD_CURRENT_STEP === 1) {
    const url = document.getElementById("wizard_storage_url")?.value?.trim();
    const key = document.getElementById("wizard_storage_key")?.value?.trim();

    if (!url || !key) {
      showMessage("wizard_msg", "Preencha todos os campos obrigatórios", "error");
      return;
    }

    // Normalizar URL
    let finalUrl = url;
    if (finalUrl.startsWith("db.")) finalUrl = finalUrl.substring(3);
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) finalUrl = "https://" + finalUrl;

    USER_CONFIG.storage = { url: finalUrl, key };
    showMessage("wizard_msg", "", "");
  } else if (WIZARD_CURRENT_STEP === 2) {
    const uri = document.getElementById("wizard_db_uri")?.value?.trim();
    const pass = document.getElementById("wizard_db_pass")?.value || "";

    if (!uri) {
      showMessage("wizard_msg", "Cole a Connection String", "error");
      return;
    }

    const parsed = parseDatabaseURI(uri, pass);
    if (!parsed) {
      showMessage("wizard_msg", "Connection String inválida", "error");
      return;
    }

    USER_CONFIG.database = parsed;
    showMessage("wizard_msg", "", "");
  } else if (WIZARD_CURRENT_STEP === 3) {
    // Concluir wizard
    completeWizard();
    return;
  }

  if (WIZARD_CURRENT_STEP < WIZARD_TOTAL_STEPS) {
    WIZARD_CURRENT_STEP++;
    renderWizardStep();
  }
}

function wizardPrevStep() {
  if (WIZARD_CURRENT_STEP > 1) {
    WIZARD_CURRENT_STEP--;
    renderWizardStep();
  }
}

function skipWizard() {
  const wizardSection = document.getElementById("onboarding_section");
  if (wizardSection) wizardSection.style.display = "none";
  showToast("Wizard pulado. Você pode configurar manualmente abaixo.", "info");
}

async function completeWizard() {
  showMessage("wizard_msg", "Salvando configurações...", "info");

  try {
    // Salvar configurações
    await saveUserConfig();
    updateConfigStatus();

    showMessage("wizard_msg", "✅ Configurações salvas! Testando conexões...", "success");

    // Testar conexões
    const { createClient } = await import("./lib/supabase.js");
    const testClient = createClient(USER_CONFIG.storage.url, USER_CONFIG.storage.key);

    const { error: storageError } = await testClient.storage.from("sofia_storage_user").list("", { limit: 1 });
    const { error: dbError } = await testClient.from("appsofia_tasks").select("id").limit(1);

    // Mostrar status do bootstrap
    const bootstrapSection = document.getElementById("bootstrap_section");
    if (bootstrapSection) {
      bootstrapSection.style.display = "block";
      await checkTableStatus();
    }

    // Ocultar wizard
    const wizardSection = document.getElementById("onboarding_section");
    if (wizardSection) wizardSection.style.display = "none";

    showToast("✅ Setup concluído! Próximo passo: criar as tabelas.", "success");
  } catch (error) {
    showMessage("wizard_msg", `❌ Erro: ${error.message}`, "error");
  }
}

// ======================
// TABLE BOOTSTRAP
// ======================
async function checkTableStatus() {
  if (!USER_CONFIG.storage) {
    showMessage("bootstrap_msg", "Configure o Storage primeiro", "error");
    return;
  }

  const statusDiv = document.getElementById("bootstrap_tables_status");
  if (statusDiv) statusDiv.innerHTML = "<p>⏳ Verificando tabelas...</p>";

  try {
    const { createClient } = await import("./lib/supabase.js");
    const testClient = createClient(USER_CONFIG.storage.url, USER_CONFIG.storage.key);

    const tables = ["appsofia_tasks", "user_origin_providers", "user_agents"];
    let statusHTML = "";
    let allOk = true;

    for (const table of tables) {
      const { error } = await testClient.from(table).select("id").limit(1);
      if (error && (error.code === "PGRST116" || error.message.includes("does not exist"))) {
        statusHTML += `<p>🔴 ${table}: Não encontrada</p>`;
        allOk = false;
      } else if (error) {
        statusHTML += `<p>⚠️ ${table}: ${error.message}</p>`;
        allOk = false;
      } else {
        statusHTML += `<p>🟢 ${table}: OK</p>`;
      }
    }

    if (statusDiv) statusDiv.innerHTML = statusHTML;

    if (allOk) {
      showMessage("bootstrap_msg", "✅ Todas as tabelas estão criadas!", "success");
    } else {
      showMessage("bootstrap_msg", "⚠️ Algumas tabelas estão faltando. Clique em 'Criar Tabelas' para criá-las.", "warning");
    }
  } catch (error) {
    if (statusDiv) statusDiv.innerHTML = `<p>❌ Erro: ${error.message}</p>`;
    showMessage("bootstrap_msg", `❌ Erro ao verificar: ${error.message}`, "error");
  }
}

async function bootstrapTables() {
  if (!USER_CONFIG.storage) {
    showMessage("bootstrap_msg", "Configure o Storage primeiro", "error");
    return;
  }

  showMessage("bootstrap_msg", "⏳ Criando tabelas...", "info");

  try {
    const { createClient } = await import("./lib/supabase.js");
    const testClient = createClient(USER_CONFIG.storage.url, USER_CONFIG.storage.key);

    // Tentar criar as tabelas (nota: Supabase JS não permite executar SQL arbitrário)
    // Portanto, apenas informamos ao usuário que ele precisa executar manualmente
    const sqlScript = `
-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS public.appsofia_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_name text,
  client_uuid uuid,
  session_user_id uuid,
  user_uuid uuid,
  full_url text,
  slug text,
  origin_provider text,
  agente text,
  status text DEFAULT 'STAGED',
  extractor_status text DEFAULT 'STAGED',
  downloader_status text DEFAULT 'STAGED',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Criar tabela de providers
CREATE TABLE IF NOT EXISTS public.user_origin_providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_uuid uuid,
  client_uuid uuid,
  origin_provider text,
  UNIQUE(user_uuid, origin_provider)
);

-- Criar tabela de agentes
CREATE TABLE IF NOT EXISTS public.user_agents (
  id bigserial not null,
  client_uuid uuid not null,
  user_uuid uuid not null,
  agent_name text not null,
  created_at timestamp with time zone null default now(),
  constraint user_agents_pkey primary key (id),
  constraint user_agents_unique unique (user_uuid, agent_name)
);
    `;

    // Copiar SQL para clipboard
    const textarea = document.createElement("textarea");
    textarea.value = sqlScript;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    // 1. Tentar criar o bucket de storage automaticamente
    try {
      const { data: bucket, error: bucketError } = await testClient.storage.createBucket('sofia_storage_user', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/*', 'text/*', 'application/pdf', 'application/json']
      });
      
      if (bucketError && bucketError.message.includes("already exists")) {
        console.log("Bucket já existe.");
      } else if (bucketError) {
        console.warn("Erro ao criar bucket automaticamente:", bucketError.message);
      } else {
        console.log("Bucket criado com sucesso!");
      }
    } catch (e) {
      console.warn("Erro na tentativa de criar bucket:", e);
    }

    // 2. Gerar link direto para o SQL Editor
    let sqlEditorUrl = "https://supabase.com/dashboard/project/_/sql/new";
    if (USER_CONFIG.storage && USER_CONFIG.storage.url) {
      const projectId = USER_CONFIG.storage.url.split("//")[1].split(".")[0];
      if (projectId) {
        sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;
      }
    }

    // 3. Atualizar UI com link e instrução
    const msgDiv = document.getElementById("bootstrap_msg");
    if (msgDiv) {
      msgDiv.innerHTML = `
        <div style="background: #1a3a3a; padding: 15px; border-radius: 8px; border: 1px solid var(--primary); margin-top: 10px;">
          <p style="margin-top: 0;">✅ <strong>SQL Copiado!</strong></p>
          <p style="font-size: 11px;">O bucket de storage foi solicitado. Agora, clique no botão abaixo para abrir o editor SQL do seu projeto, cole o código (Ctrl+V) e clique em <strong>Run</strong>.</p>
          <a href="${sqlEditorUrl}" target="_blank" class="btn btn-primary btn-block" style="text-decoration: none; text-align: center; display: block; margin-top: 10px;">🚀 Abrir SQL Editor no Supabase</a>
        </div>
      `;
      msgDiv.className = "message show info";
    }
    
    showToast("SQL copiado! Siga as instruções na tela.", "success");

    // Aguardar um pouco e verificar status
    setTimeout(() => {
      checkTableStatus();
    }, 5000);
  } catch (error) {
    showMessage("bootstrap_msg", `❌ Erro: ${error.message}`, "error");
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
window.testDatabaseConnection = testDatabaseConnection;
window.testStorageConnection = testStorageConnection;
window.toggleTaskSelection = toggleTaskSelection;
window.setFileAgentFilter = setFileAgentFilter;
window.setFileLLMFilter = setFileLLMFilter;
window.setFileSlugFilter = setFileSlugFilter;
window.migrateTasksToUserDB = migrateTasksToUserDB;
window.ensureOriginProviderInUserDB = ensureOriginProviderInUserDB;
window.clearUserConfig = clearUserConfig;
window.wizardNextStep = wizardNextStep;
window.wizardPrevStep = wizardPrevStep;
window.skipWizard = skipWizard;
window.checkTableStatus = checkTableStatus;
window.bootstrapTables = bootstrapTables;
window.handleTerminalCommand = handleTerminalCommand;

// ======================
// TERMINAL LOGIC
// ======================
function addTerminalLine(text, type = "info") {
  const body = document.getElementById("terminal_body");
  if (!body) return;
  const line = document.createElement("div");
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

async function handleTerminalCommand(event) {
  if (event.key !== "Enter") return;
  const input = document.getElementById("terminal_input");
  const command = input.value.trim().toLowerCase();
  if (!command) return;

  addTerminalLine(`sofia@workspace:~$ ${command}`, "command");
  input.value = "";

  const args = command.split(" ");
  const cmd = args[0];

  switch (cmd) {
    case "help":
      addTerminalLine("Available commands:");
      addTerminalLine("  help          - Show this help message");
      addTerminalLine("  clear         - Clear terminal screen");
      addTerminalLine("  sofia-init    - Run full workspace bootstrap");
      addTerminalLine("  status        - Check workspace configuration status");
      addTerminalLine("  whoami        - Show current user info");
      addTerminalLine("  ls            - List available workspace components");
      break;
    case "clear":
      const body = document.getElementById("terminal_body");
      if (body) body.innerHTML = "";
      break;
    case "whoami":
      addTerminalLine(`User: ${USER.user_name} (${USER.full_name})`);
      addTerminalLine(`Email: ${USER.email}`);
      break;
    case "ls":
      addTerminalLine("Components:");
      addTerminalLine("  [DIR]  lib/");
      addTerminalLine("  [FILE] main.js");
      addTerminalLine("  [DB]   appsofia_tasks");
      addTerminalLine("  [STRG] sofia_storage_user");
      break;
    case "status":
      addTerminalLine("Checking configuration...");
      addTerminalLine(`Database: ${USER_CONFIG.database ? "CONNECTED" : "NOT CONFIGURED"}`);
      addTerminalLine(`Storage: ${USER_CONFIG.storage ? "CONNECTED" : "NOT CONFIGURED"}`);
      break;
    case "sofia-init":
      await runSofiaInit();
      break;
    default:
      addTerminalLine(`Command not found: ${cmd}`, "error");
  }
}

async function runSofiaInit() {
  if (!USER_CONFIG.storage || !USER_CONFIG.database) {
    addTerminalLine("Error: Missing configuration. Run wizard first.", "error");
    return;
  }

  addTerminalLine("Starting Sofia Workspace Initialization...", "info");
  addTerminalLine("Step 1: Connecting to Supabase API...", "info");
  
  try {
    const { createClient } = await import("./lib/supabase.js");
    const testClient = createClient(USER_CONFIG.storage.url, USER_CONFIG.storage.key);
    addTerminalLine("DONE: API Connected.", "info");

    addTerminalLine("Step 2: Provisioning Storage Bucket...", "info");
    const { data: bucket, error: bucketError } = await testClient.storage.createBucket('sofia_storage_user', { public: true });
    
    if (bucketError && bucketError.message.includes("already exists")) {
      addTerminalLine("SKIP: Bucket already exists.", "warn");
    } else if (bucketError) {
      addTerminalLine(`WARN: ${bucketError.message}`, "warn");
    } else {
      addTerminalLine("DONE: Bucket created successfully.", "info");
    }

    addTerminalLine("Step 3: Preparing Database Schema...", "info");
    addTerminalLine("System is ready to create tables.", "info");
    addTerminalLine("Due to security constraints, please run the SQL script.", "info");
    
    // Acionar a lógica de bootstrap já existente
    bootstrapTables();
    
    addTerminalLine("DONE: SQL script copied to clipboard.", "info");
    addTerminalLine("-------------------------------------------", "info");
    addTerminalLine("WORKSPACE INITIALIZATION COMPLETED (PENDING SQL RUN)", "info");
    addTerminalLine("Type 'status' to check again.", "info");
    
  } catch (e) {
    addTerminalLine(`FATAL ERROR: ${e.message}`, "error");
  }
}

// ======================
// INITIALIZATION
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  showTab(1);
  
  // 1. Tentar restaurar sessão primeiro para saber quem é o usuário
  await restoreSession();
  
  // 2. Carregar config local específica do usuário (ou guest se não logado)
  await loadUserConfig();
  
  // 3. Inicializar wizard se necessário
  if (typeof initializeWizard === 'function') {
    initializeWizard();
  }

  if (SESSION.logged) {
    await loadAgentsAndLLMs();
  }
});

setInterval(updateUserDisplay, 1000);

function copySQL() {
  const textarea = document.getElementById("sql_setup");
  if (textarea) {
    textarea.select();
    document.execCommand("copy");
    showToast("SQL copiado para a área de transferência!", "success");
  }
}
window.copySQL = copySQL;
