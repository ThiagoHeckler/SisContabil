#!/bin/bash

echo "🚀 Iniciando setup do SisContabil..."

# Aguarda o MySQL estar pronto
echo "⏳ Aguardando MySQL..."
sleep 10

# Gera APP_KEY se não existir
echo "🔑 Gerando APP_KEY..."
docker exec siscontabil_api php artisan key:generate --force

# Roda as migrations
echo "📦 Rodando migrations..."
docker exec siscontabil_api php artisan migrate --force

# Otimiza para produção
echo "⚡ Otimizando..."
docker exec siscontabil_api php artisan optimize

echo "✅ SisContabil pronto!"
echo "🌐 Acesse: http://192.168.1.75:8080"
