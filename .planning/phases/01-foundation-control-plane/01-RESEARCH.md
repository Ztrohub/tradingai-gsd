# Phase 1: Foundation & Control Plane - Research

**Date:** 2026-05-21
**Status:** Complete

## Objective
Define implementation-ready technical direction for a Dockerized Node control plane that satisfies PLAT-01..04 and ARCH-01..03, while honoring locked decisions in `01-CONTEXT.md` and UI contract in `01-UI-SPEC.md`.

## Inputs Reviewed
- `.planning/phases/01-foundation-control-plane/01-CONTEXT.md`
- `.planning/phases/01-foundation-control-plane/01-UI-SPEC.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/research/STACK.md`
- `.planning/research/ARCHITECTURE.md`

## Standard Stack (Phase 1)
- Runtime: Node.js service (single process) in Docker
- API: Node HTTP server framework (Fastify or Express; planner may choose based on repo bootstrap simplicity)
- Scheduling: `node-cron` for Sunday + weekday triggers
- Queue/worker: BullMQ with Redis, in-process worker concurrency `1`
- Database: Postgres as system-of-record
- Schema access: Prisma or equivalent typed query layer

## Architectural Responsibility Map
| Capability | Tier | Notes |
|---|---|---|
| Provider profile CRUD + activation validation | Node control-plane API | Activation includes strict field validation and provider ping gate |
| Schedule config and trigger admission policy | Node control-plane API + scheduler module | Timezone fixed to `Asia/Jakarta` |
| Job queue execution and overlap prevention | In-process BullMQ worker | Overlap policy `skipped_overlap` |
| Run/event persistence and query APIs | Postgres + API repository layer | Store lifecycle/status/error metadata |
| Operator interface rendering | Node UI layer | Must follow `01-UI-SPEC.md` tokens and copy contract |

## Locked Decisions Applied
- Single control-plane service and one container for Phase 1.
- In-process BullMQ worker with concurrency 1.
- Timezone hard lock: `Asia/Jakarta`.
- Active-run conflicts: scheduled run skipped; manual run rejected (409).
- Provider model: many profiles, exactly one active; full run-time config snapshot persisted.
- Run lifecycle statuses: `queued|running|succeeded|failed|skipped_overlap|canceled`.

## Data Model Baseline (Phase 1)
- `provider_profiles` (saved configs, activation metadata)
- `schedule_configs` (weekly/daily schedule settings, enabled flags)
- `job_runs` (trigger/source/schedule type, status, timing, duration)
- `job_run_errors` (structured code/message/context)
- `job_events` (optional event stream rows for future observability)

## API Surface Baseline (Phase 1)
- `GET/PUT /api/config/provider-profiles`
- `POST /api/config/provider-profiles/{id}/activate`
- `GET/PUT /api/config/schedule`
- `POST /api/runs/weekly/trigger`
- `POST /api/runs/daily/trigger`
- `GET /api/runs`
- `GET /api/runs/{id}`

## Common Pitfalls and Guards
- Cron drift from host timezone mismatch: force scheduler timezone parameter to `Asia/Jakarta`.
- Duplicate run races: enforce worker-level lock + active-run check before enqueue.
- Missing auditability: persist effective provider config snapshot at run creation time.
- Noisy failures: standardize error code taxonomy for concise UI messages.

## Validation Architecture
- Unit tests: schedule admission policy, overlap handling, active-profile validation, status transitions.
- Integration tests: manual trigger endpoint to queue/run persistence path.
- Contract tests: provider activation returns 4xx on invalid config and 2xx only after ping success.
- Smoke check: Docker Compose up, API health endpoint, and one manual run path.

## Open Questions (RESOLVED)
1. **Cron source timezone** - RESOLVED: backend lock to `Asia/Jakarta`, non-configurable in Phase 1.
2. **Overlap policy** - RESOLVED: skip scheduled overlap and emit `skipped_overlap` record.
3. **Manual trigger on active run** - RESOLVED: reject with HTTP `409 run_in_progress`.
4. **Retention policy** - RESOLVED: keep all run records in Phase 1.

## Output for Planner
Plan should split into two waves:
1. Backend foundation (schema + APIs + scheduler/queue + run lifecycle persistence)
2. Operator UI surfaces and API integration on top of wave 1 contracts
