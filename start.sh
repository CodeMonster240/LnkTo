#!/usr/bin/env bash
# Convenience wrapper — exactly like `npm start`.
#   ./start.sh         # uses system python
#   ./start.sh venv    # uses ./.venv/bin/python if it exists
set -e
if [ "$1" = "venv" ] && [ -x "./.venv/bin/python" ]; then
    PY="./.venv/bin/python"
elif [ -x "./.venv/bin/python" ]; then
    PY="./.venv/bin/python"
else
    PY="python"
fi
echo "[start.sh] Using interpreter: $($PY -V)"
exec "$PY" run.py