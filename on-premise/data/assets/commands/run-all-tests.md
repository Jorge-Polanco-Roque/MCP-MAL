# Run All Tests

> Run vitest (on-premise + nube) + pytest (front/backend) + tsc --noEmit (front/frontend). Reports total pass/fail counts.

- **Category**: devops
- **Shell**: bash
- **Requires Confirmation**: no
- **Author**: MAL Team
- **Tags**: test, vitest, pytest, devops

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `project_root` | string | yes | — | Root path of the v001 project |

## Script

```bash
#!/bin/bash
echo "Running all tests across the MAL platform..."
echo "============================================="
FAILED=0

echo ""
echo "[1/4] on-premise/ (vitest)"
cd "{{project_root}}/on-premise" && npm test 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[2/4] nube/ (vitest)"
cd "{{project_root}}/nube" && npm test 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[3/4] front/backend (pytest)"
cd "{{project_root}}/front/backend" && python -m pytest tests/ -v 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "[4/4] front/frontend (tsc --noEmit)"
cd "{{project_root}}/front/frontend" && npx tsc --noEmit 2>&1 || FAILED=$((FAILED + 1))

echo ""
echo "============================================="
if [ $FAILED -eq 0 ]; then
  echo "ALL TESTS PASSED"
else
  echo "FAILURES: $FAILED suite(s) failed"
  exit 1
fi
```
