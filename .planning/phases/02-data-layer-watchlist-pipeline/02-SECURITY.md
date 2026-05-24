---
phase: 02
slug: data-layer-watchlist-pipeline
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-24T07:43:01.0137148Z
---

# Phase 02 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| UI -> API | Browser UI calls internal Express API endpoints | Operator commands, symbol/config payloads |
| API -> Postgres | Express services persist/retrieve universe/watchlist/run data | Trading universe, watchlist config, run metadata |
| API -> External Providers | Data services fetch market/news data from providers | Market/news inputs, provider responses |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Spoofing | API mutation endpoints | accept | No authn/authz guard implemented in phase scope; accepted for local paper-trading env | closed |
| T-02-02 | Repudiation | Operator-triggered mutations/runs | accept | Actor identity not bound in audit trail; accepted until auth/user model exists | closed |
| T-02-03 | Denial of Service | Manual trigger/sync endpoints | accept | No rate limiting/throttling in phase scope; accepted for low-volume local usage | closed |
| T-02-04 | Tampering | Input payloads | mitigate | Zod validation + override guard + conflict responses in routes | closed |
| T-02-05 | Injection | DB persistence | mitigate | Parameterized SQL queries in repositories | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-01 | v1 runs in trusted local environment without multi-user access; auth layer deferred | user | 2026-05-24 |
| AR-02-02 | T-02-02 | no identity subsystem yet; audit actor attribution deferred to later phase | user | 2026-05-24 |
| AR-02-03 | T-02-03 | manual operations are low-frequency; rate-limit deferred pending deployment exposure | user | 2026-05-24 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-24 | 5 | 5 | 0 | codex (gsd-secure-phase) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] 	hreats_open: 0 confirmed
- [x] status: verified set in frontmatter

**Approval:** verified 2026-05-24
