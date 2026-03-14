#!/usr/bin/env bash
set -euo pipefail

echo "[1/2] Extension syntax (node --check)"
if command -v node >/dev/null 2>&1; then
  node --check extension/content.js
  node --check extension/background.js
  node --check extension/popup.js
else
  echo "WARN: node not found; skipping extension checks"
fi

echo "[2/2] Backend syntax (py_compile)"
if [ -x "backend/venv/bin/python" ]; then
  backend/venv/bin/python -m py_compile \
    backend/app/main.py \
    backend/app/api/endpoints.py \
    backend/app/services/behavioral.py \
    backend/app/services/linguistic.py \
    backend/app/services/visual.py
else
  echo "WARN: backend/venv/bin/python not found; skipping backend checks"
fi

echo "OK"
