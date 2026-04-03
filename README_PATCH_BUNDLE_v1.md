# CoachIQ implementation patch bundle

This bundle contains an implementation-ready patch for the highest-impact fixes from the audit:

- remove unsafe README examples with real-looking secrets
- remove Vercel catch-all rewrite
- stop suppressing Next.js build errors
- align shared types with nullable unassigned athletes
- fix frontend Strava API methods to pass `athlete_id`
- add CSS token aliases and focus-visible improvements
- replace a raw anchor in Messages with `Link`

## Important limitation

I was **not able to write directly to your GitHub repo** from here because the GitHub connector allowed read access but rejected branch creation / write operations.

## Files included

- `coachiq-critical-fixes.patch`

## Recommended next steps

1. Apply the patch locally:
   ```bash
   git apply coachiq-critical-fixes.patch
   ```
2. Review the resulting changes.
3. Run:
   ```bash
   npm install
   npm run build
   ```
4. Fix any compile drift from files not included in this first pass.
5. Commit and push.

## What is still not fully implemented in this bundle

I have **not** fully implemented the larger refactors yet, including:
- route-by-route Zod validation
- N+1 query elimination
- transactional mutations
- planner block editor UI
- real-time messaging
- insights generation engine
- full athlete-side experience

Those are larger changes and should be done as a second structured pass.
