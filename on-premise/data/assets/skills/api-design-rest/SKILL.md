# REST API Design

## Overview
Standards for designing REST APIs used in the MAL platform. Covers naming, methods, pagination, errors, and versioning.

## Resource Naming
- Use nouns, not verbs: `/api/skills` not `/api/getSkills`
- Plural for collections: `/api/sprints`, `/api/work-items`
- Nested for relationships: `/api/sprints/:id/work-items`
- Kebab-case for multi-word: `/api/work-items`

## HTTP Methods
| Method | Action | Idempotent | Example |
|--------|--------|------------|---------|
| GET | Read | Yes | `GET /api/skills` |
| POST | Create | No | `POST /api/skills` |
| PUT | Replace | Yes | `PUT /api/skills/:id` |
| PATCH | Partial update | Yes | `PATCH /api/skills/:id` |
| DELETE | Remove | Yes | `DELETE /api/skills/:id` |

## Pagination
```json
{
  "items": [...],
  "total": 42,
  "count": 20,
  "offset": 0,
  "has_more": true,
  "next_offset": 20
}
```

## Error Responses
```json
{
  "error": "not_found",
  "message": "Skill 'xyz' not found",
  "suggestion": "Use GET /api/skills to list available skills"
}
```

## Filtering
Query parameters: `GET /api/work-items?status=in_progress&assignee=jorge&sprint_id=sprint-7`

## Best Practices
- Return 201 + Location header on POST success
- Return 204 on DELETE success
- Use ETags for caching
- Rate limit by API key (not just IP)
- Document with OpenAPI 3.x
