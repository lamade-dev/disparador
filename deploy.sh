#!/bin/bash
set -e

echo "🚀 WhatsApp Disparador — Deploy"
echo "================================"

cd "$(dirname "$0")/infra"

if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado em infra/"
  echo "   Copie .env.example para .env e preencha os valores"
  exit 1
fi

echo "📦 Build das imagens Docker..."
docker compose build --no-cache

echo "⬆️  Iniciando serviços..."
docker compose up -d

echo "⏳ Aguardando banco de dados..."
sleep 10

echo "🔑 Criando usuário master..."
docker compose exec backend npx tsx src/prisma/seed.ts 2>/dev/null || true

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "Acesse: http://localhost"
echo "Login: master@disparador.com / master123"
echo ""
echo "Evolution API: http://localhost:8080"
