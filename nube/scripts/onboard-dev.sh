#!/bin/bash
set -euo pipefail

echo "MAL MCP Hub — Developer Onboarding (GCP Cloud)"

read -p "Cloud Run URL (e.g. https://mal-mcp-hub-xxxxx-uc.a.run.app): " CLOUD_RUN_URL
read -p "Your API Key: " API_KEY

CLAUDE_SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$(dirname "$CLAUDE_SETTINGS")"

echo ""
echo "Add this to your Claude Code settings ($CLAUDE_SETTINGS):"
echo ""
cat <<EOF
{
  "mcpServers": {
    "mal-hub": {
      "type": "url",
      "url": "${CLOUD_RUN_URL}/mcp",
      "headers": {
        "x-api-key": "${API_KEY}"
      }
    }
  }
}
EOF

echo ""
echo "Done! Restart Claude Code to connect."
