#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════╗"
echo "║        CoachIQ Setup             ║"
echo "╚══════════════════════════════════╝"
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌  Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi

echo "✓  Node.js $(node -v)"

# Install deps
echo ""
echo "→  Installing dependencies..."
npm install

# Build shared types
echo ""
echo "→  Building shared types..."
npm run build --workspace=packages/shared

echo ""
echo "✅  Ready! Starting dev servers..."
echo ""
echo "   Frontend → http://localhost:3000"
echo "   API      → http://localhost:3001"
echo ""
echo "   First time? Run the SQL schema:"
echo "   Copy scripts/schema.sql into your Supabase SQL Editor and run it."
echo ""

# Start both servers
npm run dev
