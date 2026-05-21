#!/bin/bash

# =============================================
# Script para criar estrutura AppAndroidSWE
# =============================================

DIR="AppAndroidSWE"

echo "🚀 Criando estrutura para AppAndroidSWE..."

# Criar diretório principal
mkdir -p $DIR

# Criar subdiretórios
mkdir -p $DIR/assets/icons
mkdir -p $DIR/assets/css
mkdir -p $DIR/src

# Criar arquivos vazios
touch $DIR/index.html
touch $DIR/manifest.json
touch $DIR/sw.js
touch $DIR/assets/css/style.css
touch $DIR/src/main.js
touch $DIR/README.md

# Criar arquivos de ícones placeholder (para evitar erro)
touch $DIR/assets/icons/icon-192.png
touch $DIR/assets/icons/icon-512.png
touch $DIR/assets/icons/splash.png

echo "✅ Estrutura criada com sucesso!"
echo ""
echo "📁 Estrutura final:"
echo "AppAndroidSWE/"
echo "├── index.html"
echo "├── manifest.json"
echo "├── sw.js"
echo "├── assets/"
echo "│   ├── icons/ (icon-192.png, icon-512.png, splash.png)"
echo "│   └── css/style.css"
echo "├── src/main.js"
echo "└── README.md"
echo ""
echo "Agora é só preencher os arquivos!"
