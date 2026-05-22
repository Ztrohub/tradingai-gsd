# UI Review - Phase 01 Foundation & Control Plane

Date: 2026-05-22
Audited Against:
- `.planning/phases/01-foundation-control-plane/01-UI-SPEC.md`
- `.planning/phases/01-foundation-control-plane/01-01-SUMMARY.md`
- `.planning/phases/01-foundation-control-plane/01-02-SUMMARY.md`
- Implemented UI in `src/ui/public/*` and `src/ui/styles/tokens.css`

Overall Score: **18/24**

## Scorecard

| Pillar | Score (1-4) | Verdict |
|---|---:|---|
| Copywriting | 3/4 | Good |
| Visuals | 3/4 | Good |
| Color | 4/4 | Pass |
| Typography | 2/4 | Partial |
| Spacing | 3/4 | Good |
| Experience Design | 3/4 | Good |

## 1) Copywriting - 3/4

Findings:
- Primary CTA copy matches contract: `Save Configuration` (`src/ui/public/index.html`).
- Empty state does not follow contract split (heading + body). Current string is merged into one line:
  - Implemented: `No Runs Yet - Trigger a daily or weekly run to populate this table.` (`src/ui/public/app.js`, `renderEmptyHistory`).
  - Contract requires:
    - Heading: `No Runs Yet`
    - Body: `Trigger a daily or weekly run to populate this table.`
- Error state contract text is missing for failed runs. Current details drawer always shows `Error: ...` and fallback `No error`, not the required guidance sentence (`src/ui/public/app.js`, details drawer rendering).
- Destructive confirmation contract line is **not directly auditable** in the current Phase 1 surface:
  - Contract text targets schedule-disable flow.
  - Implemented UI has weekly/daily enable toggles but no explicit "Disable Schedule" confirmation step.
  - Current provider delete confirmation (`Delete profile '<name>'?`) is a separate interaction and should not be scored as a direct contract violation for this copy item.

## 2) Visuals - 3/4

Findings:
- Information architecture matches spec tabs and route grouping (`src/ui/public/index.html` nav and sections).
- Run History includes details drawer structure as required (`#run-details`).
- UI is clean and readable but visually minimal versus the contract intent for stronger section hierarchy:
  - No explicit section header treatment using secondary color surfaces.
  - No display-scale typography usage.

## 3) Color - 4/4

Findings:
- Contract palette is implemented exactly in CSS variables:
  - Dominant `#F3F0E8`, Secondary `#1F3A5F`, Accent `#E06C2F`, Destructive `#C62828` (`src/ui/public/app.css`, `src/ui/styles/tokens.css`).
- Accent usage is focused on actions and active-state-like emphasis via buttons and running status.
- Destructive color used for warnings and failed badges.

## 4) Typography - 2/4

Findings:
- Font family choices match contract intent in CSS declarations:
  - Heading: `Space Grotesk`
  - Body: `Source Sans 3`
- Contracted size/weight/line-height system is not explicitly enforced:
  - Heading 28 / Display 40 are not defined.
  - Label role 13/600/1.35 is not defined globally.
  - Body 16/1.5 not explicitly set.
- Fonts are referenced but not loaded from a source; runtime fallback risk exists (`src/ui/public/index.html` has no font import/preload).

## 5) Spacing - 3/4

Findings:
- Implementation largely follows 4px-based rhythm (4, 8, 12, 16, 24).
- Token file includes only up to `xl` and misses `2xl` and `3xl` from contract (`src/ui/styles/tokens.css`).
- `app.css` uses hard-coded spacing values rather than consistently consuming token variables; this increases drift risk.

## 6) Experience Design - 3/4

Findings:
- Concurrency UX is correctly implemented:
  - Manual trigger disabled during active run.
  - Helper text `Run in progress` shown (`src/ui/public/index.html`, `src/ui/public/app.js`).
  - Trigger conflict (`409`) maps to inline message, not modal (`triggerRun`).
- Required interaction motion contract is missing:
  - No page-load stagger reveal (80ms interval).
  - No 150ms ease-out status badge transition (`.badge` has no transition).

## Top Priority Fixes

1. Enforce exact copy contract for empty state and failed-run guidance text.
2. Implement typography contract as explicit design tokens/styles (sizes, weights, line-heights) and ensure font loading.
3. Add missing motion requirements: staggered section reveal and badge color transition `150ms ease-out`.

## Improvement Backlog (Optional)

- Expand token system to include `2xl` and `3xl` spacing and consume tokens consistently.
- Strengthen section hierarchy with secondary surfaces/headers while preserving the existing palette.

## Verdict

Phase 1 UI is functional and contract-aligned on IA, color palette, and core interaction constraints, but it is **not fully compliant** with the approved UI contract due to copywriting, typography specification enforcement, and motion gaps.


