# 🚀 AppAndroidSWE-Start (Sofia Web Extractor)
> **SWE START (Setup & Workspace Evolution Layer)**

O **AppAndroidSWE-Start** é a evolução do sistema Sofia Web Extractor, focado em **"Zero-friction workspace setup"**. O objetivo principal é automatizar a criação e configuração de infraestrutura privada (Supabase + Storage + Database) para que o usuário possa iniciar suas extrações em segundos.

---

## 🌟 Principais Funcionalidades (START Phase)

### 1. 🧙‍♂️ Workspace Setup Wizard
Um assistente guiado de 3 etapas que automatiza a configuração inicial:
- **Etapa 1:** Configuração de URL e Anon Key do Supabase.
- **Etapa 2:** Configuração da Connection String (URI) do Banco de Dados.
- **Etapa 3:** Resumo e validação automática de conexões.

### 2. 💻 Sofia Terminal (CLI Integrada)
Um terminal interativo dentro da aba de configurações para usuários avançados e engenheiros:
- `sofia-init`: Inicia o processo completo de bootstrap do workspace.
- `status`: Verifica a integridade da conexão e infraestrutura.
- `ls`: Lista componentes do workspace.
- `help`: Mostra todos os comandos disponíveis.

### 3. 🔧 Bootstrap Automático
- **Storage:** Criação automática do bucket `sofia_storage_user`.
- **Database:** Geração de script SQL otimizado para criação das tabelas `appsofia_tasks`, `user_agents` e `user_origin_providers`.
- **Deep Linking:** Botão direto para o SQL Editor do seu projeto Supabase.

### 4. 🛠️ Script de Setup Local
Para desenvolvedores que preferem o terminal local:
```bash
# Navegue até a pasta do projeto
cd scripts
# Configure suas variáveis no setup_db.js ou .env
node setup_db.js
```

---

## 🚀 Como Iniciar

1. **Clone o Repositório:**
   ```bash
   git clone https://github.com/meshwave65/AppAndroidSWE-Start.git
   ```

2. **Acesse a Aba de Configurações:**
   O sistema detectará automaticamente se é sua primeira vez e iniciará o **Setup Wizard**.

3. **Configure seu Supabase:**
   Siga as etapas do Wizard ou utilize o **Sofia Terminal** digitando `sofia-init`.

4. **Execute o SQL:**
   O sistema copiará o script necessário. Cole-o no SQL Editor do seu Supabase e pronto! Seu ambiente privado está configurado.

---

## 📂 Estrutura do Projeto

- `src/main.js`: Controlador central com lógica de Terminal e Wizard.
- `src/lib/`: Módulos de integração (Supabase, Bootstrap).
- `scripts/`: Scripts de automação para execução local.
- `assets/`: Estilos e recursos visuais.

---

## 🛡️ Segurança e Privacidade

- **Local-First Config:** Suas credenciais do Supabase são salvas apenas no `localStorage` do seu navegador.
- **Zero Data Leak:** O sistema não envia suas chaves privadas para servidores externos.
- **Transparência:** Todo o processo de bootstrap é logado no terminal para auditoria do usuário.

---

## 📄 Licença

Este projeto é parte da evolução arquitetural **SWE START**. Desenvolvido por MeshWave.

---
*Atualizado em: 25 de Maio de 2026*
