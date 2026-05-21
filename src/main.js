/**
 * ============================================================
 * SOFIA WEB EXTRACTOR - MOBILE FIRST
 * ============================================================
 *
 * Version: 2.0.0 (Mobile-First)
 * Updated: 2026-05-21
 *
 * Description:
 * Core frontend controller for task orchestration, file
 * navigation, authentication session handling and API
 * integration with appsofia.meshwave.com.br.
 * Fully optimized for mobile devices with responsive design.
 */

"use strict";

import "./style.css";

// ============================================================
// CONSTANTS
// ============================================================
const MESH_WAVE_UUID = "7891b8f4-68cc-4344-89e1-c000b80918bb";
const API_BASE_URL = "https://appsofia.meshwave.com.br";
const SUPABASE_URL = "https://your-supabase-url.supabase.co";
const SUPABASE_KEY = "your-supabase-key";

// ============================================================
// STATE MANAGEMENT
// ============================================================
let USER = {
  id: null,
  user_name: "guest",
  full_name: "Guest User",
  email: null
};

let SESSION = { logged: false };
let TASKS = [];
let TASK_SELECTION = new Set();
let FILES_DATA = [];
let SELECTED_FILE = null;

let SEARCH_MODE = "DEFAULT";
let SEARCH_MATCH_MODE = "PARTIAL";
let SEARCH_RESULTS = [];
let AGENTS = [];
let LLM_PROVIDERS = [];

