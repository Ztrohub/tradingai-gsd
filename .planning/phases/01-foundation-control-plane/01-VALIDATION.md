# Phase 1: Foundation & Control Plane - Validation

## Validation Architecture

### Coverage Targets
- PLAT-01: provider profile config + activation gate validated
- PLAT-02: schedule config persisted and consumed by scheduler
- PLAT-03: manual trigger endpoints validated for weekly/daily
- PLAT-04: run logs and status queryability validated
- ARCH-01..03: Node control-plane + Postgres + Docker compose boot path validated

### Nyquist Strategy
- Every implementation task includes an automated check command.
- No watch-mode commands allowed in plan verify blocks.
- End-to-end smoke command included only after unit/integration checks.

### Required Automated Checks
- `npm run lint`
- `npm run test -- --runInBand`
- `npm run test:integration`
- `docker compose config`
- `docker compose up -d && npm run smoke:phase1 && docker compose down`

### Failure Policy
- Blocking test failure keeps phase status non-planned until plan revision.
- Manual verification is non-blocking and only used after automated checks pass.
