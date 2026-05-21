# Rootcause Cache

One JSON file per bug, written before the fix is applied. Use this to spot recurring failure patterns.

## Format

```json
{
  "id": "short-kebab-slug",
  "date": "YYYY-MM-DD",
  "ticket": "CMS-XXX",
  "symptom": "What went wrong from the user/test perspective",
  "rootcause": "Why it happened — the actual technical reason",
  "fix": "What was changed to resolve it",
  "recurrence_risk": "low | medium | high",
  "automation_gap": "Optional — if this bug cannot be caught by CI or hooks, explain why here",
  "tags": ["minio", "redis", "auth", "prisma", ...]
}
```

## Example

```json
{
  "id": "minio-403-credentials-mismatch",
  "date": "2026-05-21",
  "ticket": "CMS-007",
  "symptom": "Media upload returns 403 Forbidden from MinIO",
  "rootcause": "OBJECT_STORAGE_ACCESS_KEY in .env did not match the minioadmin default user in docker-compose",
  "fix": "Updated OBJECT_STORAGE_ACCESS_KEY=minioadmin and OBJECT_STORAGE_SECRET_KEY=minioadmin in .env.local",
  "recurrence_risk": "medium",
  "tags": ["minio", "env", "credentials"]
}
```

## Naming

`<slug>.json` — keep the slug short and descriptive. No ticket prefix needed since the `ticket` field is inside.
