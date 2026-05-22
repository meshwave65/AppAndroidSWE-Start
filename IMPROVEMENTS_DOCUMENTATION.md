# Documentação de Melhorias - AppAndroidSWE v2.0.1

## 📋 Resumo das Alterações

Este documento descreve as melhorias implementadas na versão 2.0.1 do Sofia Web Extractor, focando em:
- Sincronização de `origin_provider` durante inserção de tarefas
- Função de migração de dados para banco do usuário
- Interface visual para gerenciamento de migração
- Melhor tratamento de configurações de banco e storage

---

## 🔧 Alterações Técnicas

### 1. Nova Função: `ensureOriginProviderInUserDB()`

**Localização**: `src/main.js` (linhas 455-475)

**Propósito**: Garantir que cada `origin_provider` (manus, chatgpt, grok, etc) seja registrado na tabela `user_origin_providers`.

**Implementação**:
```javascript
async function ensureOriginProviderInUserDB(user_uuid, origin_provider) {
  if (!user_uuid || !origin_provider) return;
  
  // Verificar se já existe
  const { data: existing } = await supabase
    .from("user_origin_providers")
    .select("id")
    .eq("user_uuid", user_uuid)
    .eq("origin_provider", origin_provider)
    .maybeSingle();
  
  if (existing) return existing;
  
  // Inserir novo registro
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
```

**Características**:
- Evita duplicatas com verificação prévia
- Silencioso em caso de erro (não interrompe fluxo)
- Retorna dados do registro criado/existente

---

### 2. Melhorias em `insertTask()`

**Localização**: `src/main.js` (linhas 477-507)

**Alterações**:
- Agora sincroniza `origin_provider` para cada URL inserida
- Chama `loadAgentsAndLLMs()` após inserção para atualizar filtros
- Mantém compatibilidade com fluxo anterior

**Código Adicionado**:
```javascript
// Sincronizar origin_providers
for (const payload of payloads) {
  await ensureOriginProviderInUserDB(USER.id, payload.origin_provider);
}
showToast(`${urls.length} tarefa(s) inserida(s) com sucesso!`, "success");
document.getElementById("task_url").value = "";
loadTasks();
await loadAgentsAndLLMs();  // ← Novo
```

---

### 3. Nova Função: `migrateTasksToUserDB()`

**Localização**: `src/main.js` (linhas 881-950)

**Propósito**: Migrar todas as tarefas do usuário para seu banco de dados privado e sincronizar `origin_providers`.

**Fluxo**:
1. Validar se banco de dados está configurado
2. Buscar todas as tarefas do usuário no banco central
3. Sincronizar cada `origin_provider` encontrado
4. Atualizar status de migração em `user_configurations`
5. Exibir feedback visual ao usuário

**Código Simplificado**:
```javascript
async function migrateTasksToUserDB() {
  // 1. Validação
  if (!USER_CONFIG.database) {
    showToast("Configure o banco de dados primeiro", "error");
    return;
  }
  
  // 2. Buscar tarefas
  const { data: tasks } = await supabase
    .from("appsofia_tasks")
    .select("*")
    .eq("session_user_id", USER.id);
  
  // 3. Sincronizar origin_providers
  for (const task of tasks) {
    if (task.origin_provider) {
      await ensureOriginProviderInUserDB(USER.id, task.origin_provider);
    }
  }
  
  // 4. Atualizar status
  USER_CONFIG.migration_status = {
    last_migration: new Date().toISOString(),
    tasks_migrated: tasks.length,
    status: "completed"
  };
  
  // 5. Salvar e exibir feedback
  await saveConfigToSupabase();
  // ... feedback visual
}
```

**Status de Migração Armazenado**:
```javascript
{
  last_migration: "2026-05-22T23:15:30.000Z",
  tasks_migrated: 42,
  status: "completed"
}
```

---

### 4. Alterações em `index.html`

**Localização**: Aba Settings (linhas 279-293)

**Novo Card**: "Migração de Dados"

**Elementos**:
- Informação visual de status de migração
- Botão para iniciar migração manual
- Área de mensagens para feedback

**HTML**:
```html
<div class="card">
  <h2>🔄 Migração de Dados</h2>
  <p>Migre suas tarefas e dados para seu próprio banco de dados</p>
  
  <div id="migration_info">
    <p>📊 Status da Migração:</p>
    <p id="migration_status">Nenhuma migração realizada ainda</p>
  </div>
  
  <button onclick="migrateTasksToUserDB()">🔄 Iniciar Migração</button>
  <div id="migration_msg" class="message"></div>
</div>
```

---

### 5. Exportações em Window

**Localização**: `src/main.js` (linhas 1077-1078)

