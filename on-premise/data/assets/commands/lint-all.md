# Lint All Projects

> ESLint for on-premise + nube TypeScript, tsc --noEmit for frontend. Reports issues per project.

- **Category**: development
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: lint, eslint, quality, development

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `project_root` | string | yes | — | Root path of the v001 project |

## Script

```bash
#!/bin/bash
echo "Linting all MAL projects..."
echo "==========================="
FAILED=0

echo ""
echo "[1/3] on-premise/ (eslint)"
cd "{{project_root}}/on-premise" && npm run lint 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[2/3] nube/ (eslint)"
cd "{{project_root}}/nube" && npm run lint 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[3/3] front/frontend (tsc --noEmit)"
cd "{{project_root}}/front/frontend" && npx tsc --noEmit 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "==========================="
if [ $FAILED -eq 0 ]; then
  echo "ALL LINT CHECKS PASSED"
else
  echo "$FAILED project(s) had lint issues"
  exit 1
fi
```
