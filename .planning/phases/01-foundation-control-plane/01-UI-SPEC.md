---
phase: 1
slug: foundation-control-plane
status: approved
shadcn_initialized: false
preset: not applicable
created: 2026-05-21
---

# Phase 1 - UI Design Contract

> Visual and interaction contract for frontend Phase 1 control-plane surfaces.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | none |
| Icon library | lucide |
| Font | Space Grotesk (headings), Source Sans 3 (body) |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline value separators |
| sm | 8px | Dense form row spacing |
| md | 16px | Default control spacing |
| lg | 24px | Card internal padding |
| xl | 32px | Section spacing |
| 2xl | 48px | Major panel breaks |
| 3xl | 64px | Page-level top/bottom rhythm |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 13px | 600 | 1.35 |
| Heading | 28px | 700 | 1.2 |
| Display | 40px | 700 | 1.1 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F3F0E8 | App background and workspace canvas |
| Secondary (30%) | #1F3A5F | Navigation rails, section headers, key surface contrast |
| Accent (10%) | #E06C2F | Primary action highlights and active schedule states only |
| Destructive | #C62828 | Delete/disable confirmations and failed run badges |

Accent reserved for: save/apply buttons, active schedule chips, selected provider profile badge

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Save Configuration |
| Empty state heading | No Runs Yet |
| Empty state body | Trigger a daily or weekly run to populate this table. |
| Error state | Run failed. Check error details and retry after fixing provider or schedule settings. |
| Destructive confirmation | Disable Schedule: This stops automated runs until you enable it again. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party | none | required before use |

---

## Screen Contract (Phase 1)

- Information architecture:
  - Top-level tabs: `Provider Config`, `Schedule`, `Manual Runs`, `Run History`.
  - Secondary panel on `Run History`: run details drawer with status, timestamps, error summary.
- Forms:
  - Provider profile form supports multiple saved profiles and one active marker.
  - Activating a profile requires a successful ping result before enabling the `Set Active` action.
- Scheduling:
  - Timezone display is fixed label `Asia/Jakarta` and not editable.
  - Weekday run configuration shows Monday-Friday only.
- Concurrency UX:
  - If run is active, manual trigger button is disabled with helper text: `Run in progress`.
  - Manual trigger API conflict (`409`) maps to inline warning banner, not modal.
- Run status badges (exact values): `queued`, `running`, `succeeded`, `failed`, `skipped_overlap`, `canceled`.

---

## Interaction and Motion

- Page load: section reveal stagger (80ms interval, max 4 sections).
- Status transitions: badge color transition 150ms ease-out.
- No decorative micro-animation on financial values.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-21