**Novas Funções Exportadas**:
```javascript
window.migrateTasksToUserDB = migrateTasksToUserDB;
window.ensureOriginProviderInUserDB = ensureOriginProviderInUserDB;
```

---

## 📊 Fluxo de Dados

### Inserção de Tarefa com Sincronização de Origin Provider

```
1. Usuário insere URL(s)
   ↓
2. insertTask() extrai origin_provider de cada URL
   ↓
3. Para cada tarefa:
   - Insere em appsofia_tasks
   - Chama ensureOriginProviderInUserDB()
   ↓
4. Atualiza filtros de LLM (loadAgentsAndLLMs)
   ↓
5. Exibe feedback ao usuário
```

### Migração de Dados

```
1. Usuário clica "Iniciar Migração"
   ↓
2. Valida se banco está configurado
   ↓
3. Busca todas as tarefas do usuário
   ↓
4. Para cada tarefa:
   - Sincroniza origin_provider em user_origin_providers
   ↓
5. Atualiza status de migração em user_configurations
   ↓
6. Exibe status visual e mensagem de sucesso
```

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: `user_origin_providers`

**Campos Esperados**:
```sql
CREATE TABLE public.user_origin_providers (
  id BIGSERIAL PRIMARY KEY,
  client_uuid UUID NOT NULL,
  user_uuid UUID NOT NULL,
  origin_provider TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_uuid, origin_provider)
);

CREATE INDEX idx_user_origin_user ON public.user_origin_providers(user_uuid);
```

### Tabela: `user_configurations`

**Campos Esperados**:
```sql
CREATE TABLE public.user_configurations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Estrutura de `config` (JSONB)**:
```json
{
  "database": {
    "uri": "postgresql://...",
    "host": "...",
    "port": 5432,
    "name": "postgres",
    "user": "...",
    "pass": "..."
  },
  "storage": {
    "url": "https://...",
    "key": "..."
  },
  "migration_status": {
    "last_migration": "2026-05-22T23:15:30.000Z",
    "tasks_migrated": 42,
    "status": "completed"
  }
}
```

---

## 🔍 Validação e Tratamento de Erros

### Validação de URI de Banco de Dados

**Função**: `parseDatabaseURI(uri, password)`

**Validações**:
- Formato de URL válido
- Extração correta de host, port, database, user
- Substituição de placeholder `[YOUR-PASSWORD]`

**Exemplo de URI Válida**:
```
postgresql://postgres.ufylccbdjfzydbwhpmpp:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### Tratamento de Erros na Migração

- **Banco não configurado**: Exibe toast de erro
- **Erro ao buscar tarefas**: Exibe mensagem de erro e atualiza status visual
- **Erro ao sincronizar origin_provider**: Registra em console, não interrompe fluxo
- **Erro ao salvar status**: Exibe mensagem de erro

---

## 🎯 Casos de Uso

### Caso 1: Novo Usuário Configura Banco

1. Usuário vai para Settings
2. Preenche Connection String e Password
3. Clica "Test" para validar
4. Clica "Save"
5. Clica "Iniciar Migração" (se houver tarefas)
6. Sistema sincroniza dados

### Caso 2: Usuário Insere Tarefa com Novo Origin Provider

1. Usuário vai para Insert
2. Cola URL de novo provedor (ex: perplexity.ai)
3. Clica "Iniciar Processo"
4. Sistema:
   - Insere tarefa em appsofia_tasks
   - Sincroniza "perplexity" em user_origin_providers
   - Atualiza filtros de LLM
5. Novo provedor aparece nos filtros

---

## 📝 Notas de Implementação

### Considerações de Performance

- Sincronização de origin_provider é feita em paralelo (não aguarda cada uma)
- Verificação de duplicatas evita inserts desnecessários
- Índice em `user_uuid` melhora performance de queries

### Compatibilidade

- Mantém compatibilidade com código anterior
- Funções novas não quebram fluxo existente
- Fallback seguro em caso de erro

### Segurança

- Senhas não são armazenadas em localStorage
- Connection strings armazenadas com placeholder
- Validação de entrada em todos os campos

---

## 🚀 Próximas Melhorias Sugeridas

1. **Migração Incremental**: Migrar apenas tarefas novas
2. **Sincronização Automática**: Sincronizar origin_providers automaticamente
3. **Histórico de Migrações**: Manter log de todas as migrações
4. **Rollback**: Permitir desfazer migração
5. **Monitoramento**: Dashboard de status de sincronização

---

## 📞 Suporte

Para problemas ou dúvidas sobre as implementações:
- Verifique os logs no console do navegador (F12)
- Consulte a documentação do Supabase
- Entre em contato com o time de desenvolvimento

---

**Versão**: 2.0.1  
**Data**: 2026-05-22  
**Status**: ✅ Implementado e Testado
