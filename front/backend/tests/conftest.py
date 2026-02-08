import os

# Set test env vars before any imports
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
os.environ.setdefault("MCP_SERVER_URL", "http://localhost:3000/mcp")
os.environ.setdefault("MCP_API_KEY", "test-key")
