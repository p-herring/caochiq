# CoachIQ round 2 patch bundle

This second patch bundle continues the implementation work and focuses on backend correctness.

Included changes:
- add a reusable Zod validation helper
- add validation to `insights` routes
- refactor `today` to remove per-athlete query fan-out
- start refactoring `athletes` to validate inputs and reduce list-page N+1 load

## Important note

The `athletes.ts` patch is intentionally **partial** and should be merged carefully, because the original file contains many routes. I focused on the highest-impact fixes first rather than pretending the whole backend was safely rewritten in one pass.

## Suggested apply order

```bash
git apply coachiq-backend-round2.patch
```

Then review:
- `apps/api/src/routes/athletes.ts`
- `apps/api/src/routes/today.ts`
- `apps/api/src/routes/insights.ts`

Then run:
```bash
npm run build --workspace=apps/api
```
