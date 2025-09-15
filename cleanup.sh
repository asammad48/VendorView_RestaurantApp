#!/bin/bash
echo "🧹 Replit Cleanup Script Running..."

# Step 1: Kill zombie processes (node, python, dotnet)
echo "👉 Killing zombie processes..."
pkill -9 node 2>/dev/null
pkill -9 python 2>/dev/null
pkill -9 dotnet 2>/dev/null

# Step 2: Clean caches & build artifacts
echo "👉 Cleaning caches..."
rm -rf node_modules/.cache
rm -rf bin/ obj/
rm -rf __pycache__ .pytest_cache
rm -rf .next dist build

# Step 3: Clean dependencies (optional - only if you want to prune)
if [ -f "package.json" ]; then
  echo "👉 Cleaning Node.js dependencies..."
  npm prune
  npm dedupe
fi

if [ -f "requirements.txt" ]; then
  echo "👉 Cleaning Python dependencies..."
  pip cache purge
fi

# Step 4: Show usage
echo "✅ Cleanup complete. Current processes:"
htop