let FILE_FILTER_AGENT = "ALL";
let FILE_FILTER_LLM = "ALL";
let FILE_FILTER_SLUG = "";

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.remove("active");
  });
  const el = document.getElementById("tab" + n);
  if (el) {
    el.classList.add("active");
    // Update nav button active state
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

function hideMessage(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.classList.remove("show");
  }
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

function updateUserDisplay() {
  const name = USER.full_name || USER.user_name || "Guest";
  const headerEl = document.getElementById("headerUserName");
  if (headerEl) headerEl.textContent = name;
}

// ============================================================
// MOCK SUPABASE (Replace with real Supabase client)
// ============================================================

const supabase = {
  from: (table) => ({
    select: (fields) => ({
      eq: (field, value) => ({
        maybeSingle: async () => ({ data: null, error: null }),
        order: (field, opts) => ({
          then: async (cb) => cb({ data: [], error: null })
        })
      }),
      order: (field, opts) => ({
        then: async (cb) => cb({ data: [], error: null })
      })
    }),
    insert: (data) => ({
      select: () => ({
        maybeSingle: async () => ({ data: null, error: null })
      })
    }),
    update: (data) => ({
      eq: (field, value) => ({
        then: async (cb) => cb({ data: null, error: null })
      })
    })
  }),
  auth: {
    signInWithPassword: async (credentials) => ({
      data: { user: null },
      error: null
    }),
    signUp: async (credentials) => ({
      data: { user: null },
      error: null
    }),
    getSession: async () => ({
      data: { session: null }
    })
  }
};

// ============================================================
// AUTHENTICATION
// ============================================================

async function login() {
  const identifier = document.getElementById("login_email")?.value?.trim();
  const password = document.getElementById("login_pass")?.value;

  if (!identifier || !password) {
    showMessage("auth_msg", "Preencha os campos", "error");
    return;
  }

  try {
    // Mock login - Replace with real Supabase call
    SESSION.logged = true;
    USER = {
      id: "user_" + Date.now(),
      user_name: identifier.split("@")[0],
      full_name: "Test User",
      email: identifier
    };

    updateUserDisplay();
    showToast("Login realizado com sucesso!", "success");
    showTab(3);
    await loadAgentsAndLLMs();
    await loadTasks();
    await loadFiles();
  } catch (error) {
    showMessage("auth_msg", "Erro ao fazer login", "error");
  }
}

async function registerUser() {
  const fullName = document.getElementById("reg_fullname")?.value?.trim();
  const email = document.getElementById("reg_email")?.value?.trim().toLowerCase();
  const customUsername = document.getElementById("reg_username")?.value?.trim();
  const code = document.getElementById("reg_code")?.value?.trim()?.toUpperCase();
  const pass = document.getElementById("reg_pass")?.value;
  const pass2 = document.getElementById("reg_pass2")?.value;

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

  try {
    // Mock registration - Replace with real Supabase call
    showMessage("reg_msg", "Conta criada com sucesso!", "success");
    setTimeout(() => showTab(1), 1500);
  } catch (error) {
    showMessage("reg_msg", "Erro ao criar conta", "error");
  }
}

async function restoreSession() {
  // Mock session restore - Replace with real Supabase call
  const savedUser = localStorage.getItem("sofia_user");
  if (savedUser) {
    try {
      USER = JSON.parse(savedUser);
      SESSION.logged = true;
      updateUserDisplay();
      await loadAgentsAndLLMs();
      await loadTasks();
      await loadFiles();
    } catch (e) {
      console.error("Failed to restore session:", e);
    }
  }
}

// ============================================================
// AGENTS & LLM
// ============================================================

async function loadAgentsAndLLMs() {
  if (!SESSION.logged) return;

  try {
    // Mock data - Replace with real Supabase call
    AGENTS = [
      { agent_name: "MeshWave Default" },
      { agent_name: "Custom Agent 1" }
    ];

    LLM_PROVIDERS = [
      { origin_provider: "chatgpt" },
      { origin_provider: "claude" },
      { origin_provider: "grok" }
    ];

    // Update agent selects
    const agentSelects = [
      document.getElementById("insert_agent"),
      document.getElementById("filter_agent")
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

    // Update LLM selects
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
  } catch (error) {
    console.error("Error loading agents and LLMs:", error);
  }
}

// ============================================================
// TASKS
// ============================================================

async function loadTasks() {
  if (!SESSION.logged) return;

  try {
    // Mock data - Replace with real API call
    TASKS = [
      {
        id: "task_001",
        full_url: "https://example.com/page-1",
        origin_provider: "chatgpt",
        agente: "MeshWave Default",
        status: "DONE",
        extractor_status: "DONE",
        downloader_status: "DONE",
        created_at: new Date().toISOString()
      }
    ];

    renderTasks();
  } catch (error) {
    console.error("Error loading tasks:", error);
  }
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
    const extStatus = t.extractor_status || t.status || "STAGED";
    const dwnStatus = t.downloader_status || t.status || "STAGED";

    const card = document.createElement("div");
    card.className = "task-card";
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
  if (cb.checked) {
    TASK_SELECTION.add(id);
  } else {
    TASK_SELECTION.delete(id);
  }
}

async function insertTask() {
  const rawValue = document.getElementById("task_url").value.trim();
  if (!rawValue) {
    showToast("URL(s) obrigatória(s)", "error");
    return;
  }

  const urls = rawValue.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
  if (urls.length === 0) {
    showToast("Nenhuma URL válida encontrada", "error");
    return;
  }

  const agentName = document.getElementById("agent_override").value || document.getElementById("insert_agent").value;

  try {
    // Mock insertion - Replace with real API call
    showToast(`${urls.length} tarefa(s) inserida(s) com sucesso!`, "success");
    document.getElementById("task_url").value = "";
    await loadTasks();
  } catch (error) {
    showToast("Erro ao inserir tarefa", "error");
  }
}

function handleFileUpload(event) {
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

// ============================================================
// FILES
// ============================================================

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

async function loadFiles() {
  if (!SESSION.logged) return;

  try {
    // Mock data - Replace with real API call
    FILES_DATA = [
      {
        provider: "chatgpt",
        tasks: [
          {
            task_id: "task_001",
            files: [
              { filename: "document_001.pdf", path: "/files/doc1.pdf" },
              { filename: "image_001.png", path: "/files/img1.png" }
            ]
          }
        ]
      }
    ];

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

  FILES_DATA.forEach(provider => {
    const providerDiv = document.createElement("div");
    providerDiv.className = "file-item";
    providerDiv.innerHTML = `📁 ${provider.provider}`;
    container.appendChild(providerDiv);

    (provider.tasks || []).forEach(task => {
      (task.files || []).forEach(file => {
        const fileDiv = document.createElement("div");
        fileDiv.className = "file-item";
        fileDiv.style.paddingLeft = "30px";
        fileDiv.innerHTML = `📄 ${file.filename.split("_").pop()}`;
        fileDiv.onclick = () => previewFile(file, fileDiv);
        container.appendChild(fileDiv);
      });
    });
  });
}

function previewFile(file, element) {
  SELECTED_FILE = file;
  document.querySelectorAll(".file-item").forEach(i => i.classList.remove("active"));
  element.classList.add("active");

  const preview = document.getElementById("filePreview");
  if (!preview) return;

  preview.innerHTML = "Carregando...";
  const ext = file.filename.split(".").pop().toLowerCase();

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    preview.innerHTML = `<img src="${file.path}" style="max-width:100%;">`;
  } else if (ext === "pdf") {
    preview.innerHTML = `<iframe src="${file.path}" style="width:100%;height:100%;border:none;"></iframe>`;
  } else if (["txt", "md", "json", "log", "csv"].includes(ext)) {
    preview.innerHTML = `<pre>Arquivo: ${file.filename}</pre>`;
  } else {
    preview.innerHTML = "Formato não suportado";
  }
}

function downloadFile(path) {
  window.open(`${API_BASE_URL}/api/file?path=${encodeURIComponent(path)}&download=true`, "_blank");
}

// ============================================================
// SEARCH
// ============================================================

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
    // Mock search - Replace with real API call
    SEARCH_RESULTS = [
      {
        filename: "document_001.pdf",
        task_id: "task_001",
        path: "/files/doc1.pdf"
      }
    ];

    renderSearchResults();
  } catch (error) {
    console.error("Error performing search:", error);
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
    item.onclick = () => previewSearchResult(result, item);
    container.appendChild(item);
  });
}

