# Playwright MCP

> Browser automation by Microsoft. Navigate, click, type, screenshot, fill forms, handle dialogs, generate PDFs, accessibility snapshots. Supports Chromium, Firefox, WebKit. Use --headless for CI, --vision for coordinate-based interactions.

- **Transport**: stdio
- **Command**: `npx @playwright/mcp@latest --headless`
- **Author**: Microsoft
- **Status**: active

## Tools Exposed

- `browser_navigate` — Navigate to a URL
- `browser_click` — Click an element
- `browser_type` — Type text into an element
- `browser_snapshot` — Take an accessibility snapshot
- `browser_take_screenshot` — Capture a screenshot
- `browser_evaluate` — Evaluate JavaScript in the browser
- `browser_pdf_save` — Save page as PDF
- `browser_tab_list` — List open tabs
- `browser_tab_new` — Open a new tab
- `browser_tab_close` — Close a tab
- `browser_select_option` — Select a dropdown option
- `browser_hover` — Hover over an element
- `browser_drag` — Drag an element
- `browser_press_key` — Press a keyboard key
- `browser_file_upload` — Upload a file
- `browser_handle_dialog` — Handle browser dialogs
- `browser_network_requests` — List network requests
- `browser_console_messages` — Get console messages
- `browser_resize` — Resize browser window
- `browser_wait_for` — Wait for a condition

## Configuration

```json
{
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless"]
}
```

Use `--vision` flag for coordinate-based interactions (requires screenshot analysis).
