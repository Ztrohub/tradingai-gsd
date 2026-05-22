---
status: complete
completed_at: 2026-05-22
---

# Summary

Completed edit/delete provider profile feature.

Backend:
- Added `PUT /api/config/provider-profiles/:id`
- Added `DELETE /api/config/provider-profiles/:id`
- Added repository methods: `getProfileById`, `updateProfile`, `deleteProfile`
- Added service logic to preserve existing API key when edit payload leaves `api_key` empty
- Added guard: active profile cannot be deleted (`409 cannot_delete_active_profile`)

Frontend:
- Added edit mode in provider form
- Added per-row `Edit` and `Delete` buttons
- Added cancel edit action and mode indicator
- Added create-only API key validation

Verification:
- `npm run build` passed
- `npm run test` passed
