# Summary

## Outcome

Dev boot behavior, weekly debate call, and decision persistence are now connected end-to-end, with ai-engine provider credentials sourced from database active profile instead of env keys.

## Changes

- Removed ai-engine provider/key placeholders from `.env.example`.
- ai-engine now reads provider/model/api_key/api_base/temperature/max_tokens from active row in `provider_profiles` via Postgres.
- `npm run dev` now auto-starts `ai-engine` via Docker before running Node control plane.
- Added ai-engine client and wired weekly pipeline to call `/v1/watchlist/debate`.
- Added decision persistence table and repository upsert for debate outputs.

## Verification

- `npm run build`
- `npm run test`
