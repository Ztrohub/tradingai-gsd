# Phase 1: Foundation & Control Plane - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a Dockerized baseline control plane for operations: one Node.js service exposing UI/API controls for AI provider config and schedules, manual daily/weekly run triggers, and persisted run/job visibility on top of Postgres.

</domain>

<decisions>
## Implementation Decisions

### Control Plane Service Shape
- **D-01:** Use a single Node control-plane service in Phase 1 (API + scheduler + worker in one process).
- **D-02:** Use in-process BullMQ worker with concurrency `1` for weekly/daily jobs.
- **D-03:** Docker Compose runs one `node-control-plane` container for this service.
- **D-04:** Reliability baseline is Docker `restart: unless-stopped` plus BullMQ retry/backoff; no startup catch-up automation in this phase.

### Scheduling & Run Admission
- **D-05:** Canonical schedule timezone is hard-locked to `Asia/Jakarta` in backend logic.
- **D-06:** If a run is active at trigger time, skip the new run and persist `skipped_overlap`.
- **D-07:** Manual trigger while active run exists is rejected with `409 run_in_progress`.
- **D-08:** Weekday daily run days are Monday-Friday only.

### Provider Configuration Model
- **D-09:** Support multiple saved provider profiles with exactly one active profile.
- **D-10:** Model parameters are stored within each provider profile.
- **D-11:** Persist full effective AI configuration snapshot per run for auditability.
- **D-12:** Activating a profile requires strict required-field validation and successful provider ping test.

### Run Logging & Observability Baseline
- **D-13:** Run lifecycle status model is `queued -> running -> succeeded|failed|skipped_overlap|canceled`.
- **D-14:** Phase 1 run records store metadata baseline only: trigger type, schedule type, timestamps, status, error summary, duration.
- **D-15:** Persist structured error details in Postgres (code/message/context) and expose concise form via API/UI.
- **D-16:** Retention policy for this phase is keep all run records (no pruning).

### the agent's Discretion
- No discretionary areas were delegated; all discussed gray areas were explicitly decided.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope, Requirements, and Phase Contract
- `.planning/ROADMAP.md` - Defines Phase 1 goal, mapped requirements, and success criteria.
- `.planning/REQUIREMENTS.md` - Requirement IDs in scope for Phase 1 (PLAT-01..04, ARCH-01..03).
- `.planning/PROJECT.md` - Project-level constraints and locked operational context.

### Architecture and Stack Direction
- `.planning/research/STACK.md` - Selected core libraries/services and integration direction.
- `.planning/research/ARCHITECTURE.md` - Proposed service boundaries and daily flow used as implementation baseline.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application source assets exist yet (`src/`, `app/`, `services/`, and `api/` were absent during scouting).

### Established Patterns
- Planning artifacts establish a Node control-plane + Python AI engine architecture with Postgres as system of record and BullMQ/Redis scheduling semantics.

### Integration Points
- Initial implementation should anchor around Docker Compose services, Node control-plane API/scheduler surface, and Postgres-backed run/config persistence defined by planning documents.

</code_context>

<specifics>
## Specific Ideas

- Keep Phase 1 intentionally simple operationally: single control-plane service and one container.
- Enforce deterministic run admission with overlap skip and explicit manual-trigger rejection during active jobs.
- Preserve auditability early by storing full effective provider config snapshots per run.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation & Control Plane*
*Context gathered: 2026-05-21*
