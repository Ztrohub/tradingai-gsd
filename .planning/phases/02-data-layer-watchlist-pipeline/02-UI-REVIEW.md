---
phase: 02
slug: data-layer-watchlist-pipeline
status: complete
overall_score: 19
max_score: 24
created: 2026-05-24T07:46:39.3157635Z
---

# Phase 02 - UI Review

## Scorecard

| Pillar | Score | Notes |
|--------|-------|-------|
| Copywriting | 3/4 | Operational copy is clear and action-oriented; a few messages are generic and not consistently actionable. |
| Visuals | 3/4 | Information architecture is functional and dense; component hierarchy is readable but lacks emphasis hierarchy in some heavy panels. |
| Color | 3/4 | Palette follows contract tokens well; destructive and accent roles are mostly correct, but button role separation could be stronger. |
| Typography | 4/4 | Contract fonts are used (`Space Grotesk`, `Source Sans 3`) with consistent weights and readable sizing. |
| Spacing | 3/4 | 8/16/24 rhythm is broadly consistent; some dense data blocks and compact controls reduce scan comfort. |
| Experience Design | 3/4 | Primary operational flows are complete (CRUD/sync/run); feedback loops work but some errors remain coarse. |

**Overall:** 19/24

## Findings by Pillar

### 1. Copywriting
- Strengths:
  - Core CTA labels match intent (`Sync LQ45 Universe`, `Run Weekly Selection`).
  - Empty/history states are present and understandable.
- Gaps:
  - Several failure toasts are generic (`Failed to ...`) without remediation hints.
  - Some success/error copy mixes system wording and user wording inconsistently.

### 2. Visuals
- Strengths:
  - Tabbed control plane with scoped panels is clear and predictable.
  - Universe/watchlist split and details accordions support operator workflows.
- Gaps:
  - Watchlist detail density makes rapid scanning harder during operations.
  - Action buttons inside list rows have equal visual weight regardless of risk.

### 3. Color
- Strengths:
  - Dominant/secondary/accent/destructive tokens are implemented via CSS variables.
  - Status badge colors provide quick run-state recognition.
- Gaps:
  - Non-tab action buttons default to accent, causing insufficient distinction between normal and destructive row actions.

### 4. Typography
- Strengths:
  - Heading/body font pairing follows UI-SPEC.
  - Weight contrast supports section readability.
- Gaps:
  - Minor: high-density numeric grids could benefit from slightly increased line-height for long sessions.

### 5. Spacing
- Strengths:
  - Global panel spacing and tab spacing are consistent.
  - Mobile breakpoints adapt major layouts.
- Gaps:
  - Dense watchlist metric grid and row action clusters can feel cramped on small screens.

### 6. Experience Design
- Strengths:
  - End-to-end operator flows are implemented: view, CRUD, sync, run, override guard.
  - Long-running weekly action has queued/running/completion feedback.
- Gaps:
  - Error handling mostly maps to broad failures; recovery guidance is limited.
  - No inline validation hints before submit on some forms (relies on backend response path).

## Top Fixes (Priority)

1. Introduce role-specific button variants (primary/secondary/destructive) instead of universal accent for non-tab buttons.
2. Improve error copy with direct remediation text (example: invalid symbol format, duplicate symbol, override disabled steps).
3. Reduce watchlist detail density: progressive disclosure defaults and clearer grouping for metric categories.

## Recommended Follow-Up Tasks

- Add button semantic classes in `src/ui/public/app.css` and apply per action risk in `src/ui/public/app.js`.
- Normalize flash/error messaging into a shared mapper with actionable phrasing.
- Rework watchlist details presentation for compact summary + optional expanded analytics section.

## Audit Metadata

- Baseline spec: `.planning/phases/02-data-layer-watchlist-pipeline/02-UI-SPEC.md`
- Audited files:
  - `src/ui/public/app.js`
  - `src/ui/public/app.css`
  - `.planning/phases/02-data-layer-watchlist-pipeline/02-01-SUMMARY.md`
  - `.planning/phases/02-data-layer-watchlist-pipeline/02-02-SUMMARY.md`