function previewSearchResult(result, element) {
  const preview = document.getElementById("filePreview");
  if (!preview) return;

  preview.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:48px;margin-bottom:10px;">📄</div>
      <div style="font-weight:bold;">${result.filename}</div>
      <div style="color:var(--muted);font-size:12px;margin-top:10px;">Task: ${result.task_id}</div>
      <button class="btn btn-primary" style="margin-top:15px;" onclick="downloadFile('${result.path}')">⬇️ Download</button>
    </div>
  `;
}

// ============================================================
// PROFILE
// ============================================================

async function saveProfile() {
  const updates = {
    full_name: document.getElementById("p_name")?.value?.trim(),
    email: document.getElementById("p_email")?.value?.trim(),
    tel: document.getElementById("p_tel")?.value?.trim(),
    company: document.getElementById("p_company")?.value?.trim(),
    role: document.getElementById("p_role")?.value?.trim()
  };

  try {
    // Mock save - Replace with real Supabase call
    USER = { ...USER, ...updates };
    localStorage.setItem("sofia_user", JSON.stringify(USER));
    showMessage("profile_msg", "Perfil atualizado com sucesso!", "success");
  } catch (error) {
    showMessage("profile_msg", "Erro ao atualizar perfil", "error");
  }
}

// ============================================================
// WINDOW EXPORTS
// ============================================================

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
window.previewFile = previewFile;
window.saveProfile = saveProfile;
window.toggleTaskSelection = toggleTaskSelection;
window.setFileAgentFilter = setFileAgentFilter;
window.setFileLLMFilter = setFileLLMFilter;
window.setFileSlugFilter = setFileSlugFilter;

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Show first tab by default
  showTab(1);

  // Try to restore session
  await restoreSession();

  if (SESSION.logged) {
    await loadAgentsAndLLMs();
  }
});

// Update user display periodically
setInterval(updateUserDisplay, 1000);
