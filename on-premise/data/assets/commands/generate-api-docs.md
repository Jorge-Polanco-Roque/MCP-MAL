# Generate API Docs

> Extract OpenAPI schema from FastAPI backend and save as markdown. Requires the backend to be running.

- **Category**: development
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: docs, api, openapi, development

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `host` | string | no | `localhost` | Backend host |
| `port` | number | no | `8000` | Backend port |
| `output_path` | string | no | `./docs/api-reference.md` | Output file path for generated docs |

## Script

```bash
#!/bin/bash
set -e
BACKEND_URL="http://{{host}}:{{port}}"
OUTPUT="{{output_path}}"

echo "Fetching OpenAPI schema from $BACKEND_URL/openapi.json..."
curl -sf "$BACKEND_URL/openapi.json" | python3 -c "
import json, sys
spec = json.load(sys.stdin)
print('# ' + spec['info']['title'] + ' v' + spec['info']['version'])
print()
for path, methods in spec.get('paths', {}).items():
    for method, details in methods.items():
        print(f'## {method.upper()} {path}')
        print(details.get('summary', ''))
        print()
        if 'parameters' in details:
            print('**Parameters:**')
            for p in details['parameters']:
                print(f'- \`{p[\"name\"]}\` ({p.get(\"in\",\"query\")}): {p.get(\"description\",\"\")}')
            print()
        print('---')
        print()
" > "\$OUTPUT"

echo "API docs written to \$OUTPUT"
```
