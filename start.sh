#!/bin/bash
# Elemental Pro Help Desk - Quick Start Script

echo "╔════════════════════════════════════════════╗"
echo "║   Elemental Pro - Help Desk System         ║"
echo "║   Quick Start                              ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Copy env files if not exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from example"
fi

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "✅ Created backend/.env from example"
fi

if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env.local
  echo "✅ Created frontend/.env.local from example"
fi

echo ""
echo "🐳 Starting Docker containers..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for backend to be ready (up to 60s)..."
for i in $(seq 1 12); do
  sleep 5
  if docker exec ticket_backend sh -c "curl -s http://localhost:3001/api/v1 > /dev/null 2>&1 || wget -q -O- http://localhost:3001/api/v1 > /dev/null 2>&1"; then
    echo "Backend ready!"
    break
  fi
  echo "  Still waiting... ($((i*5))s)"
done

echo ""
echo "🌱 Running database seed..."
docker exec ticket_backend sh -c "npx ts-node prisma/seed.ts"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   SYSTEM READY!                            ║"
echo "╠════════════════════════════════════════════╣"
echo "║   Frontend:  http://localhost:3000         ║"
echo "║   Backend:   http://localhost:3001         ║"
echo "║   API Docs:  http://localhost:3001/api/docs║"
echo "╠════════════════════════════════════════════╣"
echo "║   Login: admin@elementalpro.cl             ║"
echo "║   Pass:  Admin1234!                        ║"
echo "╚════════════════════════════════════════════╝"
