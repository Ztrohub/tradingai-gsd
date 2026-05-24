---
phase: 02
slug: data-layer-watchlist-pipeline
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-24T07:44:59.9571941Z
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | [package.json scripts] |
| **Quick run command** | 
pm run test -- --runInBand watchlist-ui |
| **Full suite command** | 
pm run test |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run 
pm run test -- --runInBand watchlist-ui
- **After every plan wave:** Run 
pm run test
- **Before $gsd-verify-work:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-01 | T-02-04/T-02-05 | Universe snapshot persistence + validated symbols + fallback behavior | unit/integration | 
pm run test -- tests/data/universe.service.test.ts | ? | ? green |
| 02-01-02 | 01 | 1 | DATA-02 | T-02-04 | Deterministic weekly watchlist scoring/selection with persistence | unit | 
pm run test -- tests/data/watchlist.service.test.ts | ? | ? green |
| 02-01-03 | 01 | 1 | DATA-03 | T-02-05 | Daily market+indicator ingest with provider fallback and failure isolation | integration | 
pm run test -- tests/data/pipeline.integration.test.ts | ? | ? green |
| 02-01-04 | 01 | 1 | DATA-04 | T-02-05 | Daily sentiment ingest and symbol-linked persistence/error capture | integration | 
pm run test -- tests/data/pipeline.integration.test.ts | ? | ? green |
| 02-02-01 | 02 | 2 | DATA-01 | T-02-04 | Universe CRUD + sync validates ticker shape and conflict paths | integration | 
pm run test -- tests/data/universe-crud.integration.test.ts | ? | ? green |
| 02-02-02 | 02 | 2 | DATA-02 | T-02-04 | Watchlist override guard + CRUD only when manual override enabled | integration | 
pm run test -- tests/data/watchlist-crud.integration.test.ts | ? | ? green |
| 02-02-03 | 02 | 2 | DATA-02 | T-02-01/T-02-03 | Weekly action endpoint triggers run with conflict handling | integration | 
pm run test | ? | ? green |
| 02-02-04 | 02 | 2 | DATA-01, DATA-02 | T-02-04 | Universe & Watchlist UI flows and action wiring are user-operable | UI | 
pm run test -- tests/ui/watchlist-ui.test.ts | ? | ? green |

*Status: ? pending · ? green · ? red · ?? flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Audit 2026-05-24

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have <automated> verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] 
yquist_compliant: true set in frontmatter

**Approval:** approved 2026-05-24
