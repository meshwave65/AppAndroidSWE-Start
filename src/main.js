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
