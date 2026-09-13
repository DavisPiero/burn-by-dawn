#!/usr/bin/env bash
# Serve the game locally. ES modules are blocked over file://, so it needs a server.
# Usage: ./run.sh          (then open http://localhost:8000)
#        ./run.sh 9000     (to use a different port)

set -euo pipefail

PORT="${1:-8000}"
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. It ships with macOS; on Linux install it, or use any other"
  echo "static file server pointed at this directory."
  exit 1
fi

echo "Serving on http://localhost:${PORT}  (ctrl-C to stop)"

# Open a browser once the server is up, on macOS.
if command -v open >/dev/null 2>&1; then
  ( sleep 1; open "http://localhost:${PORT}" ) &
fi

python3 -m http.server "${PORT}"
