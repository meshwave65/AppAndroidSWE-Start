# Análise: Falha de Privacidade e Segurança (Vazamento de Dados)

**Data**: 2026-05-25  
**Prioridade**: 🚨 CRÍTICA / BLOQUEANTE  
**Status**: Identificado e Pronto para Correção

---

## 🎯 Problema Identificado

O sistema apresenta falhas graves onde dados de um usuário (tarefas, arquivos, agentes e provedores) podem ser visualizados por outros usuários. A filtragem por `user_id` ou `user_uuid` não está sendo aplicada consistentemente em todas as consultas ao banco de dados e chamadas de API.

---

## 🔍 Pontos de Vazamento Identificados

### 1. Busca Global (`performSearch`)
A função de busca chama a API central sem passar o ID único do usuário do Supabase Auth, apenas o `user_name` (que pode não ser único ou ser forjado).
- **Local**: `src/main.js` -> `performSearch()`
- **Código Atual**:
  ```javascript
  const url = `${API_BASE_URL}/search?q=${query}&user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
  ```
- **Risco**: Se o backend não validar o `user_name` contra a sessão, qualquer um pode buscar dados de qualquer `user_name`.

### 2. Listagem de Arquivos (`loadFiles`)
Similar à busca, a listagem de arquivos usa apenas `user_name`.
- **Local**: `src/main.js` -> `loadFiles()`
- **Código Atual**:
  ```javascript
  const url = `${API_BASE_URL}/files?user_name=${USER.user_name}&client_id=${MESH_WAVE_UUID}`;
  ```

### 3. Filtros de Agentes e LLMs (`loadAgentsAndLLMs`)
As consultas ao Supabase para preencher os selects de filtro não possuem cláusula `.eq("user_uuid", USER.id)`.
- **Local**: `src/main.js` -> `loadAgentsAndLLMs()`
- **Código Atual**:
  ```javascript
  const { data: agentsData } = await supabase.from("user_agents").select("agent_name");
  const { data: llmData } = await supabase.from("user_origin_providers").select("origin_provider");
  ```
- **Risco**: Um usuário vê a lista de todos os agentes e provedores de todos os usuários do sistema.

---

## ✅ Plano de Correção

### 1. Corrigir `loadAgentsAndLLMs`
Adicionar filtro por `user_uuid` ou `session_user_id` em todas as consultas.

```javascript
async function loadAgentsAndLLMs() {
  if (!SESSION.logged) return;
  // FILTRAR POR USER.id
  const { data: agentsData } = await supabase
    .from("user_agents")
    .select("agent_name")
    .eq("user_uuid", USER.id) // <--- ADICIONAR
    .order("agent_name", { ascending: true });
    
  // ...
  
  const { data: llmData } = await supabase
    .from("user_origin_providers")
    .select("origin_provider")
    .eq("user_uuid", USER.id) // <--- ADICIONAR
    .order("origin_provider", { ascending: true });
}
```

### 2. Corrigir `performSearch` e `loadFiles`
Passar o `user_uuid` (ID do Supabase Auth) nas chamadas de API para que o backend possa filtrar corretamente.

```javascript
// performSearch
const url = `${API_BASE_URL}/search?q=${query}&user_uuid=${USER.id}&user_name=${USER.user_name}...`;

// loadFiles
const url = `${API_BASE_URL}/files?user_uuid=${USER.id}&user_name=${USER.user_name}...`;
```

### 3. Revisar `loadTasks`
Embora `loadTasks` já pareça usar `session_user_id`, devemos garantir que ele sempre use `USER.id`.

---

## 🛠️ Implementação Imediata

Vou aplicar as correções no arquivo `src/main.js` agora.
