# Brave Search

> Web, local, video, image, and news search with AI summaries. Privacy-focused alternative to Google search. Free tier available (1 req/sec, 2000/month). Includes local POI search with ratings and reviews. Requires BRAVE_API_KEY.

- **Transport**: stdio
- **Command**: `npx -y @brave/brave-search-mcp-server`
- **Author**: Brave Software
- **Status**: active

## Tools Exposed

- `brave_web_search` — Search the web
- `brave_local_search` — Search local businesses and POIs
- `brave_news_search` — Search news articles
- `brave_image_search` — Search images
- `brave_video_search` — Search videos
- `brave_summarize` — Get AI-generated summaries

## Configuration

Requires `BRAVE_API_KEY` environment variable. Get a free API key at [brave.com/search/api](https://brave.com/search/api/).

```json
{
  "command": "npx",
  "args": ["-y", "@brave/brave-search-mcp-server"],
  "env": {
    "BRAVE_API_KEY": "<your-api-key>"
  }
}
```

Free tier: 1 request/second, 2,000 requests/month.
