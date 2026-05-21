# Phase 1: Foundation & Control Plane - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 1-Foundation & Control Plane
**Areas discussed:** Control-plane service split, Schedule execution policy, Provider/config model shape, Run logging and observability baseline

---

## Control-plane service split

| Option | Description | Selected |
|--------|-------------|----------|
| Single Node service now (API + scheduler + queue worker together), split later if needed | Simplest Phase 1 operational model | ? |
| Two Node services now (`web-service` and `worker-service`) in Docker Compose | Early separation at cost of complexity | |
| Hybrid: one codebase, two process entrypoints/containers from day one | Transitional split model | |

**User's choice:** Single Node service now
**Notes:** User further selected in-process BullMQ worker with concurrency 1, one control-plane container, and baseline resilience via Docker restart + BullMQ retries only.

---

## Schedule execution policy

| Option | Description | Selected |
|--------|-------------|----------|
| Hard-lock to `Asia/Jakarta` in backend | Deterministic schedule semantics | ? |
| Configurable timezone defaulting to `Asia/Jakarta` | Flexible but adds config surface | |
| Use container/system timezone | Deployment-sensitive semantics | |

**User's choice:** Hard-lock `Asia/Jakarta`
**Notes:** User selected overlap policy = skip with `skipped_overlap`, manual triggers rejected with `409 run_in_progress`, weekday cadence Monday-Friday.

---

## Provider/config model shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single active provider profile system-wide | Lowest model complexity | |
| Multiple saved profiles, one active | Flexible with clear active state | ? |
| Multiple profiles with per-job provider selection | Highest flexibility and complexity | |

**User's choice:** Multiple saved profiles, one active
**Notes:** Model params stored per profile; each run snapshots full effective config; activating profile requires strict validation + provider ping success.

---

## Run logging and observability baseline

| Option | Description | Selected |
|--------|-------------|----------|
| `queued -> running -> succeeded|failed|skipped_overlap|canceled` | Explicit lifecycle coverage | ? |
| Minimal lifecycle | Lower visibility | |
| Extended step-level statuses from day one | Richer but heavier for Phase 1 | |

**User's choice:** Full baseline lifecycle above
**Notes:** Run record payload is metadata-focused in Phase 1; structured errors are persisted in Postgres and exposed concisely via API; retention = keep all run records.

## the agent's Discretion

None.

## Deferred Ideas

None.
