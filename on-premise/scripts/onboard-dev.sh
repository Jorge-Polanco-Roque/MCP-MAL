#!/bin/bash
set -euo pipefail

echo "MAL MCP Hub — Developer Onboarding (On-Premise)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Detect Claude Code settings location
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$(dirname "$CLAUDE_SETTINGS")"

echo ""
echo "Select connection mode:"
echo "  1) stdio (recommended — Claude Code launches the server)"
echo "  2) HTTP  (you run the server separately)"
read -p "Choice [1/2]: " MODE

if [ "$MODE" = "2" ]; then
  read -p "API Key (from .env): " API_KEY
  read -p "Host [localhost]: " HOST
  HOST=${HOST:-localhost}
  read -p "Port [3000]: " PORT
  PORT=${PORT:-3000}

  echo "Add this to your Claude Code settings ($CLAUDE_SETTINGS):"
  echo ""
  cat <<EOF
{
  "mcpServers": {
    "mal-hub": {
      "type": "url",
      "url": "http://${HOST}:${PORT}/mcp",
      "headers": {
        "x-api-key": "${API_KEY}"
      }
    }
  }
}
EOF
else
  echo "Add this to your Claude Code settings ($CLAUDE_SETTINGS):"
  echo ""
  cat <<EOF
{
  "mcpServers": {
    "mal-hub": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "${PROJECT_DIR}",
      "env": {
        "INFRA_MODE": "local",
        "TRANSPORT": "stdio"
      }
    }
  }
}
EOF
fi

echo ""
echo "Done! Restart Claude Code to connect."
