# Análise: Configurações Vinculadas ao Usuário

**Data**: 2026-05-25  
**Prioridade**: 🔴 CRÍTICA  
**Status**: Identificado e Pronto para Implementação

---

## 🎯 Problema Identificado

### Cenário Problemático
Quando **múltiplos usuários fazem login no mesmo dispositivo**, o sistema carrega as configurações de storage/database do **primeiro usuário** para **todos os usuários subsequentes**, pois as configurações estão armazenadas apenas em `localStorage` com uma chave única.

### Exemplo
```
1. Usuário A faz login → Configura seu Storage/DB → Salva em localStorage
2. Usuário A faz logout
3. Usuário B faz login → localStorage ainda contém dados de A
4. Usuário B vê as configurações de A (PROBLEMA!)
```

---

## 📊 Estado Atual do Código

### Como funciona hoje:
```javascript
const CONFIG_STORAGE_KEY = "sofia_user_config";  // ❌ Chave única para todos

let USER_CONFIG = {
  database: null,
  storage: null
};

async function loadUserConfig() {
  const localData = localStorage.getItem(CONFIG_STORAGE_KEY);  // ❌ Sem identificação de usuário
  if (localData) {
    USER_CONFIG = { ...USER_CONFIG, ...JSON.parse(localData) };
  }
  populateConfigFields();
  updateConfigStatus();
}

async function saveUserConfig() {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(USER_CONFIG));  // ❌ Salva sem usuário
}
```

### Problema na função `login()`:
```javascript
async function login() {
  // ... validações ...
  SESSION.logged = true;
  USER = {
    id: data.user.id,
    user_name: client.user_name,
    full_name: client.full_name,
    email: client.email
  };
  
  // ❌ Carrega config DEPOIS de setar USER, mas sem usar USER.id
  await loadAgentsAndLLMs();
  await loadTasks();
  await loadFiles();
}
```

---

## ✅ Solução Proposta

### 1. **Vincular Configurações ao Usuário**

Modificar a chave de armazenamento para incluir o ID do usuário:

```javascript
function getConfigStorageKey(userId) {
  return `sofia_user_config_${userId}`;
}

async function loadUserConfig() {
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
      console.log(`Configurações carregadas para ${USER.user_name}`);
    } catch (e) {
      console.error("Erro ao ler config local:", e);
    }
  }
  
  populateConfigFields();
  updateConfigStatus();
}

async function saveUserConfig() {
  if (!USER.id) {
    console.warn("USER.id not set, cannot save config");
    return;
  }
  
  const storageKey = getConfigStorageKey(USER.id);
  localStorage.setItem(storageKey, JSON.stringify(USER_CONFIG));
  console.log(`Configurações salvas para ${USER.user_name}`);
}
```

### 2. **Atualizar Função `login()`**

Garantir que `USER.id` está definido ANTES de carregar configurações:

```javascript
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
  
  // ✅ AGORA carrega config APÓS setar USER.id
  await loadUserConfig();
  
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
```

### 3. **Atualizar Função `restoreSession()`**

Garantir que `USER.id` está definido ANTES de carregar configurações:

```javascript
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

    // ✅ Carregar config APÓS setar USER.id
    await loadUserConfig();
    
    updateUserDisplay();
    await loadAgentsAndLLMs();
    await loadTasks();
    await loadFiles();
  } catch (error) {
    console.error("Session restore error:", error);
  }
}
```

### 4. **Atualizar Função `clearUserConfig()`**

Limpar apenas as configurações do usuário atual:

```javascript
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
  }
}
```

### 5. **Atualizar Função `logout()`** (se existir)

```javascript
async function logout() {
  // Limpar dados do usuário
  USER_CONFIG = { database: null, storage: null };
  USER = { id: null, user_name: "guest", full_name: "Guest User", email: null };
  SESSION.logged = false;
  
  // Fazer logout no Supabase
  await supabase.auth.signOut();
  
  // Voltar para login
  showTab(1);
  showToast("Logout realizado", "success");
}
```

---

## 🔄 Fluxo de Funcionamento Corrigido

```
┌─────────────────────────────────────────────────────────┐
│ App Inicia                                              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ restoreSession()              │
        │ (tenta restaurar sessão)     │
        └──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   ┌─────────────┐            ┌──────────────┐
   │ Sessão OK   │            │ Sem Sessão   │
   │ USER.id set │            │ Mostra Login │
   └─────────────┘            └──────────────┘
        │
        ▼
   ┌─────────────────────────────┐
   │ loadUserConfig()             │
   │ (usa USER.id como chave)    │
   └─────────────────────────────┘
        │
        ▼
   ┌─────────────────────────────┐
   │ localStorage[               │
   │  "sofia_user_config_<ID>"   │
   │ ]                           │
   └─────────────────────────────┘
        │
        ▼
   ┌─────────────────────────────┐
   │ USER_CONFIG carregado       │
   │ (específico do usuário)     │
   └─────────────────────────────┘
```

---

## 📋 Checklist de Implementação

- [ ] Criar função `getConfigStorageKey(userId)`
- [ ] Atualizar `loadUserConfig()` para usar chave com USER.id
- [ ] Atualizar `saveUserConfig()` para usar chave com USER.id
- [ ] Atualizar `clearUserConfig()` para usar chave com USER.id
- [ ] Atualizar `login()` para chamar `loadUserConfig()` APÓS setar USER.id
- [ ] Atualizar `restoreSession()` para chamar `loadUserConfig()` APÓS setar USER.id
- [ ] Implementar função `logout()` se não existir
- [ ] Testar com múltiplos usuários no mesmo dispositivo
- [ ] Testar logout e login de outro usuário
- [ ] Verificar localStorage após cada operação

---

## 🧪 Testes Recomendados

### Teste 1: Múltiplos Usuários
1. Usuário A faz login
2. Usuário A configura Storage/DB
3. Usuário A faz logout
4. Usuário B faz login
5. **Esperado**: Usuário B vê campos vazios (não as configs de A)

### Teste 2: Persistência por Usuário
1. Usuário A faz login
2. Usuário A configura Storage/DB
3. Usuário A faz logout
4. Usuário A faz login novamente
5. **Esperado**: Usuário A vê suas próprias configs

### Teste 3: localStorage Isolation
1. Abrir DevTools → Application → Local Storage
2. Fazer login com Usuário A
3. Configurar Storage/DB
4. **Esperado**: `sofia_user_config_<ID_A>` existe
5. Fazer logout e login com Usuário B
6. **Esperado**: `sofia_user_config_<ID_B>` é criada (separada de A)

---

## 📝 Notas Importantes

1. **Timing Crítico**: `USER.id` DEVE estar definido ANTES de chamar `loadUserConfig()`
2. **Logout**: Sempre limpar `USER_CONFIG` ao fazer logout
3. **localStorage Limit**: Cada usuário terá sua própria entrada (~1-2KB cada)
4. **Segurança**: As senhas continuam armazenadas localmente (considerar criptografia em produção)

---

**Versão**: 1.0  
**Status**: Pronto para Implementação  
**Impacto**: CRÍTICO para suportar múltiplos usuários
