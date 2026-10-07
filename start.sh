#!/usr/bin/env bash
# Convenience wrapper — exactly like `npm start`.
#   ./start.sh         # uses the system node
set -e
if ! command -v node >/dev/null 2>&1; then
  echo "[start.sh] node not found in PATH. Install Node.js >= 18 first." >&2
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "[start.sh] Installing dependencies (one-time)..."
  npm install
fi
echo "[start.sh] Using node: $(node -v)"
exec npm start